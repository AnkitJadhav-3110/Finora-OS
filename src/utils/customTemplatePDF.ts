import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import {
  Invoice,
  Client,
  Business,
  AppSettings,
  CustomTemplate,
  FieldMapping,
} from '@/store/useStore';
import {
  resolveInvoiceFieldValue,
  resolveInvoiceQRPayload,
  isFiniteNumber,
  safeString,
} from './templateFieldResolver';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 15;
const ROW_HEIGHT = 7;

const KNOWN_FIELD_TYPES = new Set<FieldMapping['fieldType']>([
  'businessName',
  'businessAddress',
  'businessContact',
  'businessLogo',
  'clientName',
  'clientAddress',
  'invoiceNumber',
  'date',
  'dueDate',
  'paymentTerms',
  'items',
  'quantity',
  'unitPrice',
  'price',
  'tax',
  'discount',
  'subtotal',
  'total',
  'paymentStatus',
  'paymentInstructions',
  'qrCode',
  'paymentLink',
  'notes',
  'logo',
]);

/**
 * Validates a field mapping for required, finite numeric inputs and known
 * field types. Returns false (skip) for anything malformed so we never emit
 * placeholders like NaN/undefined into the PDF.
 */
function isValidField(field: FieldMapping | undefined | null): field is FieldMapping {
  if (!field) return false;
  if (!KNOWN_FIELD_TYPES.has(field.fieldType as FieldMapping['fieldType'])) return false;
  if (!isFiniteNumber(field.x) || !isFiniteNumber(field.y)) return false;
  if (!isFiniteNumber(field.width) || !isFiniteNumber(field.height)) return false;
  if (field.x < 0 || field.y < 0 || field.width <= 0 || field.height <= 0) return false;
  if (!isFiniteNumber(field.fontSize) || field.fontSize <= 0) return false;
  return true;
}

export class TemplateMappingError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super(issues[0] ?? 'Invalid template mapping');
    this.issues = issues;
    this.name = 'TemplateMappingError';
  }
}

export interface TemplateValidationResult {
  ok: boolean;
  issues: string[];
}

/**
 * Validates a CustomTemplate's mappings BEFORE PDF generation. Returns a
 * list of human-readable issues so the editor can surface them inline and
 * refuse to generate a malformed PDF.
 */
export function validateTemplateMapping(
  template: Pick<CustomTemplate, 'fieldMappings' | 'backgroundImage' | 'name'>,
): TemplateValidationResult {
  const issues: string[] = [];
  if (!template) {
    return { ok: false, issues: ['Template is missing.'] };
  }
  const hasValidBg =
    template.backgroundImage &&
    (/^data:image\//.test(template.backgroundImage) ||
      /^https?:\/\//.test(template.backgroundImage) ||
      /^blob:/.test(template.backgroundImage));
  if (!hasValidBg) {
    issues.push('Background image is missing or invalid.');
  }
  if (!Array.isArray(template.fieldMappings) || template.fieldMappings.length === 0) {
    issues.push('At least one field must be mapped.');
    return { ok: false, issues };
  }

  const required: FieldMapping['fieldType'][] = ['businessName', 'clientName', 'invoiceNumber', 'total', 'items'];
  const present = new Set(template.fieldMappings.map((f) => f.fieldType));
  for (const r of required) {
    if (!present.has(r)) issues.push(`Required field "${r}" is not mapped.`);
  }

  template.fieldMappings.forEach((f, i) => {
    if (!f || typeof f !== 'object') {
      issues.push(`Field #${i + 1} is not an object.`);
      return;
    }
    if (!KNOWN_FIELD_TYPES.has(f.fieldType as FieldMapping['fieldType'])) {
      issues.push(`Field #${i + 1} has unknown type "${String(f.fieldType)}".`);
    }
    for (const key of ['x', 'y', 'width', 'height', 'fontSize'] as const) {
      const v = (f as any)[key];
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        issues.push(`Field "${f.fieldType}" has non-numeric ${key}.`);
      }
    }
    if (isFiniteNumber(f.width) && f.width <= 0) issues.push(`Field "${f.fieldType}" has non-positive width.`);
    if (isFiniteNumber(f.height) && f.height <= 0) issues.push(`Field "${f.fieldType}" has non-positive height.`);
    if (isFiniteNumber(f.x) && f.x < 0) issues.push(`Field "${f.fieldType}" has negative x.`);
    if (isFiniteNumber(f.y) && f.y < 0) issues.push(`Field "${f.fieldType}" has negative y.`);

    // Printable Boundary Validation (800 x 600 canvas coordinate boundary)
    if (isFiniteNumber(f.x) && isFiniteNumber(f.width) && f.x + f.width > 800) {
      issues.push(`Field "${f.fieldType}" exceeds printable horizontal boundary (max 800px).`);
    }
    if (isFiniteNumber(f.y) && isFiniteNumber(f.height) && f.y + f.height > 600) {
      issues.push(`Field "${f.fieldType}" exceeds printable vertical boundary (max 600px).`);
    }

    if (typeof f.color !== 'string' || !/^#?[0-9a-fA-F]{3,8}$/.test(f.color)) {
      issues.push(`Field "${f.fieldType}" has invalid color.`);
    }
  });

  return { ok: issues.length === 0, issues };
}

