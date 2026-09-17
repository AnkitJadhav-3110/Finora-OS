import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { RenderModel } from '../types/renderModel';
import { getFontFamilyCss } from '../utils/typography';
import { getDensityPadding } from '../utils/spacing';

interface PreviewRendererProps {
  model: RenderModel;
}

export function PreviewRenderer({ model }: PreviewRendererProps) {
  const { template, business, client, items, totals, gstBreakdown, payment, signature } = model;
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [portalQrCodeData, setPortalQrCodeData] = useState<string>('');

  useEffect(() => {
    if (payment.hasQrCode && payment.qrCodeDataUrl) {
      QRCode.toDataURL(payment.qrCodeDataUrl, { width: 120, margin: 1 })
        .then(setQrCodeData)
        .catch(console.error);
    } else {
      setQrCodeData('');
    }
  }, [payment.hasQrCode, payment.qrCodeDataUrl]);

  useEffect(() => {
    if (model.portalUrl) {
      QRCode.toDataURL(model.portalUrl, { width: 120, margin: 1 })
        .then(setPortalQrCodeData)
        .catch(console.error);
    } else {
      setPortalQrCodeData('');
    }
  }, [model.portalUrl]);

  // Styling helper classes
  const fontStyle = {
    fontFamily: getFontFamilyCss(template.fonts.sans),
  };

  const displayFontStyle = {
    fontFamily: getFontFamilyCss(template.fonts.display),
  };

  const monoFontStyle = {
    fontFamily: getFontFamilyCss(template.fonts.mono),
  };

  // Border style class for table
  const getTableBorderClass = () => {
    switch (template.table.borderStyle) {
      case 'grid': return 'border border-slate-200';
      case 'horizontal': return 'border-b border-slate-200';
      case 'none':
      default:
        return 'border-none';
    }
  };

  // Density padding for table items
  const tableDensity = getDensityPadding(template.spacing.density);

  return (
    <div
      id={`document-preview-${model.documentId}`}
      className="w-full relative overflow-hidden transition-all duration-300 shadow-xl bg-white rounded-lg border border-slate-200 text-slate-800"
      style={{
        ...fontStyle,
        backgroundColor: template.colors.background,
        color: template.colors.textDark,
      }}
    >
      {/* Decorative Top Banner */}
      {template.decorations.topBanner && (
        <div
          className="h-3 w-full"
          style={{
            background: template.colors.headerBg?.includes('gradient')
              ? template.colors.headerBg
              : template.colors.primary,
          }}
        />
      )}

      {/* Watermark Overlay */}
      {template.watermark.text && (
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center select-none rotate-12 z-0"
          style={{
            color: template.watermark.color,
            opacity: template.watermark.opacity,
            fontSize: '6rem',
            fontWeight: 'bold',
          }}
        >
          {template.watermark.text}
        </div>
      )}

      {/* PAID Badge stamp */}
      {model.isPaid && (
        <div className="absolute top-24 right-8 transform rotate-12 z-10 select-none">
          <div
            className="border-4 px-6 py-2 rounded-lg text-2xl font-black tracking-widest uppercase opacity-80 animate-fade-in"
            style={{
              borderColor: '#22c55e',
              color: '#22c55e',
              backgroundColor: 'rgba(220, 252, 231, 0.4)',
            }}
          >
            PAID
          </div>
        </div>
      )}

      {/* Main Layout Container */}
      <div className="p-8 md:p-12 relative z-10 flex flex-col min-h-[900px] justify-between">
        
        {/* HEADER SECTION */}
        <header className="mb-8">
          {/* HEADER LAYOUT: BANNER */}
          {template.header.layout === 'banner' && (
            <div
              className="p-6 md:p-8 rounded-xl text-white mb-6"
              style={{
                background: template.colors.headerBg?.includes('gradient')
                  ? template.colors.headerBg
                  : template.colors.headerBg || template.colors.primary,
                color: template.colors.headerText || '#ffffff',
              }}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  {business.logo && (
                    <img
                      src={business.logo}
                      alt={business.name}
                      className="h-12 w-auto mb-3 rounded object-contain"
                      style={{ maxHeight: `${template.logo.maxHeight * 2}px` }}
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <h1 className="text-2xl font-bold tracking-tight" style={displayFontStyle}>
                    {business.name}
                  </h1>
                  <p className="text-xs opacity-80 mt-1 max-w-sm">{business.address}</p>
                  <p className="text-xs opacity-80">
                    {[business.city, business.state, business.country].filter(Boolean).join(', ')}
                  </p>
                  {business.taxId && <p className="text-xs opacity-80 mt-1">GSTIN/Tax ID: {business.taxId}</p>}
                </div>
                <div className="text-left md:text-right">
                  <h2 className="text-4xl font-extrabold tracking-tight uppercase" style={displayFontStyle}>
                    {model.documentTypeName}
                  </h2>
                  <p className="text-lg font-mono opacity-90 mt-1">#{model.documentNumber}</p>
                  <div className="mt-4 grid grid-cols-2 md:block gap-2 text-xs opacity-90">
                    <div>Date: {model.createdAt}</div>
                    {model.dueDate && <div className="md:mt-1">Due Date: {model.dueDate}</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HEADER LAYOUT: SPLIT / MODERN */}
          {['split', 'modern'].includes(template.header.layout) && (
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b pb-6" style={{ borderColor: template.colors.border }}>
              <div>
                {business.logo && (
                  <img
                    src={business.logo}
                    alt={business.name}
                    className="h-12 w-auto mb-4 rounded object-contain"
                    style={{ maxHeight: `${template.logo.maxHeight * 2.5}px` }}
                    referrerPolicy="no-referrer"
                  />
                )}
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: template.colors.primary, ...displayFontStyle }}>
                  {business.name}
                </h1>
                <div className="text-sm mt-2 space-y-1" style={{ color: template.colors.textMuted }}>
                  <p>{business.address}</p>
                  <p>{[business.city, business.state, business.country].filter(Boolean).join(', ')}</p>
                  <p>Email: {business.email}</p>
                  {business.phone && <p>Phone: {business.phone}</p>}
                  {business.taxId && <p className="font-semibold text-slate-700 mt-1">Tax ID: {business.taxId}</p>}
                </div>
              </div>

              <div className="text-left md:text-right flex flex-col md:items-end justify-between self-stretch">
                <div>
                  <h2 className="text-4xl font-black tracking-tight" style={{ color: template.colors.primary, ...displayFontStyle }}>
                    {model.documentTypeName}
                  </h2>
                  <p className="text-lg font-mono font-bold text-slate-600 mt-1">#{model.documentNumber}</p>
                </div>
                <div className="text-sm space-y-1 text-slate-600 mt-4 md:mt-0">
                  <p><span className="font-medium">Date:</span> {model.createdAt}</p>
                  {model.dueDate && <p><span className="font-medium">Due Date:</span> {model.dueDate}</p>}
                </div>
              </div>
            </div>
          )}

          {/* HEADER LAYOUT: LEFT / RIGHT ALIGNED */}
          {!['banner', 'split', 'modern'].includes(template.header.layout) && (
            <div className={`flex flex-col gap-6 border-b pb-6 ${template.header.layout === 'right' ? 'items-end text-right' : 'items-start text-left'}`} style={{ borderColor: template.colors.border }}>
              {business.logo && (
                <img
                  src={business.logo}
                  alt={business.name}
                  className="h-12 w-auto rounded object-contain"
                  style={{ maxHeight: `${template.logo.maxHeight * 2.5}px` }}
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="w-full flex flex-col md:flex-row justify-between gap-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight" style={{ color: template.colors.primary, ...displayFontStyle }}>
                    {business.name}
                  </h1>
                  <div className="text-sm mt-2 text-slate-500 space-y-0.5">
                    <p>{business.address}</p>
                    <p>{[business.city, business.state, business.country].filter(Boolean).join(', ')}</p>
                    <p>{business.email}</p>
                    {business.taxId && <p>Tax ID: {business.taxId}</p>}
                  </div>
                </div>
                <div className="md:text-right">
                  <h2 className="text-3xl font-extrabold tracking-tight uppercase" style={{ color: template.colors.primary }}>
                    {model.documentTypeName}
                  </h2>
                  <p className="text-base font-mono font-bold mt-1">#{model.documentNumber}</p>
                  <div className="text-sm text-slate-500 mt-2 space-y-0.5">
                    <p>Issue Date: {model.createdAt}</p>
                    {model.dueDate && <p>Due Date: {model.dueDate}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* CLIENT / BILLING DETAILS */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50 p-6 rounded-xl border border-slate-100" style={{ borderColor: template.colors.border }}>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Billed To</h3>
              <p className="text-base font-bold" style={{ color: template.colors.primary }}>{client.name}</p>
              <div className="text-sm mt-1 text-slate-600 space-y-1">
                {client.address && <p>{client.address}</p>}
                {(client.city || client.country) && (
                  <p>{[client.city, client.state, client.country].filter(Boolean).join(', ')}</p>
                )}
                {client.email && <p>{client.email}</p>}
                {client.phone && <p>{client.phone}</p>}
                {client.taxId && <p className="font-semibold text-slate-700 mt-1">Tax ID: {client.taxId}</p>}
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Payment Details</h3>
                <div className="text-sm text-slate-600 space-y-1">
                  <p><span className="font-medium text-slate-500">Currency:</span> {model.currency} ({model.currencySymbol})</p>
                  <p><span className="font-medium text-slate-500">Status:</span> 
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                      model.status === 'paid' ? 'bg-green-100 text-green-800' :
                      model.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                      model.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {model.status}
                    </span>
                  </p>
                </div>
              </div>
              {payment.bankDetails && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Bank Transfer Instructions</p>
                  <p className="text-xs font-mono mt-1 text-slate-600">{payment.bankDetails}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ITEMS TABLE */}
        <section className="mb-8 flex-grow">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr
                  className="text-left text-xs font-bold uppercase tracking-wider rounded-t-lg"
                  style={{
                    backgroundColor: template.table.headerBg || template.colors.primary,
                    color: template.table.headerTextColor || '#ffffff',
                  }}
                >
                  <th className={`rounded-l-lg ${tableDensity.px} ${tableDensity.py}`}>Item & Description</th>
                  <th className={`text-center ${tableDensity.px} ${tableDensity.py}`}>Qty</th>
                  <th className={`text-right ${tableDensity.px} ${tableDensity.py}`}>Price</th>
                  {items.some(i => i.discount > 0) && (
                    <th className={`text-right ${tableDensity.px} ${tableDensity.py}`}>Discount</th>
                  )}
                  {items.some(i => i.taxRate > 0) && (
                    <th className={`text-center ${tableDensity.px} ${tableDensity.py}`}>Tax</th>
                  )}
                  <th className={`rounded-r-lg text-right ${tableDensity.px} ${tableDensity.py}`}>Amount</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {items.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className={getTableBorderClass()}
                    style={{
                      backgroundColor: template.table.showZebra && index % 2 === 1
                        ? template.colors.zebra
                        : 'transparent',
                      borderBottomColor: template.colors.border,
                    }}
                  >
                    <td className={`${tableDensity.px} ${tableDensity.py} max-w-sm`}>
                      <p className="font-bold text-slate-900">{item.productName || item.description}</p>
                      {item.productName && item.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                      )}
                      {item.hsn && <p className="text-[10px] font-mono text-slate-400 mt-0.5">HSN: {item.hsn}</p>}
                    </td>
                    <td className={`text-center font-medium ${tableDensity.px} ${tableDensity.py}`}>
                      {item.quantity} {item.unit || ''}
                    </td>
                    <td className={`text-right font-mono ${tableDensity.px} ${tableDensity.py}`}>
                      {model.currencySymbol}{item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    {items.some(i => i.discount > 0) && (
                      <td className={`text-right text-rose-600 font-mono ${tableDensity.px} ${tableDensity.py}`}>
                        {item.discount > 0 ? (
                          item.discountType === 'flat' ? (
                            `-${model.currencySymbol}${item.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                          ) : (
                            `-${item.discount}%`
                          )
                        ) : '-'}
                      </td>
                    )}
                    {items.some(i => i.taxRate > 0) && (
                      <td className={`text-center text-slate-500 font-mono ${tableDensity.px} ${tableDensity.py}`}>
                        {item.taxRate > 0 ? `${item.taxRate}%` : '-'}
                      </td>
                    )}
                    <td className={`text-right font-bold font-mono ${tableDensity.px} ${tableDensity.py}`}>
                      {model.currencySymbol}{item.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* BOTTOM SUMMARY & SIGNATURES */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 border-t pt-8" style={{ borderTopColor: template.colors.border }}>
          {/* Left Column: QR Code & Bank instructions */}
          <div className="md:col-span-7 space-y-6">
            {qrCodeData && (
              <div className={`flex flex-col md:flex-row gap-4 items-start md:items-center p-4 rounded-xl border bg-slate-50/30 ${template.payment.border ? 'border-amber-200' : 'border-slate-100'}`} style={{ borderColor: template.colors.border }}>
                <img src={qrCodeData} alt="Payment QR Code" className="w-24 h-24 rounded border border-slate-200 bg-white shadow-sm" />
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scan to Pay</h4>
                  <p className="text-sm font-semibold text-slate-700 mt-1">UPI / Direct Payment QR</p>
                  <p className="text-xs text-slate-500 mt-1">Scan using any banking app or GPay/PhonePe to settle this bill instantly.</p>
                </div>
              </div>
            )}

            {totals.balanceDue > 0 && payment.instructions && (
              <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-100 text-xs text-slate-500">
                <p className="font-semibold text-slate-600 mb-1">Notes & Payment Instructions:</p>
                <p className="whitespace-pre-line leading-relaxed">{payment.instructions}</p>
              </div>
            )}

            {model.notes && (
              <div className="text-xs text-slate-500">
                <p className="font-semibold text-slate-600 mb-1">Notes:</p>
                <p className="leading-relaxed">{model.notes}</p>
              </div>
            )}

            {portalQrCodeData && (
              <div 
                className="flex flex-col md:flex-row gap-4 items-start md:items-center p-4 rounded-xl border bg-slate-50/25" 
                style={{ borderColor: template.colors.border }}
              >
                <div className="bg-white p-1 rounded border border-slate-200 shrink-0">
                  <img src={portalQrCodeData} alt="Verification QR Code" className="w-16 h-16" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <span>🔒 SECURED DOCUMENT VERIFICATION</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Digitally signed document. Scan QR or visit link to verify authenticity, view live payment status, or download secure copies.
                  </p>
                  <a 
                    href={model.portalUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[11px] font-mono text-indigo-600 hover:underline block break-all select-all font-medium"
                  >
                    {model.portalUrl}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Calculations Breakdown */}
          <div className="md:col-span-5 space-y-4">
            <div
              className="p-6 rounded-2xl border"
              style={{
                backgroundColor: template.colors.totalBg || '#fafafa',
                borderColor: template.colors.border,
              }}
            >
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono">{totals.formattedSubtotal}</span>
                </div>
                
                {totals.discountTotal > 0 && (
                  <div className="flex justify-between text-rose-500 font-medium">
                    <span>Discount</span>
                    <span className="font-mono">-{totals.formattedDiscountTotal}</span>
                  </div>
                )}

                {totals.taxTotal > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Tax (GST)</span>
                    <span className="font-mono">+{totals.formattedTaxTotal}</span>
                  </div>
                )}

                {/* GST Breakdown */}
                {template.gst.showBreakdown && gstBreakdown.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-400">
                    {gstBreakdown.map((gst) => (
                      <div key={gst.rate} className="flex justify-between">
                        <span>GST @ {gst.rate}%</span>
                        <span className="font-mono">{model.currencySymbol}{gst.taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-slate-200 my-2" />

                <div className="flex justify-between text-base font-bold" style={{ color: template.colors.totalText || template.colors.primary }}>
                  <span>Total Due</span>
                  <span className="font-mono text-lg">{totals.formattedTotal}</span>
                </div>

                {totals.paidAmount > 0 && (
                  <div className="flex justify-between text-xs text-green-600 font-semibold pt-1">
                    <span>Amount Paid</span>
                    <span className="font-mono">{totals.formattedPaidAmount}</span>
                  </div>
                )}

                {totals.balanceDue > 0 && (
                  <div className="flex justify-between text-xs text-slate-600 font-semibold pt-1">
                    <span>Balance Due</span>
                    <span className="font-mono">{totals.formattedBalanceDue}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Signature Block */}
            {signature.hasSignature && (
              <div className="pt-6 flex flex-col items-end text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Authorized Signature</p>
                {signature.signatureDataUrl && (
                  <img
                    src={signature.signatureDataUrl}
                    alt="Signature"
                    className="h-12 w-auto object-contain mb-1 mix-blend-multiply"
                    style={{ maxHeight: `${template.signature.height * 2.5}px` }}
                    referrerPolicy="no-referrer"
                  />
                )}
                {template.signature.showLine && <div className="w-40 border-t border-slate-300 my-1" />}
                <p className="text-sm font-bold text-slate-800">{signature.signerName}</p>
                <p className="text-xs text-slate-500">{signature.signerTitle}</p>
              </div>
            )}
          </div>
        </section>

        {/* FOOTER SECTION */}
        <footer className="mt-12 border-t pt-6 text-center text-xs text-slate-400" style={{ borderTopColor: template.colors.border }}>
          <p className="leading-relaxed">{model.terms}</p>
          <p className="font-mono text-[10px] mt-4 text-slate-300">
            Finora OS Document Engine • Page 1 of 1
          </p>
        </footer>
      </div>

      {/* Decorative Bottom Banner */}
      {template.decorations.bottomBanner && (
        <div
          className="h-2 w-full mt-auto"
          style={{
            background: template.colors.headerBg?.includes('gradient')
              ? template.colors.headerBg
              : template.colors.primary,
          }}
        />
      )}
    </div>
  );
}
export default PreviewRenderer;
