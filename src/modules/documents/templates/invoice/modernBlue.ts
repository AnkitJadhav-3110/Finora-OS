import { DocumentTemplate } from '../../types/template';

export const modernBlue: DocumentTemplate = {
  id: 'modernBlue',
  name: 'Modern Blue',
  category: 'invoice',
  theme: 'corporate',
  colors: {
    primary: '#2563eb', // Tech blue
    secondary: '#4f46e5', // Tech Indigo
    textDark: '#1e293b',
    textLight: '#ffffff',
    textMuted: '#64748b',
    border: '#cbd5e1',
    accent: '#3b82f6',
    background: '#ffffff',
    zebra: '#f1f5f9',
    headerBg: '#2563eb', // Rich Blue header
    headerText: '#ffffff',
    footerBg: '#f8fafc',
    footerText: '#475569',
    totalBg: '#eff6ff',
    totalText: '#1e40af',
  },
  fonts: {
    sans: 'Outfit',
    mono: 'Fira Code',
    display: 'Space Grotesk',
  },
  spacing: {
    marginX: 15,
    marginTop: 15,
    marginBottom: 15,
    tableRowHeight: 9,
    density: 'comfortable',
  },
  page: {
    size: 'a4',
    orientation: 'portrait',
    showPageNumbers: true,
  },
  header: {
    layout: 'banner', // Premium full banner style
    logoAlign: 'left',
    showBusinessDetails: true,
    showClientDetails: true,
    accentBar: true,
  },
  footer: {
    layout: 'grid',
    borderTop: false,
    showNotes: true,
    showTerms: true,
  },
  table: {
    headerBg: '#2563eb',
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
    qrSize: 24,
    alignment: 'left',
    border: true,
  },
  signature: {
    showLine: true,
    height: 18,
    align: 'right',
  },
  logo: {
    maxWidth: 35,
    maxHeight: 20,
  },
  background: {
    style: 'none',
    pattern: 'dots',
  },
  watermark: {
    text: '',
    color: '#eff6ff',
    opacity: 0.15,
  },
  decorations: {
    accentBars: true,
    topBanner: true,
    bottomBanner: false,
  },
};