function pxToMm(px: number) {
  return (px / 600) * (PAGE_HEIGHT - 2 * MARGIN) + MARGIN;
}
function pxToMmX(px: number) {
  return (px / 800) * (PAGE_WIDTH - 2 * MARGIN) + MARGIN;
}

function safe(value: unknown): string {
  return safeString(value);
}

function valueFor(
  field: FieldMapping,
  invoice: Invoice | Omit<Invoice, 'id'>,
  client: Client,
  business: Business,
  settings: AppSettings,
): string {
  return resolveInvoiceFieldValue(field, invoice, client, business, settings);
}

function drawItemsHeader(pdf: jsPDF, x: number, y: number, w: number) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('DESCRIPTION', x + 2, y + 5);
  pdf.text('QTY', x + w * 0.55, y + 5);
  pdf.text('PRICE', x + w * 0.7, y + 5);
  pdf.text('AMOUNT', x + w - 2, y + 5, { align: 'right' });
  pdf.setDrawColor(200);
  pdf.line(x, y + 6.5, x + w, y + 6.5);
  pdf.setFont('helvetica', 'normal');
}

async function fetchImageAsDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:image/')) return url;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

async function drawBackground(pdf: jsPDF, bg?: string) {
  if (!bg) return;
  try {
    let imgData = bg;
    if (bg.startsWith('http://') || bg.startsWith('https://')) {
      imgData = await fetchImageAsDataUrl(bg);
    }
    if (!imgData || !imgData.startsWith('data:image/')) return;
    const fmt = imgData.includes('jpeg') || imgData.includes('jpg') ? 'JPEG' : 'PNG';
    pdf.addImage(imgData, fmt, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  } catch {
    /* ignore */
  }
}

function drawSimpleFields(
  pdf: jsPDF,
  template: CustomTemplate,
  invoice: Invoice | Omit<Invoice, 'id'>,
  client: Client,
  business: Business,
  settings: AppSettings,
) {
  for (const field of template.fieldMappings) {
    if (!isValidField(field)) continue;
    if (
      field.fieldType === 'items' ||
      field.fieldType === 'logo' ||
      field.fieldType === 'businessLogo' ||
      field.fieldType === 'qrCode'
    ) {
      continue;
    }
    const text = valueFor(field, invoice, client, business, settings);
    if (!text) continue;
    const x = pxToMmX(field.x);
    const y = pxToMm(field.y);
    pdf.setFontSize(Math.max(8, Math.min(18, field.fontSize / 2)));
    pdf.setTextColor(field.color || '#000000');
    pdf.setFont('helvetica', field.fontWeight === 'bold' ? 'bold' : 'normal');
    pdf.text(text, x, y, { maxWidth: Math.max(10, pxToMmX(field.x + field.width) - x) });
  }
}

async function drawSpecialElements(
  pdf: jsPDF,
  template: CustomTemplate,
  invoice: Invoice | Omit<Invoice, 'id'>,
  business: Business,
) {
  // 1. Draw Business Logo
  const logoField = template.fieldMappings.find(
    (f) => isValidField(f) && (f.fieldType === 'logo' || f.fieldType === 'businessLogo')
  );
  if (logoField && business?.logo) {
    try {
      let logoData = business.logo;
      if (logoData.startsWith('http://') || logoData.startsWith('https://')) {
        logoData = await fetchImageAsDataUrl(logoData);
      }
      if (logoData.startsWith('data:image/')) {
        const lx = pxToMmX(logoField.x);
        const ly = pxToMm(logoField.y);
        const lw = (logoField.width / 800) * (PAGE_WIDTH - 2 * MARGIN);
        const lh = (logoField.height / 600) * (PAGE_HEIGHT - 2 * MARGIN);
        const fmt = logoData.includes('jpeg') || logoData.includes('jpg') ? 'JPEG' : 'PNG';
        pdf.addImage(logoData, fmt, lx, ly, lw, lh);
      }
    } catch {
      /* ignore */
    }
  }

  // 2. Draw Payment QR Code
  const qrField = template.fieldMappings.find(
    (f) => isValidField(f) && f.fieldType === 'qrCode'
  );
  if (qrField) {
    try {
      const qrData = resolveInvoiceQRPayload(invoice);
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        margin: 1,
        width: 512,
        errorCorrectionLevel: 'M',
      });
      const qrx = pxToMmX(qrField.x);
      const qry = pxToMm(qrField.y);
      const qrw = (qrField.width / 800) * (PAGE_WIDTH - 2 * MARGIN);
      const qrh = (qrField.height / 600) * (PAGE_HEIGHT - 2 * MARGIN);
      const size = Math.min(qrw, qrh);
      pdf.addImage(qrDataUrl, 'PNG', qrx, qry, size, size);
    } catch {
      /* ignore */
    }
  }
}

