import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { RenderModel } from '../types/renderModel';
import { getPageDimensions } from '../utils/layout';

/**
 * Converts a hex color string (e.g. "#1e3a8a" or "#fff") into [R, G, B] array.
 */
function hexToRgb(
  hex: string | undefined,
  fallback: [number, number, number] = [17, 24, 39]
): [number, number, number] {
  if (!hex) return fallback;

  // Handle CSS gradients by extracting the primary hex stop
  if (hex.includes('gradient')) {
    const matches = hex.match(/#[0-9a-fA-F]{3,6}/g);
    if (matches && matches.length > 0) {
      return hexToRgb(matches[0], fallback);
    }
    return fallback;
  }

  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h.split('').map((char) => char + char).join('');
  }
  if (h.length === 6) {
    const num = parseInt(h, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }
  return fallback;
}

/**
 * Asynchronously preloads and rasterizes an image (SVG, remote URL, data URL, blob)
 * into a crisp PNG base64 data URL so jsPDF can reliably draw it without missing assets.
 */
async function preloadAndRasterizeImage(src?: string): Promise<string | null> {
  if (!src || typeof src !== 'string') return null;

  // Already a PNG or JPEG data URL
  if (
    src.startsWith('data:image/png;base64,') ||
    src.startsWith('data:image/jpeg;base64,') ||
    src.startsWith('data:image/jpg;base64,')
  ) {
    return src;
  }

  // If running in a browser environment with DOM canvas support
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof Image !== 'undefined') {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      const loadedImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = reject;
        setTimeout(() => reject(new Error('Image preload timeout')), 3000);
        img.src = src;
      });

      const canvas = document.createElement('canvas');
      const targetWidth = Math.max(loadedImg.naturalWidth || loadedImg.width || 300, 100);
      const targetHeight = Math.max(loadedImg.naturalHeight || loadedImg.height || 150, 50);
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(loadedImg, 0, 0, targetWidth, targetHeight);
        return canvas.toDataURL('image/png');
      }
    } catch (err) {
      console.warn('Image rasterization warning (fallback used):', err);
    }
  }

  // Fallback for data URLs
  if (src.startsWith('data:image/')) {
    return src;
  }

  return null;
}

