'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';

// In-memory cache of resolved blob URLs so images are only fetched once per session
const blobCache = new Map<string, string>();

/**
 * Fetch a private photo with the Sanctum Bearer token and return a secure blob URL.
 */
export async function fetchSecureBlobUrl(url: string, token?: string | null): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  if (blobCache.has(url)) {
    return blobCache.get(url)!;
  }

  const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  // If not a private id-photos endpoint, return the original URL
  if (!url.includes('/api/id-photos/')) {
    return url;
  }

  try {
    const res = await fetch(url, {
      headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
    });

    if (!res.ok) {
      return null;
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    blobCache.set(url, objectUrl);
    return objectUrl;
  } catch {
    return null;
  }
}

/**
 * Hook to convert an array of private photo URLs into secure blob URLs.
 */
export function useSecurePhotos(urls: string[]): { photos: string[]; isLoading: boolean } {
  const token = useAppSelector((s) => s.auth.token);
  const [photos, setPhotos] = useState<string[]>(() => {
    return urls.map((u) => (blobCache.has(u) ? blobCache.get(u)! : u.startsWith('data:') ? u : ''));
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const urlsKey = urls.join('||');

  useEffect(() => {
    let isCancelled = false;

    async function loadAll() {
      if (!urls || urls.length === 0) {
        setPhotos([]);
        setIsLoading(false);
        return;
      }

      const promises = urls.map((u) => fetchSecureBlobUrl(u, token));
      const results = await Promise.all(promises);

      if (!isCancelled) {
        setPhotos(results.map((r, i) => r || urls[i]));
        setIsLoading(false);
      }
    }

    loadAll();

    return () => {
      isCancelled = true;
    };
  }, [urlsKey, token]);

  return { photos, isLoading };
}

interface SecureImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallback?: React.ReactNode;
}

/**
 * Secure image component that fetches private API images using Bearer token authentication.
 */
export function SecureImage({ src, fallback, alt, className, ...props }: SecureImageProps) {
  const token = useAppSelector((s) => s.auth.token);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() => {
    if (!src) return null;
    if (src.startsWith('data:') || src.startsWith('blob:')) return src;
    if (blobCache.has(src)) return blobCache.get(src)!;
    return null;
  });
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setResolvedSrc(null);
      return;
    }

    if (src.startsWith('data:') || src.startsWith('blob:')) {
      setResolvedSrc(src);
      return;
    }

    if (blobCache.has(src)) {
      setResolvedSrc(blobCache.get(src)!);
      return;
    }

    let isCancelled = false;

    fetchSecureBlobUrl(src, token).then((blobUrl) => {
      if (isCancelled) return;
      if (blobUrl) {
        setResolvedSrc(blobUrl);
        setHasError(false);
      } else {
        setHasError(true);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [src, token]);

  if (hasError || !resolvedSrc) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt || ''}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}
