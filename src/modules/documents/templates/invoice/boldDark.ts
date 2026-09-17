import { DocumentTemplate } from '../../types/template';

export const boldDark: DocumentTemplate = {
  id: 'boldDark',
  name: 'Bold Dark',
  category: 'invoice',
  theme: 'executive',
  colors: {
    primary: '#0f172a', // Deep slate / charcoal
    secondary: '#1e293b',
    textDark: '#0f172a',
    textLight: '#ffffff',
    textMuted: '#64748b',
    border: '#cbd5e1',
    accent: '#38bdf8', // Sky Blue
    background: '#ffffff',
    zebra: '#f8fafc',
    headerBg: '#0f172a', // Dark header
    headerText: '#ffffff',
    footerBg: '#0f172a',
    footerText: '#94a3b8',
    totalBg: '#f8fafc',
    totalText: '#0f172a',
  },
  fonts: {
    sans: 'Inter',
    mono: 'Courier New',
    display: 'Playfair Display',
  },
  spacing: {
    marginX: 20,
    marginTop: 20,
    marginBottom: 20,
    tableRowHeight: 9,
    density: 'comfortable',
  },
  page: {
    size: 'a4',
    orientation: 'portrait',
    showPageNumbers: true,
  },
  header: {
    layout: 'banner',
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
    headerBg: '#0f172a',
    headerTextColor: '#ffffff',
    borderStyle: 'horizontal',
    showZebra: true,
    padding: 'normal',
  },
  totals: {
    background: '#f8fafc',
    border: '#cbd5e1',
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
    height: 16,
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
    color: '#e2e8f0',
    opacity: 0.1,
  },
  decorations: {
    accentBars: true,
    topBanner: true,
    bottomBanner: true,
  },
};
