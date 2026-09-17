import { DocumentTemplate } from '../../types/template';

export const elegantCorporate: DocumentTemplate = {
  id: 'elegantCorporate',
  name: 'Elegant Corporate',
  category: 'invoice',
  theme: 'corporate',
  colors: {
    primary: '#475569', // Slate
    secondary: '#334155', // Slate dark
    textDark: '#0f172a',
    textLight: '#ffffff',
    textMuted: '#64748b',
    border: '#cbd5e1',
    accent: '#475569',
    background: '#ffffff',
    zebra: '#f8fafc',
    headerBg: '#475569', // Corporate slate header
    headerText: '#ffffff',
    footerBg: '#ffffff',
    footerText: '#475569',
    totalBg: '#f1f5f9',
    totalText: '#334155',
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
    layout: 'left', // Formally aligned to left
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
    headerBg: '#475569',
    headerTextColor: '#ffffff',
    borderStyle: 'grid', // Accounting friendly structured grids
    showZebra: true,
    padding: 'compact',
  },
  totals: {
    background: '#f8fafc',
    border: '#cbd5e1',
    fontStyle: 'normal',
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
    topBanner: false,
    bottomBanner: false,
  },
};