export class PDFRenderer {
  /**
   * Generates a high-fidelity, production-quality structured PDF document from a RenderModel.
   */
  public static async render(model: RenderModel): Promise<Blob> {
    const { template, business, client, items, totals, gstBreakdown, payment, signature } = model;

    // 1. Initialize jsPDF
    const pageSize = template.page.size === 'letter' ? 'letter' : 'a4';
    const pdf = new jsPDF('p', 'mm', pageSize);

    // Page dimensions
    const dims = getPageDimensions(
      template.page.size,
      template.page.orientation,
      template.spacing.marginX,
      template.spacing.marginTop,
      template.spacing.marginBottom
    );

    // Preload & rasterize all images and QR codes asynchronously before rendering
    const [logoDataUrl, signatureDataUrl, paymentQrDataUrl, portalQrDataUrl] = await Promise.all([
      preloadAndRasterizeImage(business.logo),
      preloadAndRasterizeImage(signature.signatureDataUrl),
      payment.hasQrCode && payment.qrCodeDataUrl
        ? QRCode.toDataURL(payment.qrCodeDataUrl, { width: 300, margin: 1, errorCorrectionLevel: 'M' }).catch(() => null)
        : Promise.resolve(null),
      model.portalUrl
        ? QRCode.toDataURL(model.portalUrl, { width: 300, margin: 1, errorCorrectionLevel: 'M' }).catch(() => null)
        : Promise.resolve(null),
    ]);

    // Color Palette setup from template
    const colorPrimary = hexToRgb(template.colors.primary, [37, 99, 235]);
    const colorSecondary = hexToRgb(template.colors.secondary, [71, 85, 105]);
    const colorTextDark = hexToRgb(template.colors.textDark, [15, 23, 42]);
    const colorTextMuted = hexToRgb(template.colors.textMuted, [100, 116, 139]);
    const colorBorder = hexToRgb(template.colors.border, [226, 232, 240]);
    const colorZebra = hexToRgb(template.colors.zebra, [248, 250, 252]);
    const colorHeaderBg = hexToRgb(template.colors.headerBg, colorPrimary);
    const colorHeaderText = hexToRgb(template.colors.headerText, [255, 255, 255]);
    const colorTotalBg = hexToRgb(template.colors.totalBg, [250, 245, 255]);
    const colorTotalText = hexToRgb(template.colors.totalText, colorPrimary);
    const tableHeaderBg = hexToRgb(template.table.headerBg, colorHeaderBg);
    const tableHeaderTextColor = hexToRgb(template.table.headerTextColor, [255, 255, 255]);

    // Font mapping helper
    const getPdfFont = (type: 'sans' | 'mono' | 'display'): string => {
      const font = template.fonts[type];
      const fl = font.toLowerCase();
      if (fl.includes('mono') || fl.includes('courier') || fl.includes('code')) return 'courier';
      if (fl.includes('serif') || fl.includes('playfair') || fl.includes('cinzel')) return 'times';
      return 'helvetica';
    };

    const fontSans = getPdfFont('sans');
    const fontDisplay = getPdfFont('display');
    const fontMono = getPdfFont('mono');

    // Drawing helpers
    const setTextColor = (c: [number, number, number]) => pdf.setTextColor(c[0], c[1], c[2]);
    const setFillColor = (c: [number, number, number]) => pdf.setFillColor(c[0], c[1], c[2]);
    const setDrawColor = (c: [number, number, number]) => pdf.setDrawColor(c[0], c[1], c[2]);

    // Draw background decorations (top banner, page watermark)
    const drawPageDecorations = () => {
      if (template.decorations.topBanner) {
        setFillColor(colorHeaderBg);
        pdf.rect(0, 0, dims.width, 3.5, 'F');
      }

      if (template.decorations.bottomBanner) {
        setFillColor(colorHeaderBg);
        pdf.rect(0, dims.height - 3.5, dims.width, 3.5, 'F');
      }

      // Watermark Overlay (e.g. PAID or custom)
      if (template.watermark && template.watermark.text) {
        setTextColor(hexToRgb(template.watermark.color, [226, 232, 240]));
        pdf.setFont(fontSans, 'bold');
        pdf.setFontSize(48);
        pdf.text(template.watermark.text, dims.width / 2, dims.height / 2, {
          align: 'center',
          angle: 30,
        });
      }
    };

    drawPageDecorations();

    let y = dims.marginTop;

    // ===== 2. HEADER RENDERING =====
    if (template.header.layout === 'banner') {
      // Draw Banner background
      setFillColor(colorHeaderBg);
      pdf.rect(dims.marginX, y, dims.contentWidth, 38, 'F');

      let logoOffset = 0;
      if (logoDataUrl) {
        try {
          pdf.addImage(logoDataUrl, 'PNG', dims.marginX + 6, y + 6, 24, 14);
          logoOffset = 28;
        } catch (e) {
          console.warn('Error loading business logo into PDF banner:', e);
        }
      }

      // Business details inside banner
      pdf.setFont(fontDisplay, 'bold');
      pdf.setFontSize(13);
      setTextColor(colorHeaderText);
      pdf.text(business.name, dims.marginX + 6 + logoOffset, y + 10);

      pdf.setFont(fontSans, 'normal');
      pdf.setFontSize(7);
      setTextColor(colorHeaderText);
      const bizInfo = [
        business.address,
        [business.city, business.state, business.zipCode, business.country].filter(Boolean).join(', '),
        business.email ? `Email: ${business.email}` : '',
        business.phone ? `Phone: ${business.phone}` : '',
        business.taxId ? `GSTIN/Tax ID: ${business.taxId}` : '',
      ].filter(Boolean);

      bizInfo.slice(0, 4).forEach((line, i) => {
        pdf.text(line, dims.marginX + 6 + logoOffset, y + 14.5 + i * 3.2);
      });

      // Invoice Title & Metadata on Right side of banner
      pdf.setFont(fontDisplay, 'bold');
      pdf.setFontSize(18);
      setTextColor(colorHeaderText);
      pdf.text(model.documentTypeName, dims.width - dims.marginX - 6, y + 11, { align: 'right' });

      pdf.setFont(fontMono, 'bold');
      pdf.setFontSize(9);
      setTextColor(colorHeaderText);
      pdf.text(`#${model.documentNumber}`, dims.width - dims.marginX - 6, y + 16, { align: 'right' });

      pdf.setFont(fontSans, 'normal');
      pdf.setFontSize(7.5);
      setTextColor(colorHeaderText);
      pdf.text(`Date: ${model.createdAt}`, dims.width - dims.marginX - 6, y + 21, { align: 'right' });
      if (model.dueDate) {
        pdf.text(`Due Date: ${model.dueDate}`, dims.width - dims.marginX - 6, y + 25, { align: 'right' });
      }

      y += 43;
    } else {
      // Split / Left / Right / Modern Traditional Header
      let logoOffset = 0;
      if (logoDataUrl) {
        try {
          pdf.addImage(logoDataUrl, 'PNG', dims.marginX, y, 26, 14);
          logoOffset = 17;
        } catch (e) {
          console.warn('Error rendering logo:', e);
        }
      }

      const alignRight = template.header.layout === 'right';
      const textX = alignRight ? dims.width - dims.marginX : dims.marginX;
      const textAlign = alignRight ? 'right' : 'left';

      y += logoOffset;
      pdf.setFont(fontDisplay, 'bold');
      pdf.setFontSize(14);
      setTextColor(colorPrimary);
      pdf.text(business.name, textX, y, { align: textAlign });

      y += 4.5;
      pdf.setFont(fontSans, 'normal');
      pdf.setFontSize(7.5);
      setTextColor(colorTextMuted);
      const bizLines = [
        business.address,
        [business.city, business.state, business.zipCode, business.country].filter(Boolean).join(', '),
        business.email ? `Email: ${business.email}` : '',
        business.phone ? `Phone: ${business.phone}` : '',
        business.taxId ? `GSTIN/Tax ID: ${business.taxId}` : '',
      ].filter(Boolean);

      bizLines.forEach((line) => {
        pdf.text(line, textX, y, { align: textAlign });
        y += 3.4;
      });

      // Metadata on the opposite side
      const metaX = alignRight ? dims.marginX : dims.width - dims.marginX;
      const metaAlign = alignRight ? 'left' : 'right';
      let metaY = dims.marginTop + 2;

      pdf.setFont(fontDisplay, 'bold');
      pdf.setFontSize(20);
      setTextColor(colorPrimary);
      pdf.text(model.documentTypeName, metaX, metaY, { align: metaAlign });

      metaY += 6;
      pdf.setFont(fontMono, 'bold');
      pdf.setFontSize(9);
      setTextColor(colorTextDark);
      pdf.text(`#${model.documentNumber}`, metaX, metaY, { align: metaAlign });

      metaY += 5;
      pdf.setFont(fontSans, 'normal');
      pdf.setFontSize(7.5);
      setTextColor(colorTextMuted);
      pdf.text(`Date: ${model.createdAt}`, metaX, metaY, { align: metaAlign });
      if (model.dueDate) {
        pdf.text(`Due Date: ${model.dueDate}`, metaX, metaY + 3.5, { align: metaAlign });
      }

      y = Math.max(y + 2, metaY + 12);
    }

    // ===== 3. CLIENT & BILLING INFORMATION BOX =====
    y += 2;
    setDrawColor(colorBorder);
    setFillColor([249, 250, 251]);
    pdf.rect(dims.marginX, y, dims.contentWidth, 27, 'FD');

    // Billed To Column
    pdf.setFont(fontSans, 'bold');
    pdf.setFontSize(7);
    setTextColor(colorTextMuted);
    pdf.text('BILLED TO', dims.marginX + 4, y + 4.5);

    pdf.setFont(fontSans, 'bold');
    pdf.setFontSize(8.5);
    setTextColor(colorPrimary);
    pdf.text(client.name, dims.marginX + 4, y + 8.5);

    pdf.setFont(fontSans, 'normal');
    pdf.setFontSize(7);
    setTextColor(colorTextDark);
    const clientDetails = [
      client.address,
      [client.city, client.state, client.zipCode, client.country].filter(Boolean).join(', '),
      client.email ? `Email: ${client.email}` : '',
      client.phone ? `Phone: ${client.phone}` : '',
      client.taxId ? `GSTIN: ${client.taxId}` : '',
    ].filter(Boolean);

    clientDetails.slice(0, 3).forEach((line, i) => {
      pdf.text(line, dims.marginX + 4, y + 12.5 + i * 3.3);
    });

    // Payment & Status details column
    const col2X = dims.width / 2 + 5;
    pdf.setFont(fontSans, 'bold');
    pdf.setFontSize(7);
    setTextColor(colorTextMuted);
    pdf.text('PAYMENT & TRANSACTION DETAILS', col2X, y + 4.5);

    pdf.setFont(fontSans, 'normal');
    pdf.setFontSize(7.2);
    setTextColor(colorTextDark);
    pdf.text(`Currency: ${model.currency} (${model.currencySymbol})`, col2X, y + 8.5);
    pdf.text(`Status: ${model.status.toUpperCase()}`, col2X, y + 12);

    if (payment.bankDetails) {
      pdf.setFont(fontMono, 'normal');
      pdf.setFontSize(6.5);
      setTextColor(colorTextMuted);
      pdf.text(payment.bankDetails, col2X, y + 16, { maxWidth: dims.contentWidth / 2 - 8 });
    }

    y += 32;

    // ===== 4. LINE ITEMS TABLE =====
    const hasDiscount = items.some((i) => i.discount > 0);
    const hasTax = items.some((i) => i.taxRate > 0);

    const colAmtW = 25;
    const colTaxW = hasTax ? 16 : 0;
    const colDiscW = hasDiscount ? 20 : 0;
    const colPriceW = 22;
    const colQtyW = 14;
    const colDescW = dims.contentWidth - colAmtW - colTaxW - colDiscW - colPriceW - colQtyW;

    const xDesc = dims.marginX;
    const xQty = xDesc + colDescW;
    const xPrice = xQty + colQtyW;
    const xDisc = xPrice + colPriceW;
    const xTax = xDisc + colDiscW;
    const xAmt = dims.width - dims.marginX;

    const renderTableHeader = (currentY: number) => {
      setFillColor(tableHeaderBg);
      pdf.rect(dims.marginX, currentY, dims.contentWidth, 7.5, 'F');

      pdf.setFont(fontSans, 'bold');
      pdf.setFontSize(7.5);
      setTextColor(tableHeaderTextColor);
      const itemHeader =
        template.id === 'elegantCorporate' || template.id === 'corporate' || template.id === 'corporateBlue'
          ? 'Product Description'
          : 'ITEM & DESCRIPTION';
      pdf.text(itemHeader, xDesc + 2, currentY + 4.8);
      pdf.text('QTY', xQty + colQtyW / 2, currentY + 4.8, { align: 'center' });
      pdf.text('PRICE', xPrice + colPriceW, currentY + 4.8, { align: 'right' });
      if (hasDiscount) {
        pdf.text('DISCOUNT', xDisc + colDiscW, currentY + 4.8, { align: 'right' });
      }
      if (hasTax) {
        pdf.text('TAX', xTax + colTaxW / 2, currentY + 4.8, { align: 'center' });
      }
      pdf.text('AMOUNT', xAmt - 2, currentY + 4.8, { align: 'right' });
    };

    renderTableHeader(y);
    y += 7.5;

    // Draw each line item with dynamic multi-line calculation and pagination
    items.forEach((item, index) => {
      const pName = item.productName || item.description || 'Item';
      const secondaryDesc = item.productName && item.description ? item.description : '';
      const hsnText = item.hsn ? `HSN: ${item.hsn}` : '';

      pdf.setFont(fontSans, 'bold');
      pdf.setFontSize(7.5);
      const nameLines = pdf.splitTextToSize(pName, colDescW - 4);

      pdf.setFont(fontSans, 'normal');
      pdf.setFontSize(6.5);
      const descLines = secondaryDesc ? pdf.splitTextToSize(secondaryDesc, colDescW - 4) : [];

      const textBlockHeight = (nameLines.length * 3.5) + (descLines.length * 3.0) + (hsnText ? 3.0 : 0);
      const calculatedRowHeight = Math.max(template.spacing.tableRowHeight || 8, textBlockHeight + 3.5);

      // Check if row overflows page bottom
      if (y + calculatedRowHeight > dims.height - dims.marginBottom - 20) {
        pdf.addPage();
        drawPageDecorations();
        y = dims.marginTop + 4;
        renderTableHeader(y);
        y += 7.5;
      }

      // Zebra background
      if (template.table.showZebra && index % 2 === 1) {
        setFillColor(colorZebra);
        pdf.rect(dims.marginX, y, dims.contentWidth, calculatedRowHeight, 'F');
      }

      // Horizontal separator line
      if (template.table.borderStyle === 'horizontal' || template.table.borderStyle === 'grid') {
        setDrawColor(colorBorder);
        pdf.setLineWidth(0.2);
        pdf.line(dims.marginX, y + calculatedRowHeight, dims.width - dims.marginX, y + calculatedRowHeight);
      }

      // Vertical grid lines
      if (template.table.borderStyle === 'grid') {
        setDrawColor(colorBorder);
        pdf.line(xQty, y, xQty, y + calculatedRowHeight);
        pdf.line(xPrice, y, xPrice, y + calculatedRowHeight);
        if (hasDiscount) pdf.line(xDisc, y, xDisc, y + calculatedRowHeight);
        if (hasTax) pdf.line(xTax, y, xTax, y + calculatedRowHeight);
        pdf.line(xAmt - colAmtW, y, xAmt - colAmtW, y + calculatedRowHeight);
      }

      // Print Description text
      let descY = y + 4;
      pdf.setFont(fontSans, 'bold');
      pdf.setFontSize(7.5);
      setTextColor(colorTextDark);
      nameLines.forEach((line: string) => {
        pdf.text(line, xDesc + 2, descY);
        descY += 3.5;
      });

      if (descLines.length > 0) {
        pdf.setFont(fontSans, 'normal');
        pdf.setFontSize(6.5);
        setTextColor(colorTextMuted);
        descLines.forEach((line: string) => {
          pdf.text(line, xDesc + 2, descY);
          descY += 3.0;
        });
      }

      if (hsnText) {
        pdf.setFont(fontMono, 'normal');
        pdf.setFontSize(6.0);
        setTextColor(colorTextMuted);
        pdf.text(hsnText, xDesc + 2, descY);
      }

      // Numeric Columns
      pdf.setFont(fontSans, 'normal');
      pdf.setFontSize(7.5);
      setTextColor(colorTextDark);
      pdf.text(`${item.quantity} ${item.unit || ''}`, xQty + colQtyW / 2, y + 4.8, { align: 'center' });
      pdf.text(
        model.currencySymbol + item.price.toLocaleString('en-US', { minimumFractionDigits: 2 }),
        xPrice + colPriceW - 2,
        y + 4.8,
        { align: 'right' }
      );

      if (hasDiscount) {
        if (item.discount > 0) {
          const discText =
            item.discountType === 'flat'
              ? `-${model.currencySymbol}${item.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              : `-${item.discount}%`;
          setTextColor([225, 29, 72]); // Rose-600 for discount
          pdf.text(discText, xDisc + colDiscW - 2, y + 4.8, { align: 'right' });
          setTextColor(colorTextDark);
        } else {
          pdf.text('-', xDisc + colDiscW - 2, y + 4.8, { align: 'right' });
        }
      }

      if (hasTax) {
        pdf.text(item.taxRate > 0 ? `${item.taxRate}%` : '-', xTax + colTaxW / 2, y + 4.8, { align: 'center' });
      }

      pdf.setFont(fontSans, 'bold');
      pdf.text(
        model.currencySymbol + item.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }),
        xAmt - 2,
        y + 4.8,
        { align: 'right' }
      );

      y += calculatedRowHeight;
    });

    // ===== 5. BOTTOM SUMMARY, TOTALS, QR CODES & SIGNATURE =====
    y += 4;

    // Check if bottom sections will comfortably fit on current page; otherwise, paginate cleanly
    const requiredBottomHeight = 65;
    if (y + requiredBottomHeight > dims.height - dims.marginBottom) {
      pdf.addPage();
      drawPageDecorations();
      y = dims.marginTop + 4;
    }

    const boxWidth = 64;
    const boxX = dims.width - dims.marginX - boxWidth;

    // Calculations Box (Right Column)
    setFillColor(colorTotalBg);
    setDrawColor(colorBorder);
    pdf.rect(boxX, y, boxWidth, 34, 'FD');

    pdf.setFont(fontSans, 'normal');
    pdf.setFontSize(7.5);
    setTextColor(colorTextMuted);
    pdf.text('Subtotal:', boxX + 3, y + 5.5);
    setTextColor(colorTextDark);
    pdf.text(totals.formattedSubtotal, dims.width - dims.marginX - 3, y + 5.5, { align: 'right' });

    let runningY = y + 9.5;
    if (totals.discountTotal > 0) {
      pdf.setFont(fontSans, 'normal');
      setTextColor(colorTextMuted);
      pdf.text('Discount:', boxX + 3, runningY);
      pdf.setTextColor(225, 29, 72);
      pdf.text(`-${totals.formattedDiscountTotal}`, dims.width - dims.marginX - 3, runningY, { align: 'right' });
      runningY += 4.0;
    }

    if (totals.taxTotal > 0) {
      pdf.setFont(fontSans, 'normal');
      setTextColor(colorTextMuted);
      pdf.text('Tax (GST):', boxX + 3, runningY);
      setTextColor(colorTextDark);
      pdf.text(`+${totals.formattedTaxTotal}`, dims.width - dims.marginX - 3, runningY, { align: 'right' });
      runningY += 4.0;
    }

    // Divider before total
    setDrawColor(colorBorder);
    pdf.line(boxX, runningY + 1.0, boxX + boxWidth, runningY + 1.0);

    // Total Due
    runningY += 5.0;
    pdf.setFont(fontSans, 'bold');
    pdf.setFontSize(8.5);
    setTextColor(colorTotalText);
    pdf.text('Total Due:', boxX + 3, runningY);
    pdf.text(totals.formattedTotal, dims.width - dims.marginX - 3, runningY, { align: 'right' });

    // Paid amount & Balance due if present
    if (totals.paidAmount > 0) {
      runningY += 4.0;
      pdf.setFont(fontSans, 'bold');
      pdf.setFontSize(7.0);
      pdf.setTextColor(22, 163, 74); // Green
      pdf.text('Amount Paid:', boxX + 3, runningY);
      pdf.text(totals.formattedPaidAmount, dims.width - dims.marginX - 3, runningY, { align: 'right' });
    }

    if (totals.balanceDue > 0 && totals.paidAmount > 0) {
      runningY += 3.5;
      pdf.setFont(fontSans, 'bold');
      pdf.setFontSize(7.0);
      setTextColor(colorTextDark);
      pdf.text('Balance Due:', boxX + 3, runningY);
      pdf.text(totals.formattedBalanceDue, dims.width - dims.marginX - 3, runningY, { align: 'right' });
    }

    // Left Column: Payment QR & GST Breakdown
    let leftY = y;
    if (paymentQrDataUrl) {
      try {
        pdf.addImage(paymentQrDataUrl, 'PNG', dims.marginX, leftY, 20, 20);

        pdf.setFont(fontSans, 'bold');
        pdf.setFontSize(7.0);
        setTextColor(colorTextMuted);
        pdf.text('SCAN TO PAY', dims.marginX + 23, leftY + 4);

        pdf.setFont(fontSans, 'normal');
        pdf.setFontSize(6.5);
        setTextColor(colorTextDark);
        pdf.text('UPI / Direct Transfer QR', dims.marginX + 23, leftY + 8);
        pdf.setFontSize(6.0);
        setTextColor(colorTextMuted);
        pdf.text('Scan from any banking app to settle this bill.', dims.marginX + 23, leftY + 12, { maxWidth: 48 });
      } catch (e) {
        console.warn('Could not draw payment QR code on PDF:', e);
      }
      leftY += 22;
    }

    // GST Breakdown details
    if (template.gst.showBreakdown && gstBreakdown.length > 0) {
      pdf.setFont(fontSans, 'bold');
      pdf.setFontSize(6.5);
      setTextColor(colorTextMuted);
      pdf.text('TAX RATE (GST) BREAKDOWN', dims.marginX, leftY + 3);

      pdf.setFont(fontSans, 'normal');
      pdf.setFontSize(6.0);
      let gstLineY = leftY + 6.5;
      gstBreakdown.forEach((gst) => {
        pdf.text(
          `GST @ ${gst.rate}% (Taxable Base: ${model.currencySymbol}${gst.baseAmount.toFixed(2)})`,
          dims.marginX,
          gstLineY
        );
        pdf.text(`+${model.currencySymbol}${gst.taxAmount.toFixed(2)}`, dims.marginX + 60, gstLineY, { align: 'right' });
        gstLineY += 3.0;
      });
      leftY = gstLineY;
    }

    y = Math.max(y + 38, leftY + 4);

    // Business notes & payment instructions
    if (payment.instructions || model.notes) {
      const combinedNotes = [
        payment.instructions ? `Payment Instructions:\n${payment.instructions}` : '',
        model.notes ? `Notes:\n${model.notes}` : '',
      ].filter(Boolean).join('\n\n');

      pdf.setFont(fontSans, 'bold');
      pdf.setFontSize(6.5);
      setTextColor(colorTextMuted);
      pdf.text('NOTES & INSTRUCTIONS', dims.marginX, y);

      pdf.setFont(fontSans, 'normal');
      pdf.setFontSize(6.2);
      setTextColor(colorTextDark);
      const splitNotes = pdf.splitTextToSize(combinedNotes, dims.contentWidth - 65);
      pdf.text(splitNotes, dims.marginX, y + 3.5);
      y += (splitNotes.length * 3.0) + 6;
    }

    // Document Authenticity Verification Block (with portal verification QR)
    if (portalQrDataUrl && model.portalUrl) {
      const verifyY = y;
      setFillColor([250, 250, 250]);
      setDrawColor(colorBorder);
      pdf.rect(dims.marginX, verifyY, dims.contentWidth - 55, 17, 'FD');

      try {
        pdf.addImage(portalQrDataUrl, 'PNG', dims.marginX + 2, verifyY + 1.2, 14.5, 14.5);
      } catch (e) {
        console.warn('Could not draw portal verification QR:', e);
      }

      pdf.setFont(fontSans, 'bold');
      pdf.setFontSize(6.5);
      setTextColor(colorPrimary);
      pdf.text('SECURED DOCUMENT VERIFICATION & CLIENT PORTAL', dims.marginX + 18.5, verifyY + 4.2);

      pdf.setFont(fontSans, 'normal');
      pdf.setFontSize(5.5);
      setTextColor(colorTextMuted);
      pdf.text(
        'Digitally signed document. Scan QR or visit portal to verify authenticity and payment status.',
        dims.marginX + 18.5,
        verifyY + 7.8,
        { maxWidth: dims.contentWidth - 78 }
      );

      pdf.setFont(fontMono, 'normal');
      pdf.setFontSize(5.5);
      setTextColor(colorTextDark);
      pdf.text(model.portalUrl, dims.marginX + 18.5, verifyY + 13.5, { maxWidth: dims.contentWidth - 78 });
    }

    // Authorized Signature Block (Right Column)
    if (signature.hasSignature) {
      const sigX = dims.width - dims.marginX - 45;
      let sigY = y;

      pdf.setFont(fontSans, 'bold');
      pdf.setFontSize(6.5);
      setTextColor(colorTextMuted);
      pdf.text('AUTHORIZED SIGNATORY', sigX + 22.5, sigY, { align: 'center' });

      sigY += 2;
      if (signatureDataUrl) {
        try {
          pdf.addImage(signatureDataUrl, 'PNG', sigX + 8, sigY, 28, 10);
        } catch (e) {
          console.warn('Error drawing signature into PDF:', e);
        }
      }

      sigY += 11;
      if (template.signature.showLine) {
        setDrawColor(colorTextMuted);
        pdf.setLineWidth(0.15);
        pdf.line(sigX, sigY, sigX + 45, sigY);
      }

      pdf.setFont(fontSans, 'bold');
      pdf.setFontSize(7.5);
      setTextColor(colorTextDark);
      pdf.text(signature.signerName || business.name, sigX + 22.5, sigY + 3.5, { align: 'center' });

      pdf.setFont(fontSans, 'normal');
      pdf.setFontSize(6.0);
      setTextColor(colorTextMuted);
      pdf.text(signature.signerTitle || 'Authorized Signatory', sigX + 22.5, sigY + 6.5, { align: 'center' });
    }

    // ===== 6. GREEN PAID STAMP ON PAGE 1 =====
    if (model.isPaid) {
      pdf.setPage(1);
      const stampW = 34;
      const stampH = 12;
      const stampX = dims.width - dims.marginX - stampW;
      const stampY = dims.marginTop + 2;

      // Soft green background and crisp emerald border
      setFillColor([240, 253, 244]); // emerald-50
      setDrawColor([22, 163, 74]); // emerald-600
      pdf.setLineWidth(0.6);
      pdf.roundedRect(stampX, stampY, stampW, stampH, 2, 2, 'FD');

      // Prominent green PAID text
      setTextColor([22, 163, 74]);
      pdf.setFont(fontMono, 'bold');
      pdf.setFontSize(11);
      pdf.text('PAID', stampX + stampW / 2, stampY + 5.5, { align: 'center' });

      // Subtitle / Date
      pdf.setFont(fontSans, 'normal');
      pdf.setFontSize(4.5);
      const paidDate = model.paidAt
        ? new Date(model.paidAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'SETTLED & VERIFIED';
      pdf.text(paidDate.toUpperCase(), stampX + stampW / 2, stampY + 9.5, { align: 'center' });
    }

    // ===== 7. MULTI-PAGE FOOTER & PAGE NUMBERING =====
    const totalPages = pdf.getNumberOfPages();
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      pdf.setPage(pageNum);

      if (template.decorations.bottomBanner) {
        setFillColor(colorHeaderBg);
        pdf.rect(0, dims.height - 3.5, dims.width, 3.5, 'F');
      }

      pdf.setFont(fontSans, 'normal');
      pdf.setFontSize(6.5);
      setTextColor(colorTextMuted);
      if (model.terms) {
        pdf.text(model.terms, dims.width / 2, dims.height - 11, { align: 'center', maxWidth: dims.contentWidth });
      }

      pdf.setFont(fontMono, 'normal');
      pdf.setFontSize(5.5);
      pdf.text(
        `Finora OS Document Engine • Page ${pageNum} of ${totalPages}`,
        dims.width / 2,
        dims.height - 7,
        { align: 'center' }
      );
    }

    // Output final PDF Blob
    return pdf.output('blob');
  }
}

export default PDFRenderer;

