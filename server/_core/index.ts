console.log(`[boot] Process starting (pid=${process.pid}, node=${process.version}, PORT=${process.env.PORT}, NODE_ENV=${process.env.NODE_ENV})`);
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
// OAuth disabled – import kept for stub
import { registerOAuthRoutes } from "./oauth";
import { registerDpaApprovalPublicRoutes } from "../dpaApprovalPublicRoutes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, serveStaticAssets, setupVite } from "./vite";
import multer from "multer";
import { storagePut } from "../storage";
import { startSLAScheduler } from "../slaScheduler";
import { initializeActionPlanCronJob } from "../actionPlanCronJob";
import { startDeadlineNotificationService } from "../deadlineNotificationService";
import { initializeReviewCron } from "../reviewCronJob";
import { initializeCppdOverdueJob } from "../services/cppdOverdueJob";
import { processResendWebhook, ResendWebhookEvent } from "../resendWebhook";

// Security imports
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

// ========== SECURITY CONFIGURATION ==========

// Helmet - HTTP Security Headers
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "wss:"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// Rate Limiting - General
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: { error: "Muitas requisições. Tente novamente em alguns minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiting - Auth endpoints (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  message: { error: "Muitas tentativas de login. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiting - Upload endpoints
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: { error: "Limite de uploads atingido. Tente novamente em 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS Configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://seusdados-due-diligence.manus.space",
  "https://hub.seusdados.com/",
  "https://due-intelligence-2zorf.ondigitalocean.app",
  "https://sea-turtle-app-l53fc.ondigitalocean.app",
];

// Add dynamic origins from environment
if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(","));
}

// Add FRONTEND_URL from environment if set
if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Allow all *.ondigitalocean.app subdomains dynamically
const isDigitalOceanApp = (origin: string) => origin.endsWith(".ondigitalocean.app");

const corsConfig = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed or matches pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes("*")) {
        const pattern = new RegExp(allowed.replace("*", ".*"));
        return pattern.test(origin);
      }
      return allowed === origin;
    });
    
    // CRITICAL FIX: Never throw error in CORS callback
    // Return false instead to let middleware handle 403
    if (isAllowed || origin.endsWith(".manus.computer") || origin.endsWith(".manus.space") || isDigitalOceanApp(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200,
});

// ========== FILE VALIDATION ==========

// Magic bytes for allowed file types
const MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg": [[0xFF, 0xD8, 0xFF]],
  "image/png": [[0x89, 0x50, 0x4E, 0x47]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "image/svg+xml": [[0x3C, 0x3F, 0x78, 0x6D, 0x6C], [0x3C, 0x73, 0x76, 0x67]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return true; // Allow if no signature defined
  
  return signatures.some(signature => {
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) return false;
    }
    return true;
  });
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .substring(0, 100);
}

