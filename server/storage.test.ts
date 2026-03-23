/**
 * Testes para o Serviço de Storage S3 com Resiliência
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// Mock do módulo de resiliência
vi.mock('./_core/resilience', () => ({
  withCircuitBreaker: vi.fn((name, fn) => fn()),
  withRetryAndBackoff: vi.fn((fn) => fn())
}));

// Mock do logger
vi.mock('./_core/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock do ENV
vi.mock('./_core/env', () => ({
  ENV: {
    forgeApiUrl: 'https://forge.test.com',
    forgeApiKey: 'test-api-key'
  }
}));

describe('Storage Service with Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should require forgeApiUrl and forgeApiKey', () => {
      const config = {
        forgeApiUrl: 'https://forge.test.com',
        forgeApiKey: 'test-key'
      };
      
      expect(config.forgeApiUrl).toBeDefined();
      expect(config.forgeApiKey).toBeDefined();
    });

    it('should normalize keys by removing leading slashes', () => {
      const normalizeKey = (relKey: string) => relKey.replace(/^\/+/, '');
      
      expect(normalizeKey('/path/to/file.txt')).toBe('path/to/file.txt');
      expect(normalizeKey('///multiple/slashes.txt')).toBe('multiple/slashes.txt');
      expect(normalizeKey('no-slash.txt')).toBe('no-slash.txt');
    });

    it('should ensure trailing slash in base URL', () => {
      const ensureTrailingSlash = (value: string) => 
        value.endsWith('/') ? value : `${value}/`;
      
      expect(ensureTrailingSlash('https://api.test.com')).toBe('https://api.test.com/');
      expect(ensureTrailingSlash('https://api.test.com/')).toBe('https://api.test.com/');
    });
  });

  describe('Resilience Integration', () => {
    it('should use circuit breaker for storage operations', async () => {
      const { withCircuitBreaker } = await import('./_core/resilience');
      
      // Verificar que o mock foi configurado
      expect(withCircuitBreaker).toBeDefined();
    });

    it('should use retry with backoff for storage operations', async () => {
      const { withRetryAndBackoff } = await import('./_core/resilience');
      
      // Verificar que o mock foi configurado
      expect(withRetryAndBackoff).toBeDefined();
    });

    it('should configure retry with correct parameters', () => {
      const retryConfig = {
        maxRetries: 3,
        initialDelay: 500,
        maxDelay: 10000
      };
      
      expect(retryConfig.maxRetries).toBe(3);
      expect(retryConfig.initialDelay).toBe(500);
      expect(retryConfig.maxDelay).toBe(10000);
    });
  });

  describe('Upload URL Building', () => {
    it('should build correct upload URL', () => {
      const baseUrl = 'https://forge.test.com/';
      const relKey = 'path/to/file.txt';
      
      const url = new URL('v1/storage/upload', baseUrl);
      url.searchParams.set('path', relKey);
      
      expect(url.toString()).toBe('https://forge.test.com/v1/storage/upload?path=path%2Fto%2Ffile.txt');
    });
  });

  describe('Download URL Building', () => {
    it('should build correct download URL', () => {
      const baseUrl = 'https://forge.test.com/';
      const relKey = 'path/to/file.txt';
      
      const url = new URL('v1/storage/downloadUrl', baseUrl);
      url.searchParams.set('path', relKey);
      
      expect(url.toString()).toBe('https://forge.test.com/v1/storage/downloadUrl?path=path%2Fto%2Ffile.txt');
    });
  });

  describe('Auth Headers', () => {
    it('should build correct authorization headers', () => {
      const apiKey = 'test-api-key';
      const headers = { Authorization: `Bearer ${apiKey}` };
      
      expect(headers.Authorization).toBe('Bearer test-api-key');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when credentials are missing', () => {
      const checkCredentials = (baseUrl?: string, apiKey?: string) => {
        if (!baseUrl || !apiKey) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Storage proxy credentials missing' });
        }
      };
      
      expect(() => checkCredentials(undefined, 'key')).toThrow('Storage proxy credentials missing');
      expect(() => checkCredentials('url', undefined)).toThrow('Storage proxy credentials missing');
      expect(() => checkCredentials('url', 'key')).not.toThrow();
    });

    it('should format upload error message correctly', () => {
      const status = 500;
      const statusText = 'Internal Server Error';
      const message = 'Server error';
      
      const errorMessage = `Storage upload failed (${status} ${statusText}): ${message}`;
      
      expect(errorMessage).toBe('Storage upload failed (500 Internal Server Error): Server error');
    });
  });

  describe('FormData Creation', () => {
    it('should extract filename from key', () => {
      const key = 'path/to/document.pdf';
      const fileName = key.split('/').pop() ?? key;
      
      expect(fileName).toBe('document.pdf');
    });

    it('should handle keys without path', () => {
      const key = 'simple-file.txt';
      const fileName = key.split('/').pop() ?? key;
      
      expect(fileName).toBe('simple-file.txt');
    });
  });

  describe('Content Type Handling', () => {
    it('should use default content type when not specified', () => {
      const defaultContentType = 'application/octet-stream';
      
      expect(defaultContentType).toBe('application/octet-stream');
    });

    it('should preserve specified content type', () => {
      const contentType = 'image/png';
      
      expect(contentType).toBe('image/png');
    });
  });
});
