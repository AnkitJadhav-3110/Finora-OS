export interface TemplateColors {
  primary: string;
  secondary: string;
  textDark: string;
  textLight: string;
  textMuted: string;
  border: string;
  accent: string;
  background: string;
  zebra: string;
  headerBg?: string;
  headerText?: string;
  footerBg?: string;
  footerText?: string;
  totalBg?: string;
  totalText?: string;
}

export interface TemplateFonts {
  sans: string;
  mono: string;
  display: string;
}

export interface TemplateSpacing {
  marginX: number;
  marginTop: number;
  marginBottom: number;
  tableRowHeight: number;
  density: 'compact' | 'comfortable' | 'spacious';
}

export interface TemplatePageConfig {
  size: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  showPageNumbers: boolean;
}

export interface TemplateHeaderConfig {
  layout: 'split' | 'banner' | 'left' | 'right' | 'minimal' | 'modern';
  logoAlign: 'left' | 'right' | 'center';
  showBusinessDetails: boolean;
  showClientDetails: boolean;
  accentBar?: boolean;
}

export interface TemplateFooterConfig {
  layout: 'compact' | 'split' | 'grid';
  borderTop: boolean;
  showNotes: boolean;
  showTerms: boolean;
}

export interface TemplateTableConfig {
  headerBg: string;
  headerTextColor: string;
  borderStyle: 'none' | 'horizontal' | 'grid';
  showZebra: boolean;
  padding: 'compact' | 'normal' | 'loose';
}

export interface TemplateTotalsConfig {
  background: string;
  border: string;
  fontStyle: 'normal' | 'bold' | 'serif';
  alignment: 'left' | 'right' | 'split';
}

export interface TemplateGstConfig {
  format: 'summary' | 'breakdown' | 'none';
  showBreakdown: boolean;
}

export interface TemplatePaymentConfig {
  qrSize: number;
  alignment: 'left' | 'right' | 'center';
  border: boolean;
}

export interface TemplateSignatureConfig {
  showLine: boolean;
  height: number;
  align: 'left' | 'right' | 'center';
}

export interface TemplateLogoConfig {
  maxWidth: number;
  maxHeight: number;
}

export interface TemplateBackgroundConfig {
  style: 'solid' | 'gradient' | 'none';
  pattern: 'none' | 'dots' | 'grid' | 'stripes';
}

export interface TemplateWatermarkConfig {
  text: string;
  color: string;
  opacity: number;
}

export interface TemplateDecorationsConfig {
  accentBars?: boolean;
  topBanner?: boolean;
  bottomBanner?: boolean;
  customElements?: string[];
}

export interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  theme: 'light' | 'dark' | 'luxury' | 'corporate' | 'creative';
  colors: TemplateColors;
  fonts: TemplateFonts;
  spacing: TemplateSpacing;
  page: TemplatePageConfig;
  header: TemplateHeaderConfig;
  footer: TemplateFooterConfig;
  table: TemplateTableConfig;
  totals: TemplateTotalsConfig;
  gst: TemplateGstConfig;
  payment: TemplatePaymentConfig;
  signature: TemplateSignatureConfig;
  logo: TemplateLogoConfig;
  background: TemplateBackgroundConfig;
  watermark: TemplateWatermarkConfig;
  decorations: TemplateDecorationsConfig;
}