// ========== SERVER SETUP ==========

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // ========== EARLY HEALTH CHECK (before all middleware) ==========
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ========== SECURITY MIDDLEWARES ==========
  
  // Trust proxy for rate limiting behind reverse proxy
  app.set("trust proxy", 1);
  
  // Helmet - Security headers
  app.use(helmetConfig);
  
  // Serve static files BEFORE CORS checks (same-origin assets don't need CORS)
  if (process.env.NODE_ENV !== "development") {
    serveStaticAssets(app);
  }
  
  // CORS
  app.use(corsConfig);
  
  // CORS rejection handler - Return 403 with JSON message
  app.use((req, res, next) => {
    if (req.method !== 'OPTIONS' && !res.getHeader('Access-Control-Allow-Origin')) {
      const origin = req.get('origin');
      if (origin) {
        // Check if origin is allowed
        const isAllowed = allowedOrigins.some(allowed => {
          if (allowed.includes("*")) {
            const pattern = new RegExp(allowed.replace("*", ".*"));
            return pattern.test(origin);
          }
          return allowed === origin;
        });
        
        if (!isAllowed && !origin.endsWith(".manus.computer") && !origin.endsWith(".manus.space") && !isDigitalOceanApp(origin)) {
          return res.status(403).json({
            error: {
              code: 'FORBIDDEN',
              message: 'Origin not allowed',
              status: 403,
            },
          });
        }
      }
    }
    next();
  });
  
  // General rate limiting (skip in development)
  if (process.env.NODE_ENV === 'production') {
    app.use(generalLimiter);
  }
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // ========== ROUTES ==========
  
  // Auth rate limiting
  app.use("/api/oauth", authLimiter);
  app.use("/api/auth", authLimiter);
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // DPA Approval public routes
  registerDpaApprovalPublicRoutes(app);
  
  // Webhook do Resend para notificações de e-mail
  app.post('/api/webhooks/resend', async (req: any, res: any) => {
    try {
      const event = req.body as ResendWebhookEvent;
      
      if (!event || !event.type || !event.data) {
        return res.status(400).json({ error: 'Evento inválido' });
      }
      
      const result = await processResendWebhook(event);
      
      if (result.success) {
        res.status(200).json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error: any) {
      console.error('[Resend Webhook] Erro:', error);
      res.status(500).json({ error: error.message || 'Erro ao processar webhook' });
    }
  });
  
  // Logo upload route with validation
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
      const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Tipo de arquivo não permitido. Use: JPG, PNG, GIF, WebP ou SVG"));
      }
    }
  });
  
  app.post('/api/upload/logo', uploadLimiter, upload.single('file'), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }
      
      const file = req.file;
      
      // Validate magic bytes
      if (!validateMagicBytes(file.buffer, file.mimetype)) {
        return res.status(400).json({ error: 'Arquivo inválido. O conteúdo não corresponde ao tipo declarado.' });
      }
      
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const sanitizedName = sanitizeFileName(file.originalname);
      const extension = sanitizedName.split('.').pop() || 'png';
      const fileName = `logos/org-logo-${timestamp}-${randomSuffix}.${extension}`;
      
      const { url } = await storagePut(fileName, file.buffer, file.mimetype);
      
      res.json({ url, fileName });
    } catch (error: any) {
      console.error('Erro no upload de logo:', error);
      res.status(500).json({ error: error.message || 'Erro ao fazer upload' });
    }
  });
    // tRPC middleware
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ path, error }) => {
        if (error.code === 'UNAUTHORIZED') {
          console.warn(`[tRPC] ${path}: ${error.message}`);
          return;
        }
        console.error(`[tRPC Error] ${path}:`, error);
      },
    })
  );

  // Global error handler middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Global Error Handler]', err);
    
    // Ensure we always return JSON
    if (res.headersSent) {
      return next(err);
    }
    
    const statusCode = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    res.status(statusCode).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: message,
        status: statusCode,
      },
    });
  });// development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  
  // In production, use PORT directly without probing (avoids creating temp servers)
  const port = process.env.NODE_ENV === "production"
    ? preferredPort
    : await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  console.log(`[startup] Binding server to 0.0.0.0:${port} (NODE_ENV=${process.env.NODE_ENV || 'not set'})...`);

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/ (PORT=${process.env.PORT || 'not set'})`);
    console.log(`[startup] Health check available at http://0.0.0.0:${port}/api/health`);
    
    // Iniciar schedulers em produção (erros não devem derrubar o servidor)
    if (process.env.NODE_ENV === 'production') {
      try {
        startSLAScheduler();
        console.log('SLA Scheduler iniciado');
      } catch (e: any) { console.error('Falha ao iniciar SLA Scheduler:', e.message); }
      
      try {
        initializeActionPlanCronJob();
        console.log('Action Plan Cron Job iniciado');
      } catch (e: any) { console.error('Falha ao iniciar Action Plan Cron:', e.message); }
      
      try {
        startDeadlineNotificationService();
        console.log('Deadline Notification Service iniciado');
      } catch (e: any) { console.error('Falha ao iniciar Deadline Notification:', e.message); }

      try {
        initializeReviewCron();
        console.log('Review Cron Job verificado');
      } catch (e: any) { console.error('Falha ao iniciar Review Cron:', e.message); }

      try {
        initializeCppdOverdueJob();
        console.log('CPPD Overdue Job iniciado');
      } catch (e: any) { console.error('Falha ao iniciar CPPD Overdue Job:', e.message); }
    }
  });
}

startServer().catch((err) => {
  console.error('FATAL: Server failed to start:', err);
  process.exit(1);
});
