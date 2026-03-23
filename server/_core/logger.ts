/**
 * Seusdados Due Diligence - Secure Logger
 * Logger seguro que sanitiza dados sensíveis em produção
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Patterns to detect sensitive data
const SENSITIVE_PATTERNS = [
  /password/i,
  /senha/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /authorization/i,
  /bearer/i,
  /credit[_-]?card/i,
  /cartao/i,
  /cpf/i,
  /cnpj/i,
  /ssn/i,
  /cookie/i,
  /session/i,
];

// Regex patterns for data masking
const MASK_PATTERNS: [RegExp, string][] = [
  // CPF: 000.000.000-00
  [/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '***.***.***-**'],
  // CNPJ: 00.000.000/0000-00
  [/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, '**.***.***\/****-**'],
  // Email
  [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***.***'],
  // Credit card
  [/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, '****-****-****-****'],
  // JWT tokens
  [/eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, '[JWT_TOKEN]'],
  // Bearer tokens
  [/Bearer\s+[a-zA-Z0-9_-]+/gi, 'Bearer [REDACTED]'],
];

/**
 * Sanitizes a value by masking sensitive data
 */
function sanitizeValue(value: any, key?: string): any {
  if (value === null || value === undefined) return value;

  // Check if key indicates sensitive data
  if (key && SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
    return '[REDACTED]';
  }

  if (typeof value === 'string') {
    let sanitized = value;
    for (const [pattern, replacement] of MASK_PATTERNS) {
      sanitized = sanitized.replace(pattern, replacement);
    }
    return sanitized;
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      sanitized[k] = sanitizeValue(v, k);
    }
    return sanitized;
  }

  return value;
}

/**
 * Formats log message with timestamp and level
 */
function formatMessage(level: LogLevel, message: string, data?: any): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (data) {
    const sanitizedData = process.env.NODE_ENV === 'production' 
      ? sanitizeValue(data) 
      : data;
    return `${prefix} ${message} ${JSON.stringify(sanitizedData)}`;
  }
  
  return `${prefix} ${message}`;
}

/**
 * Secure logger instance
 */
export const logger = {
  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('debug', message, data));
    }
  },

  info(message: string, data?: any): void {
    console.info(formatMessage('info', message, data));
  },

  warn(message: string, data?: any): void {
    console.warn(formatMessage('warn', message, data));
  },

  error(message: string, error?: Error | any, data?: any): void {
    const errorInfo = error instanceof Error 
      ? { 
          name: error.name, 
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      : error;
    
    console.error(formatMessage('error', message, { error: errorInfo, ...data }));
  },

  /**
   * Log authentication event
   */
  auth(event: string, userId?: string, success: boolean = true): void {
    this.info('Auth Event', {
      event,
      userId: userId ? `${userId.substring(0, 8)}...` : undefined,
      success,
    });
  },
};

export default logger;
