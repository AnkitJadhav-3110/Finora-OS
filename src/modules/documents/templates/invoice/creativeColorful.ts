import { DocumentTemplate } from '../../types/template';

export const creativeColorful: DocumentTemplate = {
  id: 'creativeColorful',
  name: 'Creative Colorful',
  category: 'invoice',
  theme: 'creative',
  colors: {
    primary: '#e11d48', // Rose / Coral
    secondary: '#f97316', // Sunset Orange
    textDark: '#1e1b4b',
    textLight: '#ffffff',
    textMuted: '#be123c',
    border: '#fecdd3',
    accent: '#ec4899', // Pink
    background: '#ffffff',
    zebra: '#fff1f2',
    headerBg: 'linear-gradient(135deg, #e11d48 0%, #f97316 100%)', // Dynamic Gradient
    headerText: '#ffffff',
    footerBg: '#ffffff',
    footerText: '#be123c',
    totalBg: '#fff7ed',
    totalText: '#c2410c',
  },
  fonts: {
    sans: 'Plus Jakarta Sans',
    mono: 'JetBrains Mono',
    display: 'Plus Jakarta Sans',
  },
  spacing: {
    marginX: 16,
    marginTop: 16,
    marginBottom: 16,
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
    layout: 'compact',
    borderTop: true,
    showNotes: true,
    showTerms: true,
  },
  table: {
    headerBg: '#e11d48',
    headerTextColor: '#ffffff',
    borderStyle: 'none',
    showZebra: true,
    padding: 'normal',
  },
  totals: {
    background: '#fff7ed',
    border: '#fed7aa',
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
    border: false,
  },
  signature: {
    showLine: true,
    height: 14,
    align: 'right',
  },
  logo: {
    maxWidth: 28,
    maxHeight: 18,
  },
  background: {
    style: 'gradient',
    pattern: 'dots',
  },
  watermark: {
    text: '',
    color: '#fff1f2',
    opacity: 0.1,
  },
  decorations: {
    accentBars: true,
    topBanner: true,
    bottomBanner: true,
  },
};
