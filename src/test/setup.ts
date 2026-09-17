import '@testing-library/jest-dom';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsPDF needs a canvas; jsdom's is fine for our blob-output tests.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function (contextType: string) {
    if (contextType === '2d') {
      return {
        fillRect: () => {},
        clearRect: () => {},
        getImageData: (_x: number, _y: number, w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4),
        }),
        putImageData: () => {},
        createImageData: () => [],
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        fillText: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        fill: () => {},
        measureText: (text: string) => ({ width: text.length * 6 }),
        transform: () => {},
        rect: () => {},
        clip: () => {},
      } as any;
    }
    return null;
  } as any;
  HTMLCanvasElement.prototype.toDataURL = function () {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  };
  HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback, type = 'image/png') {
    const data = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ...new TextEncoder().encode(type),
      0, 0, 0, 0,
    ]);
    setTimeout(() => cb(new Blob([data], { type })), 0);
  };
}

if (!(globalThis as any).URL.createObjectURL) {
  (globalThis as any).URL.createObjectURL = () => 'blob:mock';
}
