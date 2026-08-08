import { useState, useEffect } from 'react';
import { getCachedSettings, loadBusinessSettings } from '@food/utils/businessSettings';

const readDynamicLogo = (appType) => {
  if (typeof window === 'undefined') return null;

  const storedLogo = localStorage.getItem(`${appType}_logo`);
  if (storedLogo) return storedLogo;

  return getCachedSettings()?.logo?.url || null;
};

/**
 * Hook to get the dynamic app logo for the specific application (user, admin, restaurant, delivery)
 * @param {'user_app' | 'admin_app' | 'restaurant_app' | 'delivery_app'} appType
 * @returns {string | null} The logo URL from business settings if available
 */
export function useAppLogo(appType = 'user_app') {
  const [logo, setLogo] = useState(() => readDynamicLogo(appType) || '/logo.png');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;

    const syncLogo = async () => {
      const cachedLogo = readDynamicLogo(appType);
      if (cachedLogo) {
        if (!cancelled) setLogo(cachedLogo);
        return;
      }

      const settings = await loadBusinessSettings();
      if (!cancelled) {
        setLogo(settings?.logo?.url || readDynamicLogo(appType) || '/logo.png');
      }
    };

    void syncLogo();

    const handleLogoUpdate = () => {
      void syncLogo();
    };

    window.addEventListener('themeLoaded', handleLogoUpdate);
    window.addEventListener('businessSettingsUpdated', handleLogoUpdate);
    window.addEventListener('storage', handleLogoUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener('themeLoaded', handleLogoUpdate);
      window.removeEventListener('businessSettingsUpdated', handleLogoUpdate);
      window.removeEventListener('storage', handleLogoUpdate);
    };
  }, [appType]);

  return logo || '/logo.png';
}
