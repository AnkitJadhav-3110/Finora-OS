import { DocumentTemplate } from '../../types/template';

export const cleanBusiness: DocumentTemplate = {
  id: 'cleanBusiness',
  name: 'Clean Business',
  category: 'invoice',
  theme: 'business',
  colors: {
    primary: '#059669', // Emerald Green
    secondary: '#047857', // Deep Emerald
    textDark: '#0f172a',
    textLight: '#ffffff',
    textMuted: '#475569',
    border: '#cbd5e1',
    accent: '#10b981', // Emerald accent
    background: '#ffffff',
    zebra: '#f0fdf4', // Mint tint zebra
    headerBg: '#059669',
    headerText: '#ffffff',
    footerBg: '#ffffff',
    footerText: '#047857',
    totalBg: '#ecfdf5',
    totalText: '#065f46',
  },
  fonts: {
    sans: 'Inter',
    mono: 'JetBrains Mono',
    display: 'Plus Jakarta Sans',
  },
  spacing: {
    marginX: 18,
    marginTop: 18,
    marginBottom: 18,
    tableRowHeight: 8,
    density: 'comfortable',
  },
  page: {
    size: 'a4',
    orientation: 'portrait',
    showPageNumbers: true,
  },
  header: {
    layout: 'left',
    logoAlign: 'left',
    showBusinessDetails: true,
    showClientDetails: true,
    accentBar: true,
  },
  footer: {
    layout: 'split',
    borderTop: true,
    showNotes: true,
    showTerms: true,
  },
  table: {
    headerBg: '#059669',
    headerTextColor: '#ffffff',
    borderStyle: 'grid',
    showZebra: true,
    padding: 'compact',
  },
  totals: {
    background: '#ecfdf5',
    border: '#a7f3d0',
    fontStyle: 'bold',
    alignment: 'right',
  },
  gst: {
    format: 'breakdown',
    showBreakdown: true,
  },
  payment: {
    qrSize: 22,
    alignment: 'left',
    border: true,
  },
  signature: {
    showLine: true,
    height: 15,
    align: 'right',
  },
  logo: {
    maxWidth: 32,
    maxHeight: 18,
  },
  background: {
    style: 'solid',
    pattern: 'none',
  },
  watermark: {
    text: '',
    color: '#d1fae5',
    opacity: 0.1,
  },
  decorations: {
    accentBars: true,
    topBanner: true,
    bottomBanner: false,
  },
};
