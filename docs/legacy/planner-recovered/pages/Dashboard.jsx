import React, { useState, useEffect, useMemo } from 'react';
import { format, addDays, parseISO, isAfter, isBefore, isSameDay, intervalToDuration, isToday } from 'date-fns';
import { FaChalkboardTeacher, FaCheck, FaPlus, FaTrash, FaClipboardList, FaSchool, FaCoffee, FaRegClock, FaCalendarDay, FaCalendar } from 'react-icons/fa';
import useIndexedDB from '../hooks/useIndexedDB';
import { useSettings } from '../contexts/SettingsContext';

const Dashboard = () => {
  const { settings } = useSettings();
  const [schedule, setSchedule] = useIndexedDB('schedule', {});
  const [schools] = useIndexedDB('schools', []);
  const [assignments] = useIndexedDB('assignments', {});
  const [todos, setTodos] = useIndexedDB('todos', []);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Todo State
  const [newTodo, setNewTodo] = useState('');

  // Stats Filter State
  const [filterSchoolId, setFilterSchoolId] = useState('all');
  const [filterYearGroup, setFilterYearGroup] = useState('all');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // --- Logic for Next Class ---
  const nextClassInfo = useMemo(() => {
    if (!schedule || !schools || !assignments) return null;

    const now = currentTime;
    let checkDate = new Date(now);
    let isTodayCheck = true;
    let daysChecked = 0;

    // Logic: If after 3pm, we treat today as potentially done and start checks from tomorrow,
    // UNLESS we want to support evening classes. For now, matching previous behavior of lookahead.
    if (now.getHours() >= 15) {
       checkDate = addDays(now, 1);
       isTodayCheck = false;
    }

    while (daysChecked < 14) {
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      const dayName = format(checkDate, 'EEEE');
      const assignmentKey = `${dateStr}-${dayName}`;
      const schoolId = assignments[assignmentKey]?.schoolId;

      if (schoolId) {
        if (schoolId.toString().startsWith('special_')) {
            return {
                type: 'special',
                title: schoolId.replace('special_', ''),
                date: new Date(checkDate),
                isTomorrow: !isSameDay(now, checkDate)
            };
        }

        const school = schools.find(s => String(s.id) === String(schoolId));
        if (school) {
             const scheduleId = assignments[assignmentKey]?.scheduleId;
             const timeSchedule = school.timeSchedules?.find(ts => ts.id === scheduleId) || school.timeSchedules?.[0];
             
             const daysClasses = [];
             Object.entries(schedule).forEach(([key, value]) => {
                if (key.startsWith(`${dateStr}-${dayName}-`) && !key.includes('lunch')) {
                    const parts = key.split('-');
                    const periodId = parts[parts.length - 1];
                    daysClasses.push({
                        period: periodId,
                        ...value
                    });
                }
            });

            if (isTodayCheck) {
               if (timeSchedule?.periods) {
                  const currentMinutes = now.getHours() * 60 + now.getMinutes();
                  const sortedPeriods = [...timeSchedule.periods].sort((a, b) => {
                       const [aH, aM] = a.startTime.split(':').map(Number);
                       const [bH, bM] = b.startTime.split(':').map(Number);
                       return (aH * 60 + aM) - (bH * 60 + bM);
                  });

                  for (const p of sortedPeriods) {
                       const [pH, pM] = p.startTime.split(':').map(Number);
                       const pStartMinutes = pH * 60 + pM;

                       if (pStartMinutes > currentMinutes) {
                           const classInfo = daysClasses.find(c => String(c.period) === String(p.id));
                           if (classInfo) {
                               const startTime = new Date(now);
                               startTime.setHours(pH, pM, 0, 0);
                               const duration = intervalToDuration({ start: now, end: startTime });
                               const hours = duration.hours || 0;
                               const minutes = duration.minutes || 0;
                               let timeUntilString = '';
                               if (hours > 0) timeUntilString += `${hours} hr${hours > 1 ? 's' : ''} `;
                               timeUntilString += `${minutes} min${minutes !== 1 ? 's' : ''}`;
                               if (hours === 0 && minutes === 0) timeUntilString = 'Now';

                               return {
                                   type: 'next_class',
                                   period: p,
                                   classInfo: classInfo,
                                   schoolName: school.name,
                                   date: now,
                                   timeUntil: timeUntilString,
                                   schoolId: school.id,
                                   isTomorrow: false // Explicitly false for today
                               };
                           }
                       }
                  }
               }
            } else {
               // Future day logic
               // 1. Calculate actual class count (excluding special/other)
               const actualClassCount = daysClasses.filter(c => c.type === 'class').length;
               
               // 2. Prepare classes overview
               const classesOverview = daysClasses
                   .filter(c => c.type === 'class')
                   .map(c => {
                       const periodInfo = timeSchedule?.periods?.find(p => String(p.id) === String(c.period));
                       return {
                            ...c,
                            startTime: periodInfo?.startTime || '',
                            endTime: periodInfo?.endTime || ''
                       };
                   })
                   .sort((a, b) => {
                        const timeToMin = (t) => {
                            if (!t) return 0;
                            const [h, m] = t.split(':').map(Number);
                            return h * 60 + m;
                        };
                        return timeToMin(a.startTime) - timeToMin(b.startTime);
                   });

               // 3. Determine appropriate label (Tomorrow vs Day Name)
               const daysDiff = Math.ceil((new Date(checkDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
               const isLiteralTomorrow = daysDiff <= 1 || (now.getDate() + 1 === checkDate.getDate()); 
               // Note: daysDiff approximation can be tricky with hours, using isSameDay check previously is safer for logic, 
               // but for UI label:
               
               const dayLabel = isLiteralTomorrow ? "Tomorrow" : format(checkDate, 'EEEE');

               return {
                  type: 'tomorrow_overview',
                  schoolName: school.name,
                  totalClasses: actualClassCount,
                  classes: classesOverview,
                  date: new Date(checkDate),
                  isTomorrow: !isSameDay(now, checkDate),
                  dayLabel: dayLabel
               };
            }
        }
      }

      checkDate = addDays(checkDate, 1);
      isTodayCheck = false;
      daysChecked++;
    }

    return { type: 'none', date: checkDate, isTomorrow: false };

  }, [schedule, schools, assignments, currentTime]);

  // --- Logic for Last Class ---
  const lastClassInfo = useMemo(() => {
    if (!nextClassInfo || nextClassInfo.type !== 'next_class' || !schedule) return null;

    const { classInfo, schoolId } = nextClassInfo;
    const { yearGroup, classNumber } = classInfo;

    const now = new Date();
    let lastEntry = null;

    Object.entries(schedule).forEach(([key, value]) => {
        // Skip current entry
        if (!key || !value) return;
        
        // Match class details
        if (String(value.yearGroup) !== String(yearGroup) || String(value.classNumber) !== String(classNumber)) return;
        
        // Parse date
        const parts = key.split('-');
        if (parts.length < 4) return;
        const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
        const entryDate = parseISO(dateStr);
        
        // Strict past check
        if (!isBefore(entryDate, now)) return;
        // Don't count "today" as "last time"
        if (isSameDay(entryDate, now)) return;

        // Check assignment for school match (optional but good for multi-school same-class scenarios)
        // Ignoring strictly for performance, assuming year/class is unique enough usually, 
        // but let's be safe if we can easily look up assignment.
        // We need to know if this specific date was assigned to THIS school.
        /* 
           Technically user might teach Yr 1-1 at School A and School B.
           So checking schoolId is important.
        */
        const dayName = parts[3];
        const assignmentKey = `${dateStr}-${dayName}`;
        const assignment = assignments[assignmentKey];
        if (!assignment || String(assignment.schoolId) !== String(schoolId)) return;

        // Found a candidate. Is it later than our current best?
        if (!lastEntry || isAfter(entryDate, lastEntry.date)) {
            lastEntry = {
                date: entryDate,
                ...value
            };
        }
    });

    return lastEntry;
  }, [nextClassInfo, schedule, assignments]);


  // --- Logic for Upcoming Special Days ---
  const upcomingSpecialDays = useMemo(() => {
    if (!assignments) return [];
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const days = [];

    // Scan assignments
    Object.entries(assignments).forEach(([key, value]) => {
        // key is yyyy-MM-dd-DayName
        const parts = key.split('-');
        if (parts.length < 3) return;
        
        const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
        const date = parseISO(dateStr);
        
        // Filter for current month/future
        if (isBefore(date, now) && !isSameDay(date, now)) return; // Past
        if (date.getMonth() !== currentMonth && date.getMonth() !== (currentMonth + 1) % 12) return; // Only this month and next

        // Check for special events
        // 1. Special School Type
        if (value.schoolId && String(value.schoolId).startsWith('special_')) {
            days.push({
                date,
                title: value.schoolId.replace('special_', ''),
                type: 'Special Day'
            });
        }
        
    });
    
    // Sort by date limited to 3 items
    return days.sort((a, b) => a.date - b.date).slice(0, 3);
  }, [assignments]);


  // --- Logic for Stats ---
  const stats = useMemo(() => {
      let totalTaught = 0;
      const debugCounts = []; // Collect debug info
      
      if (!schedule || !assignments) return { totalTaught: 0 };

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      Object.entries(schedule).forEach(([key, value]) => {
          if (value.type !== 'class') return;
          
          // Parse date from key: yyyy-MM-dd-DayName-Period
          const parts = key.split('-');
          if (parts.length < 4) return;
          
          const year = parts[0];
          const month = parts[1];
          const day = parts[2];
          const classDateStr = `${year}-${month}-${day}`;
          const classDate = parseISO(classDateStr);

          // Validation
          if (isNaN(classDate.getTime())) return;

          // Only count classes strictly before today (completed days)
          // To count "Today's" finished classes requires time comparison which is complex here,
          // so we stick to "Previously Taught" for accuracy.
          if (!isBefore(classDate, startOfToday)) return; 

          // Apply filters
          
          const dayName = parts[3];
          const assignmentKey = `${classDateStr}-${dayName}`;
          // Safely check for assignment
          const assignment = assignments[assignmentKey];
          
          // If no school assigned to this day, ignore the class (orphan)
          if (!assignment) return;

          const schoolId = assignment.schoolId;
          
          if (filterSchoolId !== 'all' && String(schoolId) !== String(filterSchoolId)) return;
          if (filterYearGroup !== 'all' && String(value.yearGroup) !== String(filterYearGroup)) return;

          // Match TallyView logic explicitly:
          // 1. Exclude lunch keys
          if (key.includes('-lunch')) return;

          // 2. Must have valid year and class numbers
          if (!value.yearGroup || !value.classNumber) return;

          // 3. Count it (TallyView counts all scheduled classes, not just those with content)
          totalTaught++;
      });
      
      if (process.env.NODE_ENV === 'development') {
        // console.log('Total Taught Breakdown:', debugCounts);
      }

      return { totalTaught };
  }, [schedule, assignments, filterSchoolId, filterYearGroup]);

  // --- Logic for Todos ---
  const addTodo = async (e) => {
      e.preventDefault();
      if (!newTodo.trim()) return;

      const newItem = {
          id: Date.now(),
          text: newTodo,
          completed: false,
          createdAt: new Date()
      };
      
      const updatedTodos = [newItem, ...todos];
      await setTodos(updatedTodos);
      setNewTodo('');
  };

  const toggleTodo = async (id) => {
      const updatedTodos = todos.map(t => 
          t.id === id ? { ...t, completed: !t.completed } : t
      );
      await setTodos(updatedTodos);
  };

  const deleteTodo = async (id) => {
      const updatedTodos = todos.filter(t => t.id !== id);
      await setTodos(updatedTodos);
  };

  // Determine greeting
  const greeting = useMemo(() => {
    const hours = currentTime.getHours();
    if (hours < 12) return 'Good Morning';
    if (hours < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, [currentTime]);

  if (schedule === undefined || schools === undefined || assignments === undefined || todos === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4 overflow-y-auto bg-gray-50/50 min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-3 border-b border-gray-200/600">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight" style={{ color: settings.accentColor }}>{greeting}</h1>
          <p className="text-gray-500 font-medium mt-0.5 uppercase tracking-wider text-xs">{format(currentTime, 'EEEE, MMMM do, yyyy')}</p>
        </div>
        <div className="mt-2 md:mt-0 text-right">
           <div className="text-4xl font-thin text-gray-300 tabular-nums tracking-tighter hover:text-gray-400 transition-colors cursor-default">
             {format(currentTime, 'h:mm')}
             <span className="text-sm font-normal ml-1 text-gray-400">{format(currentTime, 'a')}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        
        {/* Next Class / Hero Card - Spans 8 columns on large screens */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative group lg:col-span-8 min-h-[220px] flex flex-col hover:shadow-md transition-all duration-300">
             {/* Gradient Overlay */}
             <div 
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ background: `linear-gradient(135deg, ${settings.accentColor}, transparent)` }} 
             />
             
             {/* Decorative Background Blob */}
             <div 
                className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-5 blur-3xl group-hover:opacity-10 transition-opacity duration-700"
                style={{ backgroundColor: settings.accentColor }} 
             />

            <div className="p-6 h-full flex flex-col justify-between relative z-10">
                <div className="flex items-center justify-between mb-4">
                     <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center">
                        <FaRegClock className="mr-2" />
                        {nextClassInfo?.type === 'tomorrow_overview' 
                            ? (nextClassInfo.dayLabel || (nextClassInfo.isTomorrow ? "Tomorrow" : "Up Next"))
                            : (nextClassInfo?.isTomorrow ? "Tomorrow" : "Up Next")
                        }
                     </h2>
                     {nextClassInfo?.type === 'next_class' && (
                         <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm animate-pulse" style={{ backgroundColor: settings.accentColor }}>
                             Starts in {nextClassInfo.timeUntil}
                         </span>
                     )}
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    {nextClassInfo?.type === 'next_class' && (
                        <div className="space-y-4">
                            <div>
                                <div className="text-4xl font-black text-gray-800 tracking-tighter mb-1">
                                    Year {nextClassInfo.classInfo.yearGroup}-{nextClassInfo.classInfo.classNumber}
                                </div>
                                <div className="text-lg font-medium text-gray-600 flex items-center">
                                  <FaSchool className="mr-2 opacity-50" />
                                  {nextClassInfo.schoolName}
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                              <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm shadow-sm">
                                  <span className="text-gray-500 font-bold mr-2 uppercase text-[10px]">Period</span>
                                  <span className="text-lg font-bold text-gray-800">{nextClassInfo.period.id}</span>
                              </div>
                              <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm shadow-sm">
                                  <span className="text-gray-500 font-bold mr-2 uppercase text-[10px]">Time</span>
                                  <span className="text-lg font-bold text-gray-800 font-mono tracking-tight">{nextClassInfo.period.startTime} - {nextClassInfo.period.endTime}</span>
                              </div>
                            </div>

                            {/* Last Time We Met Widget - Compact */}
                            {lastClassInfo && (
                                <div className="mt-3 pt-3 border-t border-gray-100/80 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex-shrink-0">
                                        Last Lesson • {format(lastClassInfo.date, 'MMM do')}
                                    </div>
                                    <div className="text-sm text-gray-600 font-medium truncate ml-1">
                                        "{lastClassInfo.summary || "No summary recorded."}"
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {nextClassInfo?.type === 'tomorrow_overview' && (
                        <div className="py-2 h-full flex flex-col relative w-full">
                             <div className="flex justify-between items-baseline mb-3">
                                <div className="text-3xl font-black text-gray-800 tracking-tight">{nextClassInfo.schoolName}</div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{nextClassInfo.totalClasses} classes</div>
                             </div>
                             
                             <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar -mr-2" style={{ maxHeight: '140px' }}>
                                {nextClassInfo.classes?.map((cls, idx) => (
                                    <div key={idx} className="flex items-center p-2.5 bg-gray-50/80 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors group/item">
                                        <div className="w-16 min-w-[4rem] text-center border-r border-gray-200 pr-3 mr-3">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5 tracking-wider group-hover/item:text-gray-500 transition-colors">Period {cls.period}</div>
                                            <div className="text-xs text-gray-600 font-mono font-bold">{cls.startTime}</div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xl font-black text-gray-800 leading-none tracking-tight">
                                                <span className="text-gray-400 font-medium text-sm mr-1">Yr</span>
                                                {cls.yearGroup}
                                                <span className="text-gray-300 mx-1">-</span>
                                                {cls.classNumber}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!nextClassInfo.classes || nextClassInfo.classes.length === 0) && (
                                    <div className="text-center py-4 text-gray-400 text-smitalic">No regular classes scheduled.</div>
                                )}
                             </div>
                        </div>
                    )}

                    {nextClassInfo?.type === 'finished' && (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl transform rotate-12">
                                ☕
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-1">All Done for Today!</h3>
                            <p className="text-sm text-gray-500">Great work. Time to relax.</p>
                        </div>
                    )}
                    
                    {nextClassInfo?.type === 'special' && (
                        <div className="text-center py-2">
                             <FaCalendarDay className="w-12 h-12 mx-auto text-gray-200 mb-2" />
                             <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">{format(nextClassInfo.date, 'MMMM do')}</div>
                            <h3 className="text-2xl font-black text-gray-800 tracking-tight">{nextClassInfo.title}</h3>
                        </div>
                    )}

                    {(nextClassInfo?.type === 'none') && (
                         <div className="text-center py-6">
                            <FaSchool className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                            <h3 className="text-lg font-medium text-gray-600">
                                {nextClassInfo.isTomorrow ? "No school scheduled for tomorrow." : "No classes scheduled for today."}
                            </h3>
                        </div>
                    )}
                </div>
            </div>
             {/* Dynamic Progress Bar */}
             <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-100/50">
                <div 
                    className="h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)]" 
                    style={{ 
                        width: nextClassInfo?.type === 'next_class' ? '100%' : '0%',
                        backgroundColor: settings.accentColor 
                    }} 
                />
             </div>
        </div>

        {/* Stats Card - Spans 4 columns */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col md:col-span-1 lg:col-span-4 min-h-[220px] hover:shadow-md transition-shadow">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center mb-4">
                <FaChalkboardTeacher className="mr-2" style={{ color: settings.accentColor }}/> 
                Your Impact
            </h2>
            
            <div className="flex-1 flex flex-col items-center justify-center relative">
                <div 
                    className="w-28 h-28 rounded-full flex items-center justify-center border-[6px] border-gray-50 mb-3 relative transition-transform hover:scale-105 duration-500"
                >
                     {/* Inner SVG Ring for visual flair */}
                     <svg className="absolute inset-0 w-full h-full -rotate-90">
                       <circle
                         cx="50%" cy="50%" r="44%"
                         fill="transparent"
                         stroke={settings.accentColor}
                         strokeWidth="6"
                         strokeOpacity="0.1"
                       />
                       <circle
                         cx="50%" cy="50%" r="44%"
                         fill="transparent"
                         stroke={settings.accentColor}
                         strokeWidth="6"
                         strokeDasharray="251.2"
                         strokeDashoffset={251.2 - (251.2 * 0.75)} 
                         strokeLinecap="round"
                         className="transition-all duration-1000 ease-out"
                       />
                     </svg>
                    
                    <div className="text-center z-10">
                      <span className="text-4xl font-black text-gray-800 block tracking-tighter">{stats.totalTaught}</span>
                    </div>
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Classes Taught</div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                <select 
                    className="flex-1 bg-gray-50 border-transparent hover:border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 py-1.5 px-2 focus:ring-1 focus:ring-offset-0 transition-all cursor-pointer"
                    style={{ focusRingColor: settings.accentColor }}
                    value={filterSchoolId}
                    onChange={(e) => setFilterSchoolId(e.target.value)}
                >
                    <option value="all">ALL SCHOOLS</option>
                    {schools.map(s => (
                        <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                    ))}
                </select>
                <select 
                    className="w-20 bg-gray-50 border-transparent hover:border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 py-1.5 px-2 focus:ring-1 focus:ring-offset-0 transition-all cursor-pointer"
                    style={{ focusRingColor: settings.accentColor }}
                    value={filterYearGroup}
                    onChange={(e) => setFilterYearGroup(e.target.value)}
                >
                    <option value="all">ALL YRS</option>
                    {[1,2,3,4,5,6].map(y => (
                        <option key={y} value={y}>YR {y}</option>
                    ))}
                </select>
            </div>
        </div>

        {/* Upcoming Events - Spans 8 columns (Moved up) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 lg:col-span-8 min-h-[240px] flex flex-col hover:shadow-md transition-shadow order-last lg:order-none">
             <div className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                <FaCalendar className="mr-2 opacity-50"/> Upcoming Events
            </div>
            
            {upcomingSpecialDays.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {upcomingSpecialDays.slice(0, 3).map((day, idx) => (
                        <div key={idx} className="flex items-center bg-gray-50 hover:bg-gray-100 rounded-lg p-2.5 border border-gray-100 transition-colors">
                                <div className="flex flex-col items-center justify-center px-3 border-r border-gray-200 mr-3">
                                <span className="text-[10px] uppercase font-black text-red-400 leading-none mb-0.5">{format(day.date, 'MMM')}</span>
                                <span className="text-xl font-black text-gray-800 leading-none">{format(day.date, 'd')}</span>
                                </div>
                                <div className="text-xs font-bold text-gray-700 truncate">
                                    {day.title}
                                </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                    <FaCalendar className="text-3xl mb-2 opacity-20"/>
                    <p className="text-xs font-medium">No upcoming events</p>
                </div>
            )}
        </div>

        {/* Todos Card - Spans 4 columns */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 lg:col-span-4 flex flex-col min-h-[240px] hover:shadow-md transition-shadow">
             <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center mb-3">
                <FaClipboardList className="mr-2" style={{ color: settings.accentColor }}/> 
                Quick Notes
            </h2>
            
            <form onSubmit={addTodo} className="flex gap-2 mb-3 relative group">
                <input 
                    type="text" 
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    placeholder="Add task..."
                    className="w-full pl-3 pr-8 py-2 bg-gray-50 border-none rounded-lg text-sm font-medium text-gray-700 placeholder-gray-400 focus:ring-1 focus:ring-opacity-50 transition-all shadow-inner focus:bg-white"
                    style={{ '--tw-ring-color': settings.accentColor }}
                />
                <button 
                    type="submit" 
                    className="absolute right-1.5 top-1.5 p-1 rounded-md text-white shadow-sm opacity-50 group-hover:opacity-100 hover:scale-105 transition-all"
                    style={{ backgroundColor: settings.accentColor }}
                >
                    <FaPlus size={10} />
                </button>
            </form>

            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                {todos.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                         <div className="text-2xl mb-1 opacity-20">📝</div>
                         <p className="text-xs font-medium">No tasks yet</p>
                    </div>
                )}
                {todos.map(todo => (
                    <div key={todo.id} className="flex items-start gap-2 p-2 bg-white hover:bg-gray-50 rounded-lg group transition-all border border-gray-100 hover:border-gray-200">
                        <button 
                            onClick={() => toggleTodo(todo.id)}
                            className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all duration-300 ${
                                todo.completed ? 'border-transparent' : 'border-gray-200 hover:border-gray-300'
                            }`}
                            style={todo.completed ? { backgroundColor: settings.accentColor } : {}}
                        >
                            {todo.completed && <FaCheck size={8} className="text-white transform scale-110" />}
                        </button>
                        <span className={`text-xs leading-snug flex-1 transition-all ${
                            todo.completed ? 'text-gray-400 line-through decoration-gray-200' : 'text-gray-700 font-medium'
                        }`}>
                            {todo.text}
                        </span>
                        <button 
                            onClick={() => deleteTodo(todo.id)}
                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 p-0.5"
                        >
                            <FaTrash size={10} />
                        </button>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;