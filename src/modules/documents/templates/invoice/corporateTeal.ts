import { DocumentTemplate } from '../../types/template';

export const corporateTeal: DocumentTemplate = {
  id: 'corporateTeal',
  name: 'Corporate Teal',
  category: 'invoice',
  theme: 'corporate',
  colors: {
    primary: '#0f766e', // Deep Teal
    secondary: '#0e7490', // Cyan-slate
    textDark: '#0f172a',
    textLight: '#ffffff',
    textMuted: '#475569',
    border: '#99f6e4',
    accent: '#14b8a6', // Teal
    background: '#ffffff',
    zebra: '#f0fdfa',
    headerBg: '#0f766e', // Deep Teal Header
    headerText: '#ffffff',
    footerBg: '#ffffff',
    footerText: '#0f766e',
    totalBg: '#f0fdfa',
    totalText: '#115e59',
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
    headerBg: '#0f766e',
    headerTextColor: '#ffffff',
    borderStyle: 'horizontal',
    showZebra: true,
    padding: 'normal',
  },
  totals: {
    background: '#f0fdfa',
    border: '#99f6e4',
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
    color: '#ccfbf1',
    opacity: 0.1,
  },
  decorations: {
    accentBars: true,
    topBanner: true,
    bottomBanner: true,
  },
};
