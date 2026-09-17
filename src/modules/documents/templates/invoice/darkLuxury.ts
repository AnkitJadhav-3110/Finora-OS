import { DocumentTemplate } from '../../types/template';

export const darkLuxury: DocumentTemplate = {
  id: 'darkLuxury',
  name: 'Dark Luxury',
  category: 'invoice',
  theme: 'luxury',
  colors: {
    primary: '#18181b', // Pure carbon onyx
    secondary: '#b45309', // Warm amber / gold
    textDark: '#18181b',
    textLight: '#ffffff',
    textMuted: '#78350f', // Amber text
    border: '#fef3c7', // Gold border tint
    accent: '#d97706', // Rich Gold
    background: '#ffffff',
    zebra: '#fefbf3', // Ivory cream tint
    headerBg: '#18181b', // Black header
    headerText: '#fbbf24', // Yellow Gold
    footerBg: '#18181b',
    footerText: '#fbbf24',
    totalBg: '#fffbeb',
    totalText: '#78350f',
  },
  fonts: {
    sans: 'Cinzel',
    mono: 'Courier New',
    display: 'Playfair Display',
  },
  spacing: {
    marginX: 22,
    marginTop: 22,
    marginBottom: 22,
    tableRowHeight: 9,
    density: 'spacious',
  },
  page: {
    size: 'a4',
    orientation: 'portrait',
    showPageNumbers: true,
  },
  header: {
    layout: 'banner',
    logoAlign: 'center',
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
    headerBg: '#18181b',
    headerTextColor: '#fbbf24',
    borderStyle: 'horizontal',
    showZebra: false,
    padding: 'loose',
  },
  totals: {
    background: '#fffbeb',
    border: '#fef3c7',
    fontStyle: 'serif',
    alignment: 'right',
  },
  gst: {
    format: 'breakdown',
    showBreakdown: true,
  },
  payment: {
    qrSize: 22,
    alignment: 'center',
    border: true,
  },
  signature: {
    showLine: true,
    height: 18,
    align: 'right',
  },
  logo: {
    maxWidth: 32,
    maxHeight: 20,
  },
  background: {
    style: 'solid',
    pattern: 'none',
  },
  watermark: {
    text: '',
    color: '#fffbeb',
    opacity: 0.2,
  },
  decorations: {
    accentBars: true,
    topBanner: true,
    bottomBanner: true,
  },
};
