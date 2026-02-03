export type ImageTransformOptions = {
  width?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
};

const DEFAULT_QUALITY = 72;

const isOptimizableUrl = (url?: string | null) => {
  if (!url) return false;
  return !url.startsWith('data:') && !url.startsWith('blob:');
};

export const getOptimizedImageUrl = (
  url: string,
  { width, quality = DEFAULT_QUALITY, format = 'auto' }: ImageTransformOptions = {}
) => {
  if (!isOptimizableUrl(url)) {
    return url;
  }

  try {
    const baseUrl = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const parsed = new URL(url, baseUrl);

    if (width) {
      parsed.searchParams.set('w', String(width));
    }

    if (quality) {
      parsed.searchParams.set('q', String(quality));
    }

    if (format) {
      parsed.searchParams.set('format', format);
    }

    return parsed.toString();
  } catch {
    return url;
  }
};

export const getResponsiveSrcSet = (
  url: string,
  widths: number[],
  options: Omit<ImageTransformOptions, 'width'> = {}
) => {
  if (!isOptimizableUrl(url)) {
    return undefined;
  }

  return widths
    .map((width) => `${getOptimizedImageUrl(url, { ...options, width })} ${width}w`)
    .join(', ');
};
