import { useState, useEffect, useRef } from "react";
import { getDataLayer } from "../data";

interface CacheEntry {
  url: string;
  expiresAt: number;
}

// Global cache for signed URLs (shared across all components)
const urlCache = new Map<string, CacheEntry>();

const CACHE_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry
const DEFAULT_EXPIRY_SECONDS = 3600; // 1 hour

/**
 * Hook to get a signed URL for a storage path
 * 
 * Features:
 * - Caches URLs until shortly before they expire
 * - Automatically refreshes expired URLs
 * - Returns null while loading
 * 
 * @param bucket - Storage bucket name (e.g., "room-photos")
 * @param path - Storage path or null
 * @param expiresIn - Expiry time in seconds (default: 3600)
 * @returns Signed URL or null if loading/error
 */
export function useSignedUrl(
  bucket: string,
  path: string | null | undefined,
  expiresIn: number = DEFAULT_EXPIRY_SECONDS
): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const dataLayer = useRef(getDataLayer()).current;
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!path) {
      setSignedUrl(null);
      return;
    }

    const cacheKey = `${bucket}:${path}`;

    // Check cache first
    const cached = urlCache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now + CACHE_BUFFER_MS) {
      // Cache hit and not expiring soon
      setSignedUrl(cached.url);
      return;
    }

    // Fetch new signed URL
    let cancelled = false;

    (async () => {
      try {
        const url = await dataLayer.getSignedUrl(bucket, path, expiresIn);
        
        if (cancelled || !isMountedRef.current) return;

        if (url) {
          // Cache the URL
          const expiresAt = now + (expiresIn * 1000);
          urlCache.set(cacheKey, { url, expiresAt });
          setSignedUrl(url);
        } else {
          setSignedUrl(null);
        }
      } catch (error) {
        console.error("Error fetching signed URL:", error);
        if (!cancelled && isMountedRef.current) {
          setSignedUrl(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bucket, path, expiresIn, dataLayer]);

  return signedUrl;
}

/**
 * Clear a specific URL from the cache
 * Useful when an image fails to load and needs to be refreshed
 */
export function clearSignedUrlCache(bucket: string, path: string): void {
  const cacheKey = `${bucket}:${path}`;
  urlCache.delete(cacheKey);
}

/**
 * Clear all cached signed URLs
 */
export function clearAllSignedUrlCache(): void {
  urlCache.clear();
}
