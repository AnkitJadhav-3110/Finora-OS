export interface PageDimensions {
  width: number;
  height: number;
  marginX: number;
  marginTop: number;
  marginBottom: number;
  contentWidth: number;
}

export function getPageDimensions(size: 'a4' | 'letter', orientation: 'portrait' | 'landscape', marginX = 18, marginTop = 18, marginBottom = 18): PageDimensions {
  // A4 dimensions in mm
  let width = 210;
  let height = 297;

  if (size === 'letter') {
    width = 215.9; // 8.5 inches
    height = 279.4; // 11 inches
  }

  if (orientation === 'landscape') {
    const temp = width;
    width = height;
    height = temp;
  }

  return {
    width,
    height,
    marginX,
    marginTop,
    marginBottom,
    contentWidth: width - marginX * 2,
  };
}

export interface GridConfig {
  columns: number;
  gap: number;
  width: number;
}

export function calculateGridColumn(grid: GridConfig, colIndex: number, span = 1): { x: number; width: number } {
  const colWidth = (grid.width - grid.gap * (grid.columns - 1)) / grid.columns;
  const x = colIndex * (colWidth + grid.gap);
  const width = span * colWidth + (span - 1) * grid.gap;
  return { x, width };
}
