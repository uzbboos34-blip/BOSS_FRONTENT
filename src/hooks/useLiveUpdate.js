import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

export function useLiveUpdate() {
  useEffect(() => {
    // Only run updates on native Android/iOS apps
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const checkUpdates = async () => {
      try {
        // 1. Notify that the web application is successfully loaded.
        // This is crucial to prevent rollback to previous version!
        await CapacitorUpdater.notifyAppReady();
        console.log('[LiveUpdate] App ready notified');

        // 2. Set delay conditions so that updates are applied when the app is in the background
        await CapacitorUpdater.setDelay({ kind: 'background' });
        console.log('[LiveUpdate] Delay set to background');

        // 3. Fetch version metadata from Vercel
        const response = await fetch('https://boss-frontent.vercel.app/version.json', {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          console.warn('[LiveUpdate] Failed to fetch version.json from Vercel');
          return;
        }

        const data = await response.json();
        const latestVersion = data.version;
        const downloadUrl = data.url;

        // 4. Get active bundle info
        const current = await CapacitorUpdater.current();
        const currentVersion = current?.bundle?.version;
        console.log(`[LiveUpdate] Current version: ${currentVersion}, Latest version: ${latestVersion}`);

        if (currentVersion !== latestVersion) {
          console.log(`[LiveUpdate] New update detected! Saving metadata: ${latestVersion}`);
          localStorage.setItem('updateAvailable', 'true');
          localStorage.setItem('latestVersion', latestVersion);
          localStorage.setItem('updateUrl', downloadUrl);
          window.dispatchEvent(new Event('appUpdateAvailable'));
        } else {
          console.log('[LiveUpdate] App is up to date.');
          localStorage.removeItem('updateAvailable');
          localStorage.removeItem('latestVersion');
          localStorage.removeItem('updateUrl');
        }
      } catch (error) {
        console.error('[LiveUpdate] Error checked or applying live update:', error);
      }
    };

    // Run the check after a 3 second delay to let the app finish booting and render without layout blocks
    const timer = setTimeout(() => {
      checkUpdates();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);
}
