import { DocumentTemplate } from '../../types/template';

export const executiveDark: DocumentTemplate = {
  id: 'executiveDark',
  name: 'Executive Dark',
  category: 'invoice',
  theme: 'dark',
  colors: {
    primary: '#111827', // Dark charcoal/black
    secondary: '#374151',
    textDark: '#111827',
    textLight: '#ffffff',
    textMuted: '#6b7280',
    border: '#e5e7eb',
    accent: '#4b5563',
    background: '#ffffff',
    zebra: '#f9fafb',
    headerBg: '#111827', // Charcoal header
    headerText: '#ffffff',
    footerBg: '#ffffff',
    footerText: '#374151',
    totalBg: '#f3f4f6',
    totalText: '#111827',
  },
  fonts: {
    sans: 'Inter',
    mono: 'JetBrains Mono',
    display: 'Playfair Display', // Elegant display font
  },
  spacing: {
    marginX: 20,
    marginTop: 20,
    marginBottom: 20,
    tableRowHeight: 8.5,
    density: 'spacious',
  },
  page: {
    size: 'a4',
    orientation: 'portrait',
    showPageNumbers: true,
  },
  header: {
    layout: 'banner',
    logoAlign: 'right',
    showBusinessDetails: true,
    showClientDetails: true,
    accentBar: false,
  },
  footer: {
    layout: 'split',
    borderTop: true,
    showNotes: true,
    showTerms: true,
  },
  table: {
    headerBg: '#111827',
    headerTextColor: '#ffffff',
    borderStyle: 'horizontal',
    showZebra: false,
    padding: 'normal',
  },
  totals: {
    background: '#ffffff',
    border: '#e5e7eb',
    fontStyle: 'serif',
    alignment: 'right',
  },
  gst: {
    format: 'breakdown',
    showBreakdown: true,
  },
  payment: {
    qrSize: 20,
    alignment: 'left',
    border: false,
  },
  signature: {
    showLine: true,
    height: 16,
    align: 'right',
  },
  logo: {
    maxWidth: 30,
    maxHeight: 16,
  },
  background: {
    style: 'none',
    pattern: 'none',
  },
  watermark: {
    text: '',
    color: '#e5e7eb',
    opacity: 0.1,
  },
  decorations: {
    accentBars: false,
    topBanner: true,
    bottomBanner: true,
  },
};