export interface GenerateCustomTemplateOptions {
  /** When true, refuse to generate a PDF for invalid mappings (throws TemplateMappingError). */
  strict?: boolean;
}

export async function generateCustomTemplatePDF(
  template: CustomTemplate,
  invoice: Invoice | Omit<Invoice, 'id'>,
  client: Client,
  business: Business,
  settings: AppSettings,
  options: GenerateCustomTemplateOptions = {},
): Promise<Blob> {
  if (options.strict) {
    const v = validateTemplateMapping(template ?? ({} as CustomTemplate));
    if (!v.ok) throw new TemplateMappingError(v.issues);
  }
  if (!template || !Array.isArray(template.fieldMappings)) {
    // Graceful: produce an empty but valid PDF rather than throwing.
    const pdf = new jsPDF('p', 'mm', 'a4');
    return pdf.output('blob');
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  await drawBackground(pdf, template.backgroundImage);
  drawSimpleFields(pdf, template, invoice, client, business, settings);
  await drawSpecialElements(pdf, template, invoice, business);

  const itemsField = template.fieldMappings.find(
    (f) => isValidField(f) && f.fieldType === 'items',
  );
  if (itemsField && Array.isArray(invoice.items) && invoice.items.length > 0) {
    const tableX = pxToMmX(itemsField.x);
    const tableW = (itemsField.width / 800) * (PAGE_WIDTH - 2 * MARGIN);
    let y = pxToMm(itemsField.y);
    drawItemsHeader(pdf, tableX, y, tableW);
    y += 9;

    for (const item of invoice.items) {
      if (y > PAGE_HEIGHT - 20) {
        pdf.addPage();
        await drawBackground(pdf, template.backgroundImage);
        // Repeat all mapped fields (totals, notes, invoiceNumber, etc.) on overflow.
        drawSimpleFields(pdf, template, invoice, client, business, settings);
        await drawSpecialElements(pdf, template, invoice, business);
        y = MARGIN + 10;
        drawItemsHeader(pdf, tableX, y, tableW);
        y += 9;
      }
      pdf.setFontSize(9);
      pdf.setTextColor('#111111');
      const desc = safe(item?.description).slice(0, 40);
      const qty = isFiniteNumber(item?.quantity) ? String(item.quantity) : '';
      const price = isFiniteNumber(item?.price) ? `${safe(client.currencySymbol)}${item.price.toFixed(2)}` : '';
      const amount =
        isFiniteNumber(item?.quantity) && isFiniteNumber(item?.price)
          ? `${safe(client.currencySymbol)}${(item.quantity * item.price).toFixed(2)}`
          : '';
      if (desc) pdf.text(desc, tableX + 2, y);
      if (qty) pdf.text(qty, tableX + tableW * 0.55, y);
      if (price) pdf.text(price, tableX + tableW * 0.7, y);
      if (amount) pdf.text(amount, tableX + tableW - 2, y, { align: 'right' });
      y += ROW_HEIGHT;
    }

    if (y > PAGE_HEIGHT - 30) {
      pdf.addPage();
      await drawBackground(pdf, template.backgroundImage);
      drawSimpleFields(pdf, template, invoice, client, business, settings);
      await drawSpecialElements(pdf, template, invoice, business);
      y = MARGIN + 10;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    const totalStr = isFiniteNumber(invoice.total)
      ? `TOTAL: ${safe(client.currencySymbol)}${invoice.total.toFixed(2)}`
      : '';
    if (totalStr) pdf.text(totalStr, tableX + tableW - 2, y + 6, { align: 'right' });
  }

  return pdf.output('blob');
}

