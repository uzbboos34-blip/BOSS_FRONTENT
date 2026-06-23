import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { toastBus } from '../utils/toast';

export function useLiveUpdate() {
  useEffect(() => {
    // Only run updates on native Android/iOS apps
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const checkUpdates = async () => {
      try {
        // 1. Notify that the web application is successfully loaded.
        try {
          await CapacitorUpdater.notifyAppReady();
          console.log('[LiveUpdate] App ready notified');
        } catch (readyErr) {
          console.warn('[LiveUpdate] notifyAppReady warning:', readyErr);
        }

        // 2. Set delay conditions so that updates are applied when the app is in the background
        try {
          await CapacitorUpdater.setDelay({ kind: 'background' });
          console.log('[LiveUpdate] Delay set to background');
        } catch (delayErr) {
          console.warn('[LiveUpdate] setDelay warning:', delayErr);
        }

        // 3. Fetch version metadata via backend proxy to bypass WebView CORS policy
        const backendUrl = Capacitor.isNativePlatform()
          ? 'https://boss-backend-glek.onrender.com'
          : (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== '/'
              ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '')
              : (import.meta.env.DEV ? '' : 'https://boss-backend-glek.onrender.com'));

        const response = await fetch(`${backendUrl}/api/v1/auth/app-version?t=${Date.now()}`);

        if (!response.ok) {
          console.warn('[LiveUpdate] Failed to fetch version info from backend');
          return;
        }

        const data = await response.json();
        if (!data.success) {
          console.warn('[LiveUpdate] Backend proxy returned error:', data.message);
          return;
        }
        const latestVersion = data.version;
        const downloadUrl = data.url;

        // 4. Get active bundle info
        let currentVersion = 'builtin';
        try {
          const current = await CapacitorUpdater.current();
          currentVersion = current?.bundle?.version || 'builtin';
        } catch (currentErr) {
          console.warn('[LiveUpdate] Failed to get current bundle version:', currentErr);
        }

        console.log(`[LiveUpdate] Current version: ${currentVersion}, Latest version: ${latestVersion}`);
        
        // Show temporary diagnostic toast to help resolve update issues
        toastBus.show(`[Тест] Версия APK: ${currentVersion}, На сервере: ${latestVersion}`, 'info');

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
        toastBus.show('[LiveUpdate Xatolik]: ' + error.message, 'error');
      }
    };

    // Run the check after a 3 second delay to let the app finish booting and render without layout blocks
    const timer = setTimeout(() => {
      checkUpdates();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);
}
