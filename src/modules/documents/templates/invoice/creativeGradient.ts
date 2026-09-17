import { DocumentTemplate } from '../../types/template';

export const creativeGradient: DocumentTemplate = {
  id: 'creativeGradient',
  name: 'Creative Gradient',
  category: 'invoice',
  theme: 'creative',
  colors: {
    primary: '#ec4899', // Pink
    secondary: '#8b5cf6', // Violet
    textDark: '#1e1b4b',
    textLight: '#ffffff',
    textMuted: '#4f46e5',
    border: '#e0e7ff',
    accent: '#f43f5e', // Rose
    background: '#ffffff',
    zebra: '#faf5ff',
    headerBg: 'linear-gradient(to right, #ec4899, #8b5cf6)', // Gradient signature
    headerText: '#ffffff',
    footerBg: '#ffffff',
    footerText: '#4f46e5',
    totalBg: '#f5f3ff',
    totalText: '#7c3aed',
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
    layout: 'modern',
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
    headerBg: '#8b5cf6',
    headerTextColor: '#ffffff',
    borderStyle: 'none',
    showZebra: true,
    padding: 'normal',
  },
  totals: {
    background: '#faf5ff',
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
    bottomBanner: false,
  },
};
