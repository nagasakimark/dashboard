import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import Dashboard from './pages/Dashboard';
import DailySchedule from './pages/DailySchedule';
import Schools from './pages/Schools';
import Textbooks from './pages/Textbooks';
import TextbookDetail from './pages/TextbookDetail';
import LessonPlans from './pages/LessonPlans';
import Curriculum from './pages/Curriculum';
import ClassHistory from './pages/ClassHistory';
import Settings from './components/Settings'; // Changed from './pages/Settings'
import SectionDetail from './pages/SectionDetail';
import { SettingsProvider } from './contexts/SettingsContext';

const App = () => {
  return (
    <SettingsProvider>
      <HashRouter>
        <div className="min-h-screen h-screen flex flex-col bg-gray-50 overflow-hidden"> {/* Added overflow-hidden */}
          <Navigation />
          <main className="flex-1 overflow-hidden pt-10"> {/* Changed back to overflow-hidden */}
            <div className="h-full overflow-auto"> {/* Move overflow-auto here */}
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/" element={<DailySchedule />} />
                <Route path="/schools" element={<Schools />} />
                <Route path="/textbooks" element={<Textbooks />} />
                <Route path="/textbooks/:id" element={<TextbookDetail />} />
                <Route path="/textbooks/:textbookId/sections/:sectionId" element={<SectionDetail />} />
                <Route path="/lesson-plans" element={<LessonPlans />} />
                <Route path="/curriculum" element={<Curriculum />} />
                <Route path="/history" element={<ClassHistory />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div> {/* End of wrapper div */}
          </main>
        </div>
      </HashRouter>
    </SettingsProvider>
  );
};

// Make sure export is explicit
export default App;
