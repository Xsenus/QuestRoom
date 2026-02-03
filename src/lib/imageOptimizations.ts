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

const getApiOrigin = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) return null;
  try {
    return new URL(apiUrl).origin;
  } catch {
    return null;
  }
};

const normalizeImageUrl = (url: string) => {
  if (!isOptimizableUrl(url)) {
    return url;
  }

  try {
    const apiOrigin = getApiOrigin();
    const windowOrigin = typeof window === 'undefined' ? null : window.location.origin;
    const baseOrigin =
      url.startsWith('/api/') && apiOrigin
        ? apiOrigin
        : windowOrigin || apiOrigin || 'http://localhost';
    const parsed = new URL(url, baseOrigin);

    if (apiOrigin) {
      const apiParsed = new URL(apiOrigin);
      if (parsed.host === apiParsed.host && parsed.protocol !== apiParsed.protocol) {
        parsed.protocol = apiParsed.protocol;
      }
    }

    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      parsed.protocol === 'http:' &&
      parsed.host === window.location.host
    ) {
      parsed.protocol = 'https:';
    }

    return parsed.toString();
  } catch {
    return url;
  }
};

export const getOptimizedImageUrl = (
  url: string,
  { width, quality = DEFAULT_QUALITY, format = 'auto' }: ImageTransformOptions = {}
) => {
  const normalizedUrl = normalizeImageUrl(url);
  if (!isOptimizableUrl(normalizedUrl)) {
    return normalizedUrl;
  }

  try {
    const parsed = new URL(normalizedUrl);

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
    return normalizedUrl;
  }
};

export const getResponsiveSrcSet = (
  url: string,
  widths: number[],
  options: Omit<ImageTransformOptions, 'width'> = {}
) => {
  const normalizedUrl = normalizeImageUrl(url);
  if (!isOptimizableUrl(normalizedUrl)) {
    return undefined;
  }

  return widths
    .map((width) => `${getOptimizedImageUrl(normalizedUrl, { ...options, width })} ${width}w`)
    .join(', ');
};
