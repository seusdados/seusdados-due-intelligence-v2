/**
 * CORS Configuration Module
 * Centralizes all CORS-related settings and validation logic
 */

// ========== ALLOWED ORIGINS ==========

/**
 * Base allowed origins
 * These are the default origins that are always allowed
 */
const BASE_ALLOWED_ORIGINS = [
  "http://localhost:3000",      // Local development
  "http://localhost:5173",      // Vite dev server
  "https://seusdados-due-diligence.manus.space", // Production domain (manus.space)
  "https://hub.seusdados.com/",  // Production domain (custom)
];

/**
 * Get all allowed origins including dynamic ones from environment
 */
export function getAllowedOrigins(): string[] {
  const origins = [...BASE_ALLOWED_ORIGINS];
  
  // Add dynamic origins from environment variable
  if (process.env.ALLOWED_ORIGINS) {
    const envOrigins = process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim());
    origins.push(...envOrigins);
  }
  
  // Add frontend URL if specified (strip trailing slash — browser sends Origin without it)
  if (process.env.FRONTEND_URL) {
    const frontendUrl = process.env.FRONTEND_URL.replace(/\/$/, "");
    origins.push(frontendUrl);
  }
  
  // Add public app URL if specified
  if (process.env.PUBLIC_APP_URL) {
    const publicUrl = process.env.PUBLIC_APP_URL.replace(/\/$/, "");
    origins.push(publicUrl);
  }
  
  return origins;
}

/**
 * Check if an origin is allowed
 * @param origin - The origin to check (from request header)
 * @returns true if origin is allowed, false otherwise
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  // Allow requests with no origin (mobile apps, curl, etc.)
  if (!origin) return true;
  
  const allowedOrigins = getAllowedOrigins();
  
  // Check if origin matches allowed list
  const isAllowed = allowedOrigins.some(allowed => {
    if (allowed.includes("*")) {
      // Support wildcard patterns (e.g., "*.example.com")
      const pattern = new RegExp(allowed.replace(/\*/g, ".*"));
      return pattern.test(origin);
    }
    return allowed === origin;
  });
  
  if (isAllowed) {
    return true;
  }
  
  // Also allow Manus platform domains
  if (origin.endsWith(".manus.computer") || origin.endsWith(".manus.space")) {
    return true;
  }
  
  return false;
}

/**
 * Get CORS configuration object for Express
 */
export function getCorsConfig() {
  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // CRITICAL: Never throw error in CORS callback
      // Always return true or false, never call callback with error
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        // Return false to let Express handle it with 403
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Accept-Language",
    ],
    exposedHeaders: [
      "Content-Type",
      "X-Total-Count",
      "X-Page-Count",
    ],
    optionsSuccessStatus: 200,
    maxAge: 86400, // 24 hours
  };
}

/**
 * Middleware to handle CORS rejection with proper 403 response
 */
export function corsRejectionHandler(
  req: any,
  res: any,
  next: any
) {
  // Only check for non-OPTIONS requests
  if (req.method !== "OPTIONS" && !res.getHeader("Access-Control-Allow-Origin")) {
    const origin = req.get("origin");
    if (origin && !isOriginAllowed(origin)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Origin not allowed",
          status: 403,
        },
      });
    }
  }
  next();
}

/**
 * Log allowed origins for debugging
 */
export function logAllowedOrigins() {
  const origins = getAllowedOrigins();
  console.log("[CORS] Allowed origins:", origins);
}
