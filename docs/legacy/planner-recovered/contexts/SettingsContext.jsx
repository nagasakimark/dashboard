import React, { createContext, useContext, useState, useEffect } from 'react';
import { getData, setData } from '../services/indexedDB';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const defaultSettings = {
    accentColor: '#2563eb',
    dateFormat: 'dd/MM/yyyy',
    altName: '',
    desktopApp: {
      version: '1.0.0',
      downloadUrl: 'https://github.com/nagasakimark/ALTPlanner/raw/refs/heads/main/ALTPlanner.msi',
      platform: 'Windows 10/11 64-bit'
    }
  };

  const [settings, setSettings] = useState(defaultSettings);

  // Load settings from IndexedDB on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await getData('settings');
        if (savedSettings) {
          // Merge saved settings with defaults, ensuring desktopApp values are preserved
          setSettings({
            ...defaultSettings,
            ...savedSettings,
            desktopApp: {
              ...defaultSettings.desktopApp,
              ...(savedSettings.desktopApp || {})
            }
          });
          document.documentElement.style.setProperty('--accent-color', savedSettings.accentColor);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  const updateSettings = async (newSettings) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    document.documentElement.style.setProperty('--accent-color', updatedSettings.accentColor);
    try {
      await setData('settings', updatedSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
