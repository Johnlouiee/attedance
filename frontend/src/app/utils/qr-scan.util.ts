import jsQR from 'jsqr';

export function decodeQrFromImageData(data: ImageData): string | null {
  const result = jsQR(data.data, data.width, data.height, {
    inversionAttempts: 'attemptBoth',
  });
  return result?.data ?? null;
}

export function decodeQrFromImageSource(
  source: CanvasImageSource,
  width: number,
  height: number,
): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  return decodeQrFromImageData(imageData);
}

export function decodeQrFromFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const payload = decodeQrFromImageSource(image, image.naturalWidth, image.naturalHeight);
      URL.revokeObjectURL(url);
      resolve(payload);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}
