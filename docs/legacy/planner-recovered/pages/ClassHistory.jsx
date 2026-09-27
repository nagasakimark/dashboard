import React, { useState, useMemo } from 'react';
import { format, parseISO, compareDesc } from 'date-fns';
import { FaSchool, FaSearch, FaFilter, FaChalkboardTeacher, FaCalendarAlt } from 'react-icons/fa';
import useIndexedDB from '../hooks/useIndexedDB';
import { useSettings } from '../contexts/SettingsContext';

const ClassHistory = () => {
  const { settings } = useSettings();
  const [schedule] = useIndexedDB('schedule', {});
  const [assignments] = useIndexedDB('assignments', {});
  const [schools] = useIndexedDB('schools', []);
  const [lessonPlans] = useIndexedDB('lessonPlans', []);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSchoolId, setFilterSchoolId] = useState('all');
  const [filterYearGroup, setFilterYearGroup] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const historyItems = useMemo(() => {
    if (!schedule || !assignments || !schools || !lessonPlans) return [];

    const items = [];

    Object.entries(schedule).forEach(([key, classData]) => {
      // Key format: YYYY-MM-DD-DayName-PeriodId
      const parts = key.split('-');
      // Basic validation of key format (at least 5 parts: Y, M, D, Day, Period)
      if (parts.length < 5) return;

      const dateStr = parts.slice(0, 3).join('-'); // YYYY-MM-DD
      const dayName = parts[3];
      const periodId = parts[parts.length - 1]; // Last part is periodId
      const assignmentKey = `${dateStr}-${dayName}`;
      
      const assignment = assignments[assignmentKey];
      const schoolId = assignment?.schoolId; // School assigned for that day
      
      // If filtering by school, we can skip early if possible, but we need school object for display
      const school = Array.isArray(schools) ? schools.find(s => String(s.id) === String(schoolId)) : null;
      
      // Resolve Lesson Plan
      const lessonPlan = (classData.lessonPlanId && Array.isArray(lessonPlans))
        ? lessonPlans.find(lp => String(lp.id) === String(classData.lessonPlanId))
        : null;

      // Determine display title: User requested summary to replace "No Title". 
      // We prioritize summary if available, then lesson plan title.
      // We also fallback to "Untitled Class" instead of "No Title" which looks nicer.
      const summary = classData.summary || classData.note || ''; 
      const title = summary || lessonPlan?.title || 'Untitled Class';
      
      // Content for search can come from lesson plan content
      let content = ''; 
      if (lessonPlan?.content) {
         if (typeof lessonPlan.content === 'string') content = lessonPlan.content;
         else if (lessonPlan.content.ops) content = lessonPlan.content.ops.map(op => op.insert).join(' ');
      }

      items.push({
        id: key,
        date: parseISO(dateStr),
        dateStr,
        dayName,
        periodId,
        school,
        schoolId: schoolId || 'unknown',
        yearGroup: classData.yearGroup,
        classNumber: classData.classNumber,
        lessonPlan,
        title,
        summary,
        content
      });
    });

    // Sort by date descending
    items.sort((a, b) => compareDesc(a.date, b.date));

    // Filter
    return items.filter(item => {
      // 1. School Filter
      if (filterSchoolId !== 'all' && String(item.schoolId) !== String(filterSchoolId)) return false;

      // 2. Year Group Filter
      if (filterYearGroup !== 'all' && String(item.yearGroup) !== String(filterYearGroup)) return false;

      // 3. Date Range Filter
      if (startDate && item.dateStr < startDate) return false;
      if (endDate && item.dateStr > endDate) return false;

      // 4. Search Term (Title, Summary, Content, Date)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(term);
        const matchesSummary = item.summary.toLowerCase().includes(term);
        const matchesContent = item.content.toLowerCase().includes(term);
        const matchesDate = item.dateStr.includes(term);

        if (!matchesTitle && !matchesSummary && !matchesContent && !matchesDate) return false;
      }

      return true;
    });
  }, [schedule, assignments, schools, lessonPlans, searchTerm, filterSchoolId, filterYearGroup, startDate, endDate]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Class History</h1>
        <p className="mt-2 text-gray-600">Search and filter through your past classes.</p>
      </div>

      {/* Filters Container */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Search */}
          <div className="relative lg:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* School Filter */}
          <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSchool className="text-gray-400" />
            </div>
            <select
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              value={filterSchoolId}
              onChange={(e) => setFilterSchoolId(e.target.value)}
            >
              <option value="all">All Schools</option>
              {schools && schools.map(school => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </div>

           {/* Year Group Filter */}
           <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaFilter className="text-gray-400" />
            </div>
            <select
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              value={filterYearGroup}
              onChange={(e) => setFilterYearGroup(e.target.value)}
            >
              <option value="all">All Year Groups</option>
              {/* Assuming Year Groups 1-6 + Kindergarten/Special logic if needed, sticking to 1-9 for generic */}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(year => (
                <option key={year} value={year}>Year {year}</option>
              ))}
            </select>
          </div>

          {/* Date Range Start */}
           <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaCalendarAlt className="text-gray-400" />
            </div>
            <input
              type="date"
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
            />
          </div>

          {/* Date Range End */}
           <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaCalendarAlt className="text-gray-400" />
            </div>
            <input
              type="date"
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
            />
          </div>

        </div>
      </div>

      {/* Results List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {historyItems.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {historyItems.map((item) => (
              <li key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center mb-2">
                       <span className="flex items-center text-sm font-medium text-gray-500 mr-4">
                          <FaCalendarAlt className="mr-1.5 h-4 w-4 text-gray-400" />
                          {format(item.date, 'MMM d, yyyy')} ({item.dayName})
                       </span>
                       {item.school ? (
                           <span className="flex items-center text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mr-2">
                              <FaSchool className="mr-1.5 h-3 w-3" />
                              {item.school.name}
                           </span>
                       ) : (
                           <span className="text-sm text-gray-400 mr-2">Unknown School</span>
                       )}
                       <span className="flex items-center text-sm font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <FaChalkboardTeacher className="mr-1.5 h-3 w-3" />
                          Year {item.yearGroup} - Class {item.classNumber}
                       </span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 truncate">{item.title}</h3>
                    {/* Optional: Show small preview of content or note */}
                    {(item.note || item.content) && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                            {/* Simple strip HTML or just show raw if simple */}
                            {item.note || 'Lesson Content Available'}
                        </p>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                     {/* Could add 'View Lesson' button here later */}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <p>No classes found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassHistory;
