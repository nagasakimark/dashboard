import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaCalendarAlt, FaSchool, FaBook, FaClipboardList, FaCog, FaThLarge } from 'react-icons/fa';
import { useSettings } from '../contexts/SettingsContext';

const NavLink = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const { settings } = useSettings();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors ${  // Reduced padding
        isActive ? 'text-white' : 'hover:bg-blue-100'
      }`}
      style={isActive ? { backgroundColor: settings.accentColor } : {}}
    >
      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : ''}`} style={!isActive ? { color: settings.accentColor } : {}} />  {/* Reduced icon size */}
      <span className="font-medium text-sm">{label}</span>  {/* Added text-sm */}
    </Link>
  );
};

export const Navigation = () => {
  const { settings } = useSettings();
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FaThLarge },
    { path: '/', label: 'Daily Schedule', icon: FaCalendarAlt },
    { path: '/schools', label: 'Schools', icon: FaSchool },
    { path: '/textbooks', label: 'Textbooks', icon: FaBook },
    { path: '/lesson-plans', label: 'Lesson Plans', icon: FaClipboardList },
    { path: '/curriculum', label: 'Curriculum', icon: FaBook },
    { path: '/history', label: 'Class History', icon: FaCalendarAlt },
    { path: '/settings', label: 'Settings', icon: FaCog }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50"> {/* Changed shadow-md to shadow-sm */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-10"> {/* Reduced height from h-12 to h-10 */}
          <div className="flex">
            <Link to="/" className="flex items-center" style={{ color: settings.accentColor }}>
              <span className="ml-2 text-base font-bold">ALT Planner</span> {/* Reduced text size */}
            </Link>
            <div className="ml-4 flex space-x-2"> {/* Reduced margin and gap */}
              {navItems.map((item) => (
                <NavLink 
                  key={item.path} 
                  to={item.path} 
                  icon={item.icon} 
                  label={item.label}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
