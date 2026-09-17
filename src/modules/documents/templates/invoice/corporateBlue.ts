import { DocumentTemplate } from '../../types/template';

export const corporateBlue: DocumentTemplate = {
  id: 'corporateBlue',
  name: 'Corporate Blue',
  category: 'invoice',
  theme: 'corporate',
  colors: {
    primary: '#1d4ed8', // Royal Blue
    secondary: '#1e40af', // Deep Blue
    textDark: '#0f172a',
    textLight: '#ffffff',
    textMuted: '#475569',
    border: '#cbd5e1',
    accent: '#2563eb',
    background: '#ffffff',
    zebra: '#f8fafc',
    headerBg: '#1d4ed8', // Crisp Royal Blue header
    headerText: '#ffffff',
    footerBg: '#ffffff',
    footerText: '#1e40af',
    totalBg: '#eff6ff',
    totalText: '#1d4ed8',
  },
  fonts: {
    sans: 'Inter',
    mono: 'Courier',
    display: 'Inter',
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
    headerBg: '#1d4ed8',
    headerTextColor: '#ffffff',
    borderStyle: 'grid',
    showZebra: true,
    padding: 'compact',
  },
  totals: {
    background: '#eff6ff',
    border: '#bfdbfe',
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
    color: '#cbd5e1',
    opacity: 0.1,
  },
  decorations: {
    accentBars: true,
    topBanner: true,
    bottomBanner: false,
  },
};
