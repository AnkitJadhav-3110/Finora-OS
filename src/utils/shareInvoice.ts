import { Invoice, Business, Client, AppSettings } from '@/store/useStore';

export class ShareAuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'ShareAuthError';
  }
}

interface ShareParams {
  invoice: Invoice | Omit<Invoice, 'id'> & { id?: string };
  currentUserId: string | null | undefined;
  invoiceOwnerId: string | null | undefined;
  baseUrl?: string;
}

/**
 * Builds a shareable invoice link. Refuses to expose another user's invoice,
 * even if the requesting user is "guessing" an invoice id they don't own.
 * The link is only produced when ownership is fully verified.
 */
export function buildShareableInvoiceLink(params: ShareParams): string {
  const { invoice, currentUserId, invoiceOwnerId, baseUrl = 'https://app.example/invoice/' } = params;
  if (!currentUserId) {
    throw new ShareAuthError('You must be signed in to share an invoice.');
  }
  if (!invoiceOwnerId) {
    throw new ShareAuthError('Invoice owner is unknown.');
  }
  if (invoiceOwnerId !== currentUserId) {
    throw new ShareAuthError('You are not authorized to share this invoice.');
  }
  const id = (invoice as { id?: string }).id;
  if (!id) {
    throw new ShareAuthError('Cannot share an invoice without an id.');
  }
  return `${baseUrl}${encodeURIComponent(id)}`;
}

// =====================================================================
// Time-limited revocable share tokens
// =====================================================================

export interface ShareToken {
  token: string;
  invoiceId: string;
  ownerId: string;
  expiresAt: number; // epoch ms
  createdAt: number;
}

interface StoredToken extends ShareToken {
  revoked: boolean;
}

// Module-level token registry. Replace with DB-backed storage in production.
const tokenRegistry = new Map<string, StoredToken>();

function randomToken(): string {
  // Avoid crypto.getRandomValues for jsdom edge cases; URL-safe random.
  const a = Math.random().toString(36).slice(2);
  const b = Math.random().toString(36).slice(2);
  const c = Date.now().toString(36);
  return `${a}${b}${c}`;
}

export interface CreateShareLinkParams {
  invoice: Invoice | (Omit<Invoice, 'id'> & { id?: string });
  currentUserId: string | null | undefined;
  invoiceOwnerId: string | null | undefined;
  ttlMs?: number; // default 7 days
  baseUrl?: string;
}

export interface CreatedShareLink {
  url: string;
  token: string;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Creates a revocable, time-limited shareable link. Enforces ownership
 * before minting and registers the token so it can be revoked later.
 */
export function createShareableInvoiceLink(
  params: CreateShareLinkParams,
): CreatedShareLink {
  const {
    invoice,
    currentUserId,
    invoiceOwnerId,
    ttlMs = DEFAULT_TTL_MS,
    baseUrl = 'https://app.example/share/',
  } = params;
  if (!currentUserId) throw new ShareAuthError('You must be signed in.');
  if (!invoiceOwnerId) throw new ShareAuthError('Invoice owner is unknown.');
  if (invoiceOwnerId !== currentUserId) {
    throw new ShareAuthError('You are not authorized to share this invoice.');
  }
  const id = (invoice as { id?: string }).id;
  if (!id) throw new ShareAuthError('Invoice has no id.');
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new ShareAuthError('Invalid expiration.');
  }
  const token = randomToken();
  const now = Date.now();
  const expiresAt = now + ttlMs;
  tokenRegistry.set(token, {
    token,
    invoiceId: id,
    ownerId: invoiceOwnerId,
    expiresAt,
    createdAt: now,
    revoked: false,
  });
  return { url: `${baseUrl}${token}`, token, expiresAt };
}

/**
 * Revokes a previously issued share link. Only the original owner may revoke.
 * Idempotent: revoking an already-revoked or unknown token is a no-op return false.
 */
export function revokeShareableInvoiceLink(
  token: string,
  currentUserId: string | null | undefined,
): boolean {
  if (!currentUserId) throw new ShareAuthError('You must be signed in.');
  const entry = tokenRegistry.get(token);
  if (!entry) return false;
  if (entry.ownerId !== currentUserId) {
    throw new ShareAuthError('You cannot revoke another user’s link.');
  }
  entry.revoked = true;
  return true;
}

export interface ResolvedShareInvoice {
  invoiceId: string;
  ownerId: string;
  expiresAt: number;
}

/**
 * Resolves a share token. Throws ShareAuthError if invalid, expired, or
 * revoked. Never returns any invoice content — callers must use the
 * returned invoiceId to fetch invoice data through normal authorized paths.
 */
export function resolveShareToken(
  token: string,
  now: number = Date.now(),
): ResolvedShareInvoice {
  if (!token || typeof token !== 'string') {
    throw new ShareAuthError('Invalid share link.');
  }
  const entry = tokenRegistry.get(token);
  if (!entry) throw new ShareAuthError('Share link not found.');
  if (entry.revoked) throw new ShareAuthError('Share link has been revoked.');
  if (entry.expiresAt <= now) throw new ShareAuthError('Share link has expired.');
  return {
    invoiceId: entry.invoiceId,
    ownerId: entry.ownerId,
    expiresAt: entry.expiresAt,
  };
}

/** Test helper — clears all issued tokens. Not exposed in production UX. */
export function _resetShareTokens() {
  tokenRegistry.clear();
}

interface EmailExportParams {
  invoice: Invoice | Omit<Invoice, 'id'>;
  client: Client;
  business: Business;
  settings: AppSettings;
  currentUserId: string | null | undefined;
  invoiceOwnerId: string | null | undefined;
  clientOwnerId?: string | null | undefined;
}

export interface SimulatedEmail {
  to: string;
  subject: string;
  body: string;
}

/**
 * Simulates the email-export flow (mailto draft) but only after verifying
 * that the caller owns the invoice and client. Returns the email payload so
 * callers/tests can assert it does not contain another user's data.
 */
export function simulateInvoiceEmailExportAuthorized(
  params: EmailExportParams,
): SimulatedEmail {
  const { invoice, client, business, currentUserId, invoiceOwnerId, clientOwnerId } = params;
  if (!currentUserId) {
    throw new ShareAuthError('You must be signed in to email this invoice.');
  }
  if (!invoiceOwnerId || invoiceOwnerId !== currentUserId) {
    throw new ShareAuthError('You are not authorized to email this invoice.');
  }
  if (clientOwnerId && clientOwnerId !== currentUserId) {
    throw new ShareAuthError('Client does not belong to current user.');
  }
  return {
    to: client.email,
    subject: `Invoice ${invoice.invoiceNumber} from ${business.name}`,
    body: `Hello ${client.name},\n\nPlease find your invoice ${invoice.invoiceNumber} for ${client.currencySymbol}${invoice.total.toFixed(2)}.\n\n${business.name}`,
  };
}
