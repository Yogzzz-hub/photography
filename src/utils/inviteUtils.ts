/**
 * Vault Invitation & Deep-Link Utility
 * Handles dynamic URL generation, token extraction, and code normalization.
 */

/**
 * Extracts and normalizes an invitation code from user input, which can be:
 * - A full URL: https://myorb.live/join?code=MYORB_INV_G9EZRC
 * - A local URL: http://localhost:3000/join?code=MYORB-INV-7X9K2M
 * - A query string: ?code=MYORB_INV_G9EZRC or ?invite=MYORB_INV_G9EZRC
 * - A path with code: /join/MYORB-INV-G9EZRC
 * - A raw code with underscores: MYORB_INV_G9EZRC
 * - A raw code with hyphens: MYORB-INV-G9EZRC
 * - A short token: G9EZRC
 */
export function extractAndNormalizeInviteCode(input: string): string {
  if (!input) return '';
  let str = input.trim();

  // If input is a full URL or query string, extract code or invite param
  if (str.includes('?') || str.includes('code=') || str.includes('invite=')) {
    try {
      const urlToParse = str.startsWith('http')
        ? str
        : `http://localhost/${str.replace(/^\/+/, '')}`;
      const url = new URL(urlToParse);
      const paramCode = url.searchParams.get('code') || url.searchParams.get('invite');
      if (paramCode) {
        str = paramCode;
      }
    } catch {
      const match = str.match(/(?:code|invite)=([A-Za-z0-9_\-]+)/i);
      if (match && match[1]) {
        str = match[1];
      }
    }
  }

  // If path segments remain (e.g. /join/MYORB-INV-XXXXXX), extract token
  if (str.includes('/')) {
    const parts = str.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && last !== 'join' && !last.includes('?')) {
      str = last;
    }
  }

  // Normalize: trim, uppercase, convert all underscores to hyphens
  let normalized = str.trim().toUpperCase().replace(/_/g, '-');

  // Standardize prefix if malformed
  normalized = normalized.replace(/^MYORB[_\-\s]*INV[_\-\s]*/, 'MYORB-INV-');

  return normalized;
}

/**
 * Generates an absolute shareable invitation URL targeting the active origin.
 * Automatically adapts between local development (http://localhost:3000) and production domains.
 * Uses query parameter (?code=...) on origin root so it resolves 100% reliably on ALL static hosts
 * without triggering 404 "Not Found" errors.
 */
export function getVaultJoinUrl(code: string): string {
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'http://localhost:3000';

  const cleanCode = extractAndNormalizeInviteCode(code);
  return `${origin}/join?code=${encodeURIComponent(cleanCode)}`;
}
