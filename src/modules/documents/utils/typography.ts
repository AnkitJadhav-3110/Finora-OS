export function getFontFamilyCss(fontName: string): string {
  switch (fontName.toLowerCase()) {
    case 'space grotesk':
      return '"Space Grotesk", sans-serif';
    case 'outfit':
      return '"Outfit", sans-serif';
    case 'playfair display':
      return '"Playfair Display", serif';
    case 'plus jakarta sans':
      return '"Plus Jakarta Sans", sans-serif';
    case 'cinzel':
      return '"Cinzel", serif';
    case 'fira code':
      return '"Fira Code", monospace';
    case 'jetbrains mono':
      return '"JetBrains Mono", monospace';
    case 'courier':
    case 'courier new':
      return '"Courier New", Courier, monospace';
    default:
      return '"Inter", ui-sans-serif, system-ui, sans-serif';
  }
}

export function getFontSizeClass(size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl'): string {
  switch (size) {
    case 'xs': return 'text-xs';
    case 'sm': return 'text-sm';
    case 'base': return 'text-base';
    case 'lg': return 'text-lg';
    case 'xl': return 'text-xl';
    case '2xl': return 'text-2xl';
    case '3xl': return 'text-3xl';
    default: return 'text-sm';
  }
}
