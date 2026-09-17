import { DocumentTemplate } from '../../types/template';

export const minimalWhite: DocumentTemplate = {
  id: 'minimalWhite',
  name: 'Minimal White',
  category: 'invoice',
  theme: 'light',
  colors: {
    primary: '#1e3a8a', // Dark blue accents
    secondary: '#475569',
    textDark: '#0f172a',
    textLight: '#f8fafc',
    textMuted: '#64748b',
    border: '#e2e8f0',
    accent: '#3b82f6',
    background: '#ffffff',
    zebra: '#f8fafc',
    headerBg: '#ffffff',
    headerText: '#0f172a',
    footerBg: '#ffffff',
    footerText: '#64748b',
    totalBg: '#faf5ff',
    totalText: '#1e3a8a',
  },
  fonts: {
    sans: 'Inter',
    mono: 'JetBrains Mono',
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
    layout: 'split',
    logoAlign: 'left',
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
    headerBg: '#f8fafc',
    headerTextColor: '#475569',
    borderStyle: 'horizontal',
    showZebra: false,
    padding: 'normal',
  },
  totals: {
    background: '#ffffff',
    border: '#e2e8f0',
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
    border: false,
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
    color: '#e2e8f0',
    opacity: 0.1,
  },
  decorations: {
    accentBars: false,
    topBanner: false,
    bottomBanner: false,
  },
};
