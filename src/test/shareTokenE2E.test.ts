import { describe, it, expect, beforeEach } from 'vitest';
import {
  createShareableInvoiceLink,
  revokeShareableInvoiceLink,
  resolveShareToken,
  ShareAuthError,
  _resetShareTokens,
} from '@/utils/shareInvoice';
import { buildInvoice } from './fixtures';

const OWNER = 'user-owner';
const ATTACKER = 'user-attacker';

const invoice = { ...buildInvoice('minimal', 2), id: 'inv-share-1', notes: 'SECRET' };

beforeEach(() => _resetShareTokens());

describe('Shareable invoice link — token lifecycle (E2E)', () => {
  it('mints a token only for the rightful owner', () => {
    const { url, token, expiresAt } = createShareableInvoiceLink({
      invoice,
      currentUserId: OWNER,
      invoiceOwnerId: OWNER,
    });
    expect(token).toBeTruthy();
    expect(url).toContain(token);
    expect(expiresAt).toBeGreaterThan(Date.now());
  });

  it('refuses to mint when ownership check fails', () => {
    expect(() =>
      createShareableInvoiceLink({
        invoice,
        currentUserId: ATTACKER,
        invoiceOwnerId: OWNER,
      }),
    ).toThrow(ShareAuthError);
  });

  it('resolves a valid token and returns ONLY metadata (no invoice content)', () => {
    const { token } = createShareableInvoiceLink({
      invoice,
      currentUserId: OWNER,
      invoiceOwnerId: OWNER,
      ttlMs: 60_000,
    });
    const resolved = resolveShareToken(token);
    expect(resolved.invoiceId).toBe('inv-share-1');
    expect(resolved.ownerId).toBe(OWNER);
    // The resolver must NOT return invoice content directly.
    expect(JSON.stringify(resolved)).not.toContain('SECRET');
  });

  it('unauthorized users loading the share link NEVER see invoice content', () => {
    // Simulate the full shared-link load flow for an attacker who guesses
    // or gets hold of a token but has no business viewing it.
    const { token } = createShareableInvoiceLink({
      invoice,
      currentUserId: OWNER,
      invoiceOwnerId: OWNER,
    });

    // Wrong/garbage tokens — must error, never return invoice data.
    for (const bad of ['', 'not-a-token', 'xxxxxx', `${token}-tampered`]) {
      let captured: unknown = null;
      try {
        captured = resolveShareToken(bad);
      } catch (e) {
        expect(e).toBeInstanceOf(ShareAuthError);
      }
      expect(captured).toBeNull();
    }
  });

  it('refuses expired tokens (time-limited)', () => {
    const { token, expiresAt } = createShareableInvoiceLink({
      invoice,
      currentUserId: OWNER,
      invoiceOwnerId: OWNER,
      ttlMs: 1_000,
    });
    // Fast-forward past expiry by passing now explicitly.
    expect(() => resolveShareToken(token, expiresAt + 1)).toThrow(/expired/i);
  });

  it('refuses revoked tokens (revoke disables old links)', () => {
    const { token } = createShareableInvoiceLink({
      invoice,
      currentUserId: OWNER,
      invoiceOwnerId: OWNER,
    });
    // Resolves before revocation
    expect(resolveShareToken(token).invoiceId).toBe('inv-share-1');

    const ok = revokeShareableInvoiceLink(token, OWNER);
    expect(ok).toBe(true);

    expect(() => resolveShareToken(token)).toThrow(/revoke/i);
  });

  it('only the owner may revoke their own link', () => {
    const { token } = createShareableInvoiceLink({
      invoice,
      currentUserId: OWNER,
      invoiceOwnerId: OWNER,
    });
    expect(() => revokeShareableInvoiceLink(token, ATTACKER)).toThrow(ShareAuthError);
    // Token still resolvable for the owner since attacker couldn't revoke.
    expect(resolveShareToken(token).invoiceId).toBe('inv-share-1');
  });

  it('rejects invalid ttlMs values', () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        createShareableInvoiceLink({
          invoice,
          currentUserId: OWNER,
          invoiceOwnerId: OWNER,
          ttlMs: bad,
        }),
      ).toThrow(ShareAuthError);
    }
  });
});
