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
          console.log(`[LiveUpdate] New update detected! Downloading ${latestVersion} from ${downloadUrl}`);
          
          // 5. Download the update zip bundle
          const versionObj = await CapacitorUpdater.download({
            url: downloadUrl,
            version: latestVersion
          });

          console.log('[LiveUpdate] Download completed. Setting update...', versionObj);

          // 6. Set the downloaded version to be active.
          // Because we configured setDelay({ kind: 'background' }), the app will NOT reload immediately.
          // It will reload and apply the update next time the user backgrounds or restarts the app.
          await CapacitorUpdater.set(versionObj);
          console.log('[LiveUpdate] Update successfully queued for next background/restart');
        } else {
          console.log('[LiveUpdate] App is up to date.');
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
