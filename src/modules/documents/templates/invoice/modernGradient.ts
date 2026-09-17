import { DocumentTemplate } from '../../types/template';

export const modernGradient: DocumentTemplate = {
  id: 'modernGradient',
  name: 'Modern Gradient',
  category: 'invoice',
  theme: 'creative',
  colors: {
    primary: '#4f46e5', // Indigo
    secondary: '#7c3aed', // Violet
    textDark: '#1e1b4b',
    textLight: '#ffffff',
    textMuted: '#6366f1',
    border: '#e0e7ff',
    accent: '#ec4899', // Pink
    background: '#ffffff',
    zebra: '#faf5ff',
    headerBg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)', // Gradient signature
    headerText: '#ffffff',
    footerBg: '#ffffff',
    footerText: '#6366f1',
    totalBg: '#f5f3ff',
    totalText: '#6d28d9',
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
    headerBg: '#7c3aed',
    headerTextColor: '#ffffff',
    borderStyle: 'none',
    showZebra: true,
    padding: 'normal',
  },
  totals: {
    background: '#f5f3ff',
    border: '#e0e7ff',
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
    color: '#faf5ff',
    opacity: 0.1,
  },
  decorations: {
    accentBars: true,
    topBanner: true,
    bottomBanner: true,
  },
};
