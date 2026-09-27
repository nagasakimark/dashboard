import React, { useState, useCallback, useEffect } from 'react';
import { addDays, startOfWeek, format, startOfMonth, endOfMonth, eachDayOfInterval, startOfYear, endOfYear, eachMonthOfInterval, getDay } from 'date-fns';
import { FaArrowLeft, FaArrowRight, FaCalendarWeek, FaCalendarAlt, FaCalendar, FaDownload, FaUpload, FaChartBar, FaFileAlt } from 'react-icons/fa';
import useIndexedDB from '../hooks/useIndexedDB';
import SchoolSelectModal from '../components/SchoolSelectModal';
import PeriodEditModal from '../components/PeriodEditModal';
import TallyView from '../components/TallyView';
import ReportModal from '../components/ReportModal';
import { generateScheduleReport } from '../services/pdfGenerator';
import { save } from '@tauri-apps/api/dialog';
import { writeBinaryFile } from '@tauri-apps/api/fs';
import ErrorBoundary from '../components/ErrorBoundary';
import { useSettings } from '../contexts/SettingsContext';
import { exportData, importData } from '../services/exportImport';
import { savePdfWithDialog } from '../utils/fileUtils';

const ViewToggleButton = ({ currentView, viewType, icon: Icon, label }) => {
  const { settings } = useSettings();
  return (
    <button 
      onClick={() => currentView.set(viewType)}
      className={`px-3 py-1 flex items-center justify-center text-sm ${  // Reduced padding and text size
        currentView.value === viewType 
          ? 'text-white' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
      style={currentView.value === viewType ? { backgroundColor: settings.accentColor } : {}}
    >
      <Icon className="mr-1 text-sm" /> {label}  {/* Reduced icon margin and size */}
    </button>
  );
};

const PeriodCell = ({ period, scheduleData, getPeriodTimes, lessonPlans }) => {
  const { startTime, endTime } = getPeriodTimes(period);
  const lessonPlan = scheduleData?.lessonPlanId ? lessonPlans.find(p => p.id === scheduleData.lessonPlanId) : null;

  return (
    <div className="p-2 border rounded bg-white">
      <div className="flex justify-between text-sm font-medium">
        <span>{`Period ${period}`}</span>
        <span className="text-gray-500">{`${startTime} - ${endTime}`}</span>
      </div>
      {scheduleData ? (
        <div className="mt-1">
          {scheduleData.type === 'other' || scheduleData.special ? (
            <div className="text-sm text-gray-600">{scheduleData.summary}</div>
          ) : (
            <>
              <div className="font-medium">
                Year {scheduleData.yearGroup}-{scheduleData.classNumber}
              </div>
              {/* Add summary display for regular classes */}
              {scheduleData.summary && (
                <div className="text-sm text-gray-600 mt-1">
                  {scheduleData.summary}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-400">No class scheduled</div>
      )}
    </div>
  );
};

const DailySchedule = () => {
  const { settings } = useSettings();
  const [schools, setSchools] = useIndexedDB('schools', []);
  const [assignments, setAssignments] = useIndexedDB('assignments', {});
  const [schedule, setSchedule] = useIndexedDB('schedule', {});
  const [lessonPlans, setLessonPlans] = useIndexedDB('lessonPlans', []);
  const [textbooks, setTextbooks] = useIndexedDB('textbooks', []); 
  const [sections, setSections] = useIndexedDB('sections', []); 
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [view, setView] = useState('week');
  const [showReportModal, setShowReportModal] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const createDaySchedule = useCallback((schoolId) => {
    const basePeriods = Array(6).fill(null).map((_, i) => ({
      id: i + 1,
      type: 'period'
    }));

    if (!schoolId) return basePeriods;

    const school = schools.find(s => s.id === schoolId);
    if (!school) return basePeriods;

    const finalPeriods = [];
    for (const period of basePeriods) {
      finalPeriods.push(period);
      if (period.id === Number(school.lunchPeriod)) {
        finalPeriods.push({
          id: 'lunch',
          name: 'Lunch',
          type: 'lunch'
        });
      }
    }

    return finalPeriods;
  }, [schools]);

  useEffect(() => {
    console.log('Current data:', {
      schools,
      assignments,
      schedule
    });
  }, [schools, assignments, schedule]);

  const handleSchoolSelect = async (schoolId, scheduleId) => {
    if (selectedDay) {
      const newAssignments = { ...assignments };
      newAssignments[selectedDay] = {
        schoolId,
        scheduleId
      };
      console.log('Saving assignments:', newAssignments);
      await setAssignments(newAssignments);
      setShowSchoolModal(false);
    }
  };

  const handlePeriodSave = async (type, value, data) => {
    if (selectedDay && selectedPeriod) {
      const key = `${selectedDay}-${selectedPeriod}`;
      const newSchedule = { ...schedule };

      if (data.type === 'class') {
        newSchedule[key] = {
          yearGroup: parseInt(type),
          classNumber: parseInt(value),
          summary: data.summary || '',
          type: 'class',
          special: null,
          lessonPlanId: data.lessonPlanId // Make sure we're saving the lessonPlanId
        };
      } else {
        newSchedule[key] = {
          special: value,
          summary: data.summary || '',
          type: 'special',
          yearGroup: null,
          classNumber: null
        };
      }

      console.log('Saving schedule entry:', newSchedule[key]);
      await setSchedule(newSchedule);
    }
  };

  const handlePeriodRemove = async () => {
    if (selectedDay && selectedPeriod) {
      const key = `${selectedDay}-${selectedPeriod}`;
      const newSchedule = { ...schedule };
      delete newSchedule[key];
      await setSchedule(newSchedule);
      setShowPeriodModal(false);
    }
  };

  const handleCustomValue = async (customValue) => {
    if (selectedDay) {
      await setAssignments({ ...assignments, [selectedDay]: customValue });
      setShowSchoolModal(false);
    }
  };

  const handleRemoveSchool = async () => {
    if (selectedDay) {
      const newAssignments = { ...assignments };
      delete newAssignments[selectedDay];
      await setAssignments(newAssignments);

      
      const newSchedule = { ...schedule };
      Object.keys(newSchedule).forEach(key => {
        if (key.startsWith(selectedDay)) {
          delete newSchedule[key];
        }
      });
      await setSchedule(newSchedule);
      setShowSchoolModal(false);
    }
  };

  
  if (assignments === undefined || schools === undefined || schedule === undefined || 
      textbooks === undefined || lessonPlans === undefined || sections === undefined) {
    return (
      <div className="max-w-7xl mx-auto p-2">
        <div className="flex items-center justify-center">
          <div className="text-gray-500">Loading Schedule...</div>
        </div>
      </div>
    );
  }

  
  const safeTextbooks = Array.isArray(textbooks) ? textbooks : [];
  const safeLessonPlans = Array.isArray(lessonPlans) ? lessonPlans : [];

  const renderDay = (day, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayKey = `${dateStr}-${day}`;
    const assignment = assignments?.[dayKey] || null;
    
    
    const isSpecialDay = assignment?.schoolId?.startsWith('special_');
    const specialType = isSpecialDay ? assignment?.schoolId?.replace('special_', '') : null;
    
    
    const school = !isSpecialDay ? schools.find(s => String(s.id) === String(assignment?.schoolId)) : null;
    const selectedSchedule = school?.timeSchedules?.find(s => s.id === assignment?.scheduleId) 
      || school?.timeSchedules?.[0];
    const periods = createDaySchedule(assignment?.schoolId);

    return (
      <div key={dayKey} className="h-full flex flex-col overflow-hidden border rounded-lg" style={{ 
        backgroundColor: school ? `${school.accentColor}15` : 
                       isSpecialDay ? 'rgb(229, 231, 235)' : 'white'
      }}>
        <div 
          className="p-1 border-b cursor-pointer bg-gray-100 text-center" // Reduced padding from p-4 to p-2
          onClick={() => {
            setSelectedDay(dayKey);
            setShowSchoolModal(true);
          }}
        >
          <div className="font-bold">{day}</div> {/* Removed text-lg class */}
          <div className="text-xs text-gray-600">{format(date, settings.dateFormat)}</div> {/* Reduced from text-sm */}
          {school ? (
            <div className="text-xs font-medium" style={{ color: school.accentColor }}> {/* Reduced from text-sm */}
              {school.name}
            </div>
          ) : specialType ? (
            <div className="text-xs font-medium text-gray-600"> {/* Reduced from text-sm */}
              {specialType}
            </div>
          ) : null}
        </div>

        <div className="flex-1 min-h-0 flex flex-col divide-y divide-gray-200"> {/* Added explicit divide color */}
          {periods.map(period => {
            const scheduleKey = `${dayKey}-${period.id}`;
            const scheduleItem = schedule[scheduleKey];
            const isPeriodSpecial = scheduleItem?.special;
            const periodTimes = period.type === 'lunch' 
              ? selectedSchedule?.lunchTime
              : selectedSchedule?.periods?.find(p => p.id === period.id);

            return (
              <div
                key={scheduleKey}
                draggable={period.type !== 'lunch'}
                onDragStart={(e) => {
                  if (period.type === 'lunch') {
                    e.preventDefault();
                    return;
                  }
                  e.dataTransfer.setData('text/plain', JSON.stringify({
                    dayKey,
                    periodId: period.id
                  }));
                  e.dataTransfer.effectAllowed = 'copyMove';
                  e.currentTarget.classList.add('opacity-50', 'border-dashed', 'border-gray-400');
                }}
                onDragEnd={(e) => {
                   e.currentTarget.classList.remove('opacity-50', 'border-dashed', 'border-gray-400');
                   // Also clean up any drop targets that might still be highlighted
                   const targets = document.querySelectorAll('.drop-target');
                   targets.forEach(t => t.classList.remove('drop-target', 'bg-blue-50', 'ring-2', 'ring-blue-300'));
                }}
                onDragEnter={(e) => {
                  if (period.type !== 'lunch') {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    e.currentTarget.classList.add('drop-target', 'bg-blue-50', 'ring-2', 'ring-blue-300');
                  }
                }}
                onDragOver={(e) => {
                  if (period.type !== 'lunch') {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    // Class adding is redundant here if done in enter, but safe to keep or remove. 
                    // Keeping it ensures it stays if cursor moves around inside element.
                  }
                }}
                onDragLeave={(e) => {
                     e.currentTarget.classList.remove('drop-target', 'bg-blue-50', 'ring-2', 'ring-blue-300');
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('drop-target', 'bg-blue-50', 'ring-2', 'ring-blue-300');
                  
                  if (period.type === 'lunch') return;

                  try {
                    const droppedData = e.dataTransfer.getData('text/plain');
                    if (!droppedData) return;
                    
                    const data = JSON.parse(droppedData);
                    const { dayKey: sourceDayKey, periodId: sourcePeriodId } = data;
                    
                    // Don't do anything if dropped on itself
                    if (sourceDayKey === dayKey && sourcePeriodId === period.id) return;
                    
                    const sourceKey = `${sourceDayKey}-${sourcePeriodId}`;
                    const targetKey = `${dayKey}-${period.id}`;
                    
                    const newSchedule = { ...schedule };
                    
                    // Create minimal deep copy of source item to avoid reference issues
                    if (newSchedule[sourceKey]) {
                      const sourceItem = JSON.parse(JSON.stringify(newSchedule[sourceKey]));
                      
                      // Move the entry: assign copy to target, delete source
                      newSchedule[targetKey] = sourceItem;
                      delete newSchedule[sourceKey];
                      
                      await setSchedule(newSchedule);
                    }
                  } catch (err) {
                    console.error('Drag drop error', err);
                  }
                }}
                className="flex-1 min-h-0 p-1 cursor-pointer hover:bg-gray-50 flex flex-col justify-center items-center relative border-gray-200 transition-all rounded"
                onClick={() => {
                  setSelectedDay(dayKey);
                  setSelectedPeriod(period.id);
                  setShowPeriodModal(true);
                }}
              >
                {/* Period times */}
                {periodTimes && (
                  <div className="absolute top-0 left-0 text-[10px] text-gray-500 p-1">
                    {periodTimes.startTime} - {periodTimes.endTime}
                  </div>
                )}

                {scheduleItem?.special ? (
                  <>
                    <div className="text-sm text-gray-600">
                      {scheduleItem.special}
                    </div>
                    {/* Add summary display for special periods */}
                    {scheduleItem.summary && (
                      <div className="text-sm text-gray-600 mt-1 truncate max-w-full" title={scheduleItem.summary}>
                        {scheduleItem.summary.length > 60 
                          ? `${scheduleItem.summary.substring(0, 60)}...` 
                          : scheduleItem.summary}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {(() => {
                      const validYearGroup = scheduleItem?.yearGroup && !isNaN(Number(scheduleItem.yearGroup));
                      const validClassNumber = scheduleItem?.classNumber && !isNaN(Number(scheduleItem.classNumber));
                      const lessonPlan = scheduleItem?.lessonPlanId ? 
                        safeLessonPlans.find(p => p.id === scheduleItem.lessonPlanId) : null;
                      
                      if (period.type === 'lunch' && validClassNumber && validYearGroup) {
                        return (
                          <>
                            <div className="text-sm text-gray-600">Lunch</div>
                            <div 
                              className="font-bold text-base"
                              style={{ color: school?.accentColor || 'rgb(37, 99, 235)' }}
                            >
                              {Number(scheduleItem.yearGroup)}-{Number(scheduleItem.classNumber)}
                            </div>
                          </>
                        );
                      } else if (validYearGroup && validClassNumber) {
                        return (
                          <>
                            <div 
                              className="font-bold text-lg"
                              style={{ color: school?.accentColor || 'rgb(37, 99, 235)' }}
                            >
                              {Number(scheduleItem.yearGroup)}-{Number(scheduleItem.classNumber)}
                            </div>
                            {lessonPlan ? (
                              <div className="text-sm text-gray-600 mt-1 truncate max-w-full" title={lessonPlan.title}>
                                {lessonPlan.title.length > 60 
                                  ? `${lessonPlan.title.substring(0, 60)}...` 
                                  : lessonPlan.title}
                              </div>
                            ) : scheduleItem.summary && (
                              <div className="text-sm text-gray-600 mt-1 truncate max-w-full" title={scheduleItem.summary}>
                                {scheduleItem.summary.length > 60 
                                  ? `${scheduleItem.summary.substring(0, 60)}...` 
                                  : scheduleItem.summary}
                              </div>
                            )}
                          </>
                        );
                      }
                      return null;
                    })()}

                    {!scheduleItem?.summary && !(
                      (period.type === 'lunch' && scheduleItem?.classNumber) ||
                      (scheduleItem?.yearGroup && scheduleItem?.classNumber)
                    ) && (
                      <div className="text-sm text-gray-400">
                        {period.type === 'lunch' ? 'Lunch' : `Period ${period.id}`
                        }
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const start = startOfMonth(currentWeek);
    const end = endOfMonth(currentWeek);
    const daysInMonth = eachDayOfInterval({ start, end });
    // Calculate offset for Monday start
    const startDay = (getDay(start) + 6) % 7;  // Convert Sunday (0) to 6, Monday (1) to 0, etc.

    return (
      <div className="w-full max-w-[720px] mx-auto">
        <div className="grid grid-cols-7 border rounded-lg p-2 bg-white shadow-sm">
          {/* Change day order to Mon-Sun */}
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="font-bold text-center py-2 text-base">{day}</div>
          ))}
          {Array.from({ length: startDay }).map((_, index) => (
            <div key={index} className="aspect-square relative"></div> 
          ))}
          {daysInMonth.map(date => {
            const dayName = format(date, 'EEEE');
            const assignment = assignments[`${format(date, 'yyyy-MM-dd')}-${dayName}`];
            const isSpecialDay = assignment?.schoolId?.startsWith('special_');
            const school = !isSpecialDay ? schools.find(s => String(s.id) === String(assignment?.schoolId)) : null;
            const specialType = isSpecialDay ? assignment.schoolId.replace('special_', '') : null;
            
            return (
              <div key={date} className="aspect-square relative">
                <div 
                  className="absolute inset-0.5 border rounded cursor-pointer bg-white shadow-sm flex flex-col justify-center items-center"
                  style={{ 
                    backgroundColor: school ? `${school.accentColor}40` : 
                                  isSpecialDay ? 'rgb(229, 231, 235)' : ''
                  }}
                  onClick={() => {
                    setCurrentWeek(startOfWeek(date, { weekStartsOn: 1 }));
                    setView('week');
                  }}
                >
                  <div className="font-bold text-base">{parseInt(format(date, 'd'))}</div>
                  {school && (
                    <div className="text-xs px-0.5 truncate max-w-full" style={{ color: school.accentColor }}>
                      {school.name}
                    </div>
                  )}
                  {specialType && (
                    <div className="text-xs px-0.5 truncate max-w-full text-gray-600">
                      {specialType}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const start = startOfYear(currentWeek);
    const end = endOfYear(currentWeek);
    const monthsInYear = eachMonthOfInterval({ start, end });

    const renderMonthCalendar = (date) => {
      const startMonth = startOfMonth(date);
      const endMonth = endOfMonth(date);
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      // Calculate the day of week for the first day (0 = Sunday, 1 = Monday, etc)
      const firstDayOfMonth = getDay(startMonth);
      // Convert to Monday-based (0 = Monday, 6 = Sunday)
      const firstDayOffset = (firstDayOfMonth + 6) % 7;
      
      const daysInMonth = eachDayOfInterval({ start: startMonth, end: endMonth });
      const totalSlots = firstDayOffset + daysInMonth.length;
      const totalWeeks = Math.ceil(totalSlots / 7);
      
      // Create array of all calendar slots (empty + days)
      const calendarDays = [
        ...Array(firstDayOffset).fill(null),
        ...daysInMonth
      ];

      return (
        <div key={date} className="border rounded-lg p-2 bg-white shadow-sm">
          <div className="font-bold text-center mb-2">{format(date, 'MMMM')}</div>
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => (
              <div key={day} className="text-center text-xs text-gray-500">{day}</div>
            ))}
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const dayName = format(day, 'EEEE');
              const isWeekend = dayName === 'Saturday' || dayName === 'Sunday';

              if (isWeekend) {
                return (
                  <div
                    key={day}
                    className="aspect-square border rounded-lg p-1 bg-gray-50 flex items-center justify-center"
                  >
                    <div className="text-xs text-gray-400">{format(day, 'd')}</div>
                  </div>
                );
              }

              const assignment = assignments[`${format(day, 'yyyy-MM-dd')}-${dayName}`];
              const isSpecialDay = assignment?.schoolId?.startsWith('special_');
              const school = !isSpecialDay ? schools.find(s => String(s.id) === String(assignment?.schoolId)) : null;

              return (
                <div
                  key={day}
                  className="aspect-square border rounded-lg p-1 cursor-pointer bg-white shadow-xs flex items-center justify-center"
                  style={{ 
                    backgroundColor: school ? `${school.accentColor}40` : 
                                  isSpecialDay ? 'rgb(229, 231, 235)' : ''
                  }}
                  onClick={() => {
                    setCurrentWeek(startOfWeek(day, { weekStartsOn: 1 }));
                    setView('week');
                  }}
                >
                  <div className="text-xs">{format(day, 'd')}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div className="grid grid-cols-4 gap-2">
        {monthsInYear.map(renderMonthCalendar)}
      </div>
    );
  };

  const handlePrevWeek = () => {
    setCurrentWeek(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7));
  };

  const handlePrevMonth = () => {
    setCurrentWeek(prev => addDays(startOfMonth(prev), -1));
  };

  const handleNextMonth = () => {
    setCurrentWeek(prev => addDays(endOfMonth(prev), 1));
  };

  const handlePrevYear = () => {
    setCurrentWeek(prev => addDays(startOfYear(prev), -1));
  };

  const handleNextYear = () => {
    setCurrentWeek(prev => addDays(endOfYear(prev), 1));
  };

  const handleExportCalendar = async () => {
    try {
      const calendarData = await exportData();
      const isTauri = Boolean(window.__TAURI__);

      if (isTauri) {
        const filePath = await save({
          filters: [{ name: 'Calendar Data', extensions: ['json'] }],
          defaultPath: `calendar-export-${format(new Date(), 'yyyy-MM-dd')}.json`
        });

        if (filePath) {
          const data = new TextEncoder().encode(JSON.stringify(calendarData, null, 2));
          await writeBinaryFile(filePath, data);
        }
      } else {
        const blob = new Blob([JSON.stringify(calendarData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `calendar-export-${format(new Date(), settings.dateFormat)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export calendar data');
    }
  };

  const handleImportCalendar = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedData = JSON.parse(text);
      await importData(importedData);
      window.location.reload();
    } catch (error) {
      console.error('Import error:', error);
      alert(`Error importing calendar: ${error.message}`);
    }
  };

  const handleGenerateReport = async (startDate, numWeeks) => {
    try {
      const blob = await generateScheduleReport(
        startDate,
        numWeeks,
        schools,
        schedule,
        assignments,
        settings,
        safeLessonPlans
      );
      
      await savePdfWithDialog(blob);
      setShowReportModal(false);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report: ' + error.message);
    }
  };

  const NavigationButton = ({ onClick, direction }) => (
    <button 
      onClick={onClick} 
      className="w-24 flex items-center justify-center hover:bg-gray-100 rounded-lg"
      style={{ color: settings.accentColor }}
    >
      {direction === 'prev' ? (
        <FaArrowLeft className="w-6 h-6" />
      ) : (
        <FaArrowRight className="w-6 h-6" />
      )}
    </button>
  );

  return (
    <div className="h-full flex flex-col p-2"> {/* Changed from h-[calc(100vh-40px)] to h-full */}
      <div className="flex justify-between items-center mb-1"> {/* Reduced margin bottom further */}
        <div className="flex-1">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <ViewToggleButton
              currentView={{ value: view, set: setView }}
              viewType="week"
              icon={FaCalendarWeek}
              label="Week"
            />
            <ViewToggleButton
              currentView={{ value: view, set: setView }}
              viewType="month"
              icon={FaCalendarAlt}
              label="Month"
            />
            <ViewToggleButton
              currentView={{ value: view, set: setView }}
              viewType="year"
              icon={FaCalendar}
              label="Year"
            />
            <ViewToggleButton
              currentView={{ value: view, set: setView }}
              viewType="tally"
              icon={FaChartBar}
              label="Tally"
            />
          </div>
        </div>
        
        <div className="flex-1 text-center">
          {view === 'month' && (
            <h2 className="text-xl font-bold text-accent"> {/* Reduced text size from 2xl to xl */}
              {format(currentWeek, 'MMMM yyyy')}
            </h2>
          )}
          {view === 'year' && (
            <h2 className="text-xl font-bold text-accent"> {/* Reduced text size from 2xl to xl */}
              {format(currentWeek, 'yyyy')}
            </h2>
          )}
        </div>

        <div className="flex-1 flex justify-end gap-1">
          <button 
            onClick={() => setShowReportModal(true)}
            className="px-3 py-1 text-sm flex items-center bg-gray-100 hover:bg-gray-200 rounded text-gray-600" // Added text color
          >
            <FaFileAlt className="mr-1 text-sm" /> PDF Report
          </button>
          <button 
            onClick={handleExportCalendar} 
            className="px-3 py-1 text-sm flex items-center bg-gray-100 hover:bg-gray-200 rounded text-gray-600" // Added text color
          >
            <FaDownload className="mr-1 text-sm" /> Export
          </button>
          <label className="px-3 py-1 text-sm flex items-center bg-gray-100 hover:bg-gray-200 rounded cursor-pointer text-gray-600"> {/* Added text color */}
            <FaUpload className="mr-1 text-sm" /> Import
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportCalendar}
              onClick={(e) => e.target.value = null}
            />
          </label>
        </div>
      </div>

      <div className="flex-1 min-h-0"> {/* Added min-h-0 to prevent flex growth */}
        {view === 'week' && (
          <div className="flex items-stretch gap-1 h-full">
            <NavigationButton onClick={handlePrevWeek} direction="prev" />
            <div className="grid grid-cols-5 gap-1 flex-1 h-full">
              {days.map((day, index) => renderDay(day, addDays(currentWeek, index)))}
            </div>
            <NavigationButton onClick={handleNextWeek} direction="next" />
          </div>
        )}

        {view === 'month' && (
          <div className="flex items-stretch gap-2">
            <NavigationButton onClick={handlePrevMonth} direction="prev" />
            <div className="flex-1">
              {renderMonthView()}
            </div>
            <NavigationButton onClick={handleNextMonth} direction="next" />
          </div>
        )}

        {view === 'year' && (
          <div className="flex items-stretch gap-2">
            <NavigationButton onClick={handlePrevYear} direction="prev" />
            <div className="flex-1">
              {renderYearView()}
            </div>
            <NavigationButton onClick={handleNextYear} direction="next" />
          </div>
        )}

        {view === 'tally' && <TallyView schedule={schedule} schools={schools} assignments={assignments} />}
      </div>

      <SchoolSelectModal
        isOpen={showSchoolModal}
        onClose={() => setShowSchoolModal(false)}
        schools={schools}
        selectedSchool={selectedDay ? assignments[selectedDay] : null}
        onSelect={handleSchoolSelect}
        onRemove={handleRemoveSchool}
        onCustomValue={handleCustomValue}
        className="mt-20" // Add top margin
      />

      <PeriodEditModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        currentData={selectedDay && selectedPeriod ? {
          ...schedule[`${selectedDay}-${selectedPeriod}`],
          date: selectedDay,
          periodId: selectedPeriod,
          lessonPlanId: schedule[`${selectedDay}-${selectedPeriod}`]?.lessonPlanId,
          lessonPlan: safeLessonPlans.find(p => p.id === schedule[`${selectedDay}-${selectedPeriod}`]?.lessonPlanId),
          periodType: createDaySchedule(assignments[selectedDay]?.schoolId)
            .find(p => p.id === selectedPeriod)?.type
        } : null}
        onSave={handlePeriodSave}
        onRemove={handlePeriodRemove}
        textbooks={safeTextbooks}
        lessonPlans={safeLessonPlans}
        setLessonPlans={setLessonPlans}
        schedule={schedule}
        className="mt-20" // Add top margin
      />

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onGenerate={handleGenerateReport}
      />
    </div>
  );
};

const WrappedDailySchedule = () => (
  <ErrorBoundary>
    <DailySchedule />
  </ErrorBoundary>
);

export default WrappedDailySchedule;
