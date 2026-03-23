/**
 * Seusdados Due Diligence - XSS Sanitization Utilities
 * Utilitários para sanitização de HTML e prevenção de XSS
 */

import DOMPurify from 'dompurify';

/**
 * Configuração padrão do DOMPurify
 */
const DEFAULT_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'strike',
    'ul', 'ol', 'li', 'a', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img', 'hr',
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'class', 'id', 'style',
    'src', 'alt', 'title', 'width', 'height',
    'colspan', 'rowspan',
  ],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  RETURN_TRUSTED_TYPE: false as const,
};

/**
 * Sanitiza HTML para prevenir XSS
 */
export function sanitizeHtml(dirty: string, config?: Record<string, unknown>): string {
  return DOMPurify.sanitize(dirty, { ...DEFAULT_CONFIG, ...config }) as string;
}

/**
 * Sanitiza HTML permitindo apenas texto (remove todas as tags)
 */
export function sanitizeToText(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [], RETURN_TRUSTED_TYPE: false }) as string;
}

/**
 * Sanitiza HTML para uso em rich text editor
 */
export function sanitizeRichText(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ...DEFAULT_CONFIG,
    ALLOWED_TAGS: [
      ...DEFAULT_CONFIG.ALLOWED_TAGS,
      'figure', 'figcaption', 'video', 'audio', 'source',
    ],
    ALLOWED_ATTR: [
      ...DEFAULT_CONFIG.ALLOWED_ATTR,
      'controls', 'autoplay', 'loop', 'muted', 'poster', 'type',
    ],
  }) as string;
}

/**
 * Sanitiza URL para prevenir javascript: e data: URLs maliciosos
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return '';
  }
  
  // Allow safe protocols
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  ) {
    return url;
  }
  
  // Default to https for URLs without protocol
  if (!trimmed.includes('://')) {
    return `https://${url}`;
  }
  
  return '';
}

/**
 * Escapa caracteres especiais HTML
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Hook para sanitizar dados antes de renderizar
 */
export function useSanitize() {
  return {
    html: sanitizeHtml,
    text: sanitizeToText,
    richText: sanitizeRichText,
    url: sanitizeUrl,
    escape: escapeHtml,
  };
}

export default {
  sanitizeHtml,
  sanitizeToText,
  sanitizeRichText,
  sanitizeUrl,
  escapeHtml,
  useSanitize,
};
