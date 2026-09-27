import React from 'react';
import { useSettings } from '../contexts/SettingsContext';

const Settings = ({ onClose }) => {
  const { settings, updateSettings } = useSettings();

  const handleDeleteData = () => {
    if (window.confirm('Are you sure you want to delete all data? This will remove all schools, textbooks, lesson plans, and settings. This action cannot be undone.')) {
      // Delete database
      indexedDB.deleteDatabase('alt-planner-db');
      
      // Clear storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Force a hard reload of the entire application
      window.location.reload(true);
      
      // If that doesn't work, redirect to the root with a forced reload
      setTimeout(() => {
        window.location = '/ALTPlanner';
      }, 100);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="space-y-6">
        {/* Accent Color */}
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-lg font-semibold mb-3">Appearance</h3>
          <div>
            <label className="block text-sm text-gray-700 mb-2">Accent Color</label>
            <input
              type="color"
              value={settings.accentColor}
              onChange={(e) => updateSettings({ accentColor: e.target.value })}
              className="w-full h-10 rounded border"
            />
          </div>
        </div>

        {/* ALT Name */}
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
          <div>
            <label className="block text-sm text-gray-700 mb-2">Your Name</label>
            <input
              type="text"
              value={settings.altName || ''}
              onChange={(e) => updateSettings({ altName: e.target.value })}
              placeholder="Enter your name"
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        {/* Date Format */}
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-lg font-semibold mb-3">Preferences</h3>
          <div>
            <label className="block text-sm text-gray-700 mb-2">Date Format</label>
            <select
              value={settings.dateFormat}
              onChange={(e) => updateSettings({ dateFormat: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="dd/MM/yyyy">DD/MM/YYYY</option>
              <option value="MM/dd/yyyy">MM/DD/YYYY</option>
              <option value="yyyy/MM/dd">YYYY/MM/DD</option>
            </select>
          </div>
        </div>

        {/* Windows Download */}
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-lg font-semibold mb-3">Desktop Application</h3>
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Get the desktop version from the link below.
            </p>
            <div className="flex items-center space-x-3">
              <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 16 16">
                <path d="M6.555 1.375 0 2.237v5.45h6.555V1.375zM0 13.795l6.555.933V8.313H0v5.482zm7.278-5.4.026 6.378L16 16V8.395H7.278zM16 0 7.33 1.244v6.414H16V0z"/>
              </svg>
              <a
                href={settings.desktopApp.downloadUrl}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                download
              >
                Download for Windows
                <svg className="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
          <h3 className="text-lg font-semibold text-red-700 mb-3">Danger Zone</h3>
          <button
            onClick={handleDeleteData}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete All Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
