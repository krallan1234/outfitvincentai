import DOMPurify from 'dompurify';
import { z } from 'zod';
import { logger } from './logger';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export const sanitizeHTML = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
};

/**
 * Sanitize user input (prompts, descriptions, etc.)
 * Removes any HTML/script tags and limits length
 */
export const sanitizeUserInput = (input: string, maxLength = 1000): string => {
  // Remove any HTML tags
  const withoutHTML = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  // Trim and limit length
  const trimmed = withoutHTML.trim().slice(0, maxLength);

  logger.debug('User input sanitized', {
    originalLength: input.length,
    sanitizedLength: trimmed.length,
  });

  return trimmed;
};

/**
 * Validate and sanitize email
 */
export const sanitizeEmail = (email: string): string => {
  const emailSchema = z.string().email().max(255);
  const validated = emailSchema.parse(email.toLowerCase().trim());
  return validated;
};

/**
 * Validate and sanitize URL
 */
export const sanitizeURL = (url: string): string => {
  const urlSchema = z.string().url().max(2048);
  const validated = urlSchema.parse(url.trim());

  // Additional check: only allow http and https protocols
  const parsed = new URL(validated);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Invalid URL protocol');
  }

  return validated;
};

/**
 * Rate limiting state (client-side)
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  check(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing attempts and filter out old ones
    const existing = this.attempts.get(key) || [];
    const recentAttempts = existing.filter((time) => time > windowStart);

    if (recentAttempts.length >= limit) {
      logger.warn('Rate limit exceeded', { key, attempts: recentAttempts.length, limit });
      return false;
    }

    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);

    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Client-side rate limiting for outfit generation
 * Limit: 5 generations per minute
 */
export const checkGenerationRateLimit = (userId: string): boolean => {
  const key = `generate_${userId}`;
  const limit = 5;
  const windowMs = 60 * 1000; // 1 minute

  return rateLimiter.check(key, limit, windowMs);
};

/**
 * Content Security Policy headers for enhanced security
 */
export const cspHeaders = {
  'Content-Security-Policy':
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' https://bichfpvapfibrpplrtcr.supabase.co wss://bichfpvapfibrpplrtcr.supabase.co; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
