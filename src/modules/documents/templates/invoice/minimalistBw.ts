import { DocumentTemplate } from '../../types/template';

export const minimalistBw: DocumentTemplate = {
  id: 'minimalistBw',
  name: 'Minimalist B&W',
  category: 'invoice',
  theme: 'monochrome',
  colors: {
    primary: '#000000', // Pure Black
    secondary: '#18181b', // Zinc 900
    textDark: '#000000',
    textLight: '#ffffff',
    textMuted: '#52525b',
    border: '#000000', // Sharp black lines
    accent: '#000000',
    background: '#ffffff',
    zebra: '#ffffff',
    headerBg: '#000000',
    headerText: '#ffffff',
    footerBg: '#ffffff',
    footerText: '#52525b',
    totalBg: '#fafafa',
    totalText: '#000000',
  },
  fonts: {
    sans: 'Space Grotesk',
    mono: 'JetBrains Mono',
    display: 'Space Grotesk',
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
    headerBg: '#000000',
    headerTextColor: '#ffffff',
    borderStyle: 'horizontal',
    showZebra: false,
    padding: 'normal',
  },
  totals: {
    background: '#ffffff',
    border: '#000000',
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
    color: '#e4e4e7',
    opacity: 0.1,
  },
  decorations: {
    accentBars: false,
    topBanner: false,
    bottomBanner: false,
  },
};
