export function getDensityPadding(density: 'compact' | 'comfortable' | 'spacious'): { py: string; px: string; gap: string } {
  switch (density) {
    case 'compact':
      return { py: 'py-1', px: 'px-2', gap: 'gap-2' };
    case 'spacious':
      return { py: 'py-4', px: 'px-5', gap: 'gap-6' };
    case 'comfortable':
    default:
      return { py: 'py-2', px: 'px-4', gap: 'gap-4' };
  }
}

export function getTableRowHeightMm(density: 'compact' | 'comfortable' | 'spacious'): number {
  switch (density) {
    case 'compact': return 7.0;
    case 'spacious': return 10.5;
    case 'comfortable':
    default: return 9.0;
  }
}
