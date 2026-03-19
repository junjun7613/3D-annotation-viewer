'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Manages the manifest URL state, reading from URL search params on mount
 * and syncing changes back to the browser URL.
 */
export function useManifestUrl() {
  const [manifestUrl, setManifestUrl] = useState<string>('');

  // Read manifest URL from URL search params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const manifestParam = params.get('manifest');
    if (manifestParam) {
      setManifestUrl(manifestParam);
    }
  }, []);

  // Handle manifest URL change from an input element, syncing to browser URL
  const handleManifestUrlChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newUrl = event.target.value;
      setManifestUrl(newUrl);

      // Reflect in URL search params
      const url = new URL(window.location.href);
      if (newUrl) {
        url.searchParams.set('manifest', newUrl);
      } else {
        url.searchParams.delete('manifest');
      }
      window.history.replaceState({}, '', url.toString());
    },
    []
  );

  return { manifestUrl, setManifestUrl, handleManifestUrlChange };
}
