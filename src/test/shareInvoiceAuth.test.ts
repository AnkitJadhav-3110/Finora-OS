import { describe, it, expect } from 'vitest';
import {
  buildShareableInvoiceLink,
  simulateInvoiceEmailExportAuthorized,
  ShareAuthError,
} from '@/utils/shareInvoice';
import {
  buildInvoice,
  sampleBusiness,
  sampleClient,
  sampleSettings,
} from './fixtures';

const ownInvoice = { ...buildInvoice('minimal', 2), id: 'inv-own-1' };
const otherInvoice = {
  ...buildInvoice('minimal', 2, {
    invoiceNumber: 'INV-LEAK',
    notes: 'SECRET-OTHER-USER',
  }),
  id: 'inv-other-1',
};

describe('Shareable invoice link authorization', () => {
  it('refuses to mint a link when the user is not signed in', () => {
    expect(() =>
      buildShareableInvoiceLink({
        invoice: ownInvoice,
        currentUserId: null,
        invoiceOwnerId: 'user-1',
      }),
    ).toThrow(ShareAuthError);
  });

  it('refuses to mint a link for a guessed invoice id belonging to another user', () => {
    // Attacker guesses the id of a valid invoice but does not own it.
    let captured: string | null = null;
    try {
      captured = buildShareableInvoiceLink({
        invoice: otherInvoice,
        currentUserId: 'attacker',
        invoiceOwnerId: 'victim',
      });
    } catch (e) {
      expect(e).toBeInstanceOf(ShareAuthError);
    }
    expect(captured).toBeNull();
  });

  it('refuses when invoiceOwnerId is unknown / missing (defense in depth)', () => {
    expect(() =>
      buildShareableInvoiceLink({
        invoice: ownInvoice,
        currentUserId: 'user-1',
        invoiceOwnerId: null,
      }),
    ).toThrow(ShareAuthError);
  });

  it('returns a deterministic link only for the rightful owner', () => {
    const link = buildShareableInvoiceLink({
      invoice: ownInvoice,
      currentUserId: 'user-1',
      invoiceOwnerId: 'user-1',
      baseUrl: 'https://app.test/invoice/',
    });
    expect(link).toBe('https://app.test/invoice/inv-own-1');
    // The link must not embed any secret invoice content.
    expect(link).not.toContain('SECRET-OTHER-USER');
    expect(link).not.toContain('INV-LEAK');
  });
});

describe('Simulated email export authorization', () => {
  it('rejects unauthenticated callers', () => {
    expect(() =>
      simulateInvoiceEmailExportAuthorized({
        invoice: ownInvoice,
        client: sampleClient,
        business: sampleBusiness,
        settings: sampleSettings,
        currentUserId: null,
        invoiceOwnerId: 'user-1',
      }),
    ).toThrow(ShareAuthError);
  });

  it('never leaks another user’s invoice content via the email body', () => {
    let body = '';
    try {
      const email = simulateInvoiceEmailExportAuthorized({
        invoice: otherInvoice,
        client: sampleClient,
        business: sampleBusiness,
        settings: sampleSettings,
        currentUserId: 'attacker',
        invoiceOwnerId: 'victim',
      });
      body = email.body + email.subject;
    } catch (e) {
      expect(e).toBeInstanceOf(ShareAuthError);
    }
    expect(body).not.toContain('SECRET-OTHER-USER');
    expect(body).not.toContain('INV-LEAK');
  });

  it('rejects when the client belongs to another user', () => {
    expect(() =>
      simulateInvoiceEmailExportAuthorized({
        invoice: ownInvoice,
        client: sampleClient,
        business: sampleBusiness,
        settings: sampleSettings,
        currentUserId: 'user-1',
        invoiceOwnerId: 'user-1',
        clientOwnerId: 'user-2',
      }),
    ).toThrow(ShareAuthError);
  });

  it('returns the draft for the rightful owner', () => {
    const email = simulateInvoiceEmailExportAuthorized({
      invoice: ownInvoice,
      client: sampleClient,
      business: sampleBusiness,
      settings: sampleSettings,
      currentUserId: 'user-1',
      invoiceOwnerId: 'user-1',
      clientOwnerId: 'user-1',
    });
    expect(email.to).toBe(sampleClient.email);
    expect(email.subject).toContain(ownInvoice.invoiceNumber);
    expect(email.body).toContain(sampleBusiness.name);
  });
});
