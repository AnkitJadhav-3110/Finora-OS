import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ExternalLink } from 'lucide-react';
import { CustomTemplate, FieldMapping, Invoice, Client, Business, AppSettings } from '@/store/useStore';
import {
  resolveInvoiceFieldValue,
  resolveInvoiceQRPayload,
  getInvoiceCurrencySymbol,
} from '@/utils/templateFieldResolver';

interface CustomTemplatePreviewProps {
  template: CustomTemplate;
  invoice: any;
  client: Client;
  business: Business;
  settings: AppSettings;
}

export function CustomTemplatePreview({
  template,
  invoice,
  client,
  business,
  settings,
}: CustomTemplatePreviewProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const hasQrField = template.fieldMappings?.some((f) => f.fieldType === 'qrCode');
    if (hasQrField) {
      const qrData = resolveInvoiceQRPayload(invoice);
      QRCode.toDataURL(qrData, { margin: 1, width: 300, errorCorrectionLevel: 'M' })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(''));
    }
  }, [template, invoice]);

  const currencySymbol = getInvoiceCurrencySymbol(client, settings, invoice);

  const getFieldValue = (field: FieldMapping): string => {
    return resolveInvoiceFieldValue(field, invoice, client, business, settings);
  };

  const items = Array.isArray(invoice?.items) ? invoice.items : [];

  return (
    <div
      className="relative w-full aspect-[210/297] bg-white shadow-xl rounded-lg overflow-hidden border border-slate-200 select-none print:shadow-none print:border-none print:rounded-none"
      style={{
        backgroundImage: template.backgroundImage ? `url(${template.backgroundImage})` : undefined,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
    >
      {(template.fieldMappings || []).map((field) => {
        const leftPercent = (field.x / 800) * 100;
        const topPercent = (field.y / 600) * 100;
        const widthPercent = (field.width / 800) * 100;
        const heightPercent = (field.height / 600) * 100;

        // 1. Items Table Field
        if (field.fieldType === 'items') {
          return (
            <div
              key={field.fieldId}
              className="absolute overflow-hidden pointer-events-none"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
                color: field.color || '#1e293b',
              }}
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 font-semibold text-[11px] text-slate-700">
                    <th className="py-1">Description</th>
                    <th className="py-1 text-center w-12">Qty</th>
                    <th className="py-1 text-right w-16">Price</th>
                    <th className="py-1 text-right w-20">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item: any, idx: number) => {
                    const qty = item.quantity || 0;
                    const price = item.price || 0;
                    const amount = qty * price;
                    return (
                      <tr key={item.id || idx} className="text-[10px]">
                        <td className="py-1 font-medium truncate max-w-[140px]">
                          {item.description || 'Item'}
                        </td>
                        <td className="py-1 text-center">{qty}</td>
                        <td className="py-1 text-right">
                          {currencySymbol}{price.toFixed(2)}
                        </td>
                        <td className="py-1 text-right font-medium">
                          {currencySymbol}{amount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }

        // 2. Business Logo
        if (field.fieldType === 'logo' || field.fieldType === 'businessLogo') {
          if (!business?.logo) return null;
          return (
            <div
              key={field.fieldId}
              className="absolute flex items-center justify-center pointer-events-none"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
              }}
            >
              <img
                src={business.logo}
                alt="Logo"
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          );
        }

        // 3. Payment QR Code
        if (field.fieldType === 'qrCode') {
          if (!qrDataUrl) return null;
          return (
            <div
              key={field.fieldId}
              className="absolute flex items-center justify-center pointer-events-none"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
              }}
            >
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          );
        }

        // 4. Payment Status Badge
        if (field.fieldType === 'paymentStatus') {
          const isPaid = invoice?.isPaid || invoice?.status === 'paid';
          return (
            <div
              key={field.fieldId}
              className="absolute flex items-center pointer-events-none"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
                justifyContent: field.alignment === 'center' ? 'center' : field.alignment === 'right' ? 'flex-end' : 'flex-start',
              }}
            >
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                  isPaid
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {isPaid ? 'PAID' : 'UNPAID'}
              </span>
            </div>
          );
        }

        // 5. Payment Link
        if (field.fieldType === 'paymentLink') {
          const linkValue = getFieldValue(field);
          if (!linkValue) return null;
          return (
            <div
              key={field.fieldId}
              className="absolute pointer-events-none flex items-center gap-1 truncate"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
                fontSize: `${Math.max(9, field.fontSize * 0.75)}px`,
                color: field.color || '#4f46e5',
                fontWeight: field.fontWeight || '500',
                justifyContent: field.alignment === 'center' ? 'center' : field.alignment === 'right' ? 'flex-end' : 'flex-start',
              }}
            >
              <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
              <span className="truncate underline underline-offset-2">{linkValue}</span>
            </div>
          );
        }

        // 6. Standard text fields
        const textValue = getFieldValue(field);
        if (!textValue) return null;

        return (
          <div
            key={field.fieldId}
            className="absolute pointer-events-none flex items-center truncate"
            style={{
              left: `${leftPercent}%`,
              top: `${topPercent}%`,
              width: `${widthPercent}%`,
              height: `${heightPercent}%`,
              fontSize: `${Math.max(9, field.fontSize * 0.75)}px`,
              fontWeight: field.fontWeight || 'normal',
              color: field.color || '#0f172a',
              lineHeight: 1.2,
              justifyContent: field.alignment === 'center' ? 'center' : field.alignment === 'right' ? 'flex-end' : 'flex-start',
              textAlign: field.alignment || 'left',
            }}
          >
            <span className="truncate">{textValue}</span>
          </div>
        );
      })}
    </div>
  );
}
