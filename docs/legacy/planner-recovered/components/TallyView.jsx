import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, addWeeks, subWeeks, parse, differenceInCalendarWeeks } from 'date-fns';
import { FaArrowLeft, FaArrowRight, FaCalendar, FaClock } from 'react-icons/fa';

const TallyView = ({ schedule, schools, assignments }) => {
  const [startDate, setStartDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [numWeeks, setNumWeeks] = useState(4);

  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateInput, setDateInput] = useState(format(startDate, 'yyyy-MM-dd'));

  
  const weeks = useMemo(() => {
    return Array.from({ length: numWeeks }, (_, i) => {
      const weekStart = addWeeks(startDate, i);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      return { start: weekStart, end: weekEnd };
    });
  }, [startDate, numWeeks]);

  console.log('Raw Data:', {
    schools,
    schedule,
    assignments
  });

  
  const schoolClasses = useMemo(() => {
    const result = {};
    
    
    if (!Array.isArray(schools)) return {};

    
    schools.forEach(school => {
      if (school && school.id) {  
        result[String(school.id)] = new Set();
      }
    });

    
    if (schedule && typeof schedule === 'object') {  
      Object.entries(schedule).forEach(([key, value]) => {
        if (!value?.yearGroup || !value?.classNumber) return;
        if (key.includes('-lunch')) return;

        const [year, month, day, dayName] = key.split('-');
        const dateStr = `${year}-${month}-${day}`;
        const assignmentKey = `${dateStr}-${dayName}`;
        const schoolId = assignments?.[assignmentKey]?.schoolId;  

        if (schoolId && result[String(schoolId)]) {  
          const classKey = `${value.yearGroup}-${value.classNumber}`;
          result[String(schoolId)].add(classKey);
        }
      });
    }

    
    const finalResult = {};
    Object.entries(result).forEach(([schoolId, classSet]) => {
      if (classSet instanceof Set) {  
        finalResult[schoolId] = Array.from(classSet).sort((a, b) => {
          const [aYear, aClass] = a.split('-').map(Number);
          const [bYear, bClass] = b.split('-').map(Number);
          return aYear === bYear ? aClass - bClass : aYear - bYear;
        });
      }
    });

    console.log('Processed school classes:', finalResult);
    return finalResult;
  }, [schools, schedule, assignments]);

  
  const calculateTallies = (week, schoolId, className) => {
    const days = eachDayOfInterval({ start: week.start, end: week.end });
    let count = 0;

    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayName = format(day, 'EEEE');
      const assignmentKey = `${dateStr}-${dayName}`;
      const daySchoolId = assignments[assignmentKey]?.schoolId;

      if (String(daySchoolId) === String(schoolId)) {
        
        Object.entries(schedule).forEach(([key, value]) => {
          if (key.includes('-lunch')) return; 
          if (!key.startsWith(`${dateStr}-${dayName}`)) return; 
          
          if (value?.yearGroup && 
              value?.classNumber && 
              `${value.yearGroup}-${value.classNumber}` === className) {
            count++;
          }
        });
      }
    });

    return count;
  };

  
  const calculateColumnTotal = (schoolId, className) => {
    return weeks.reduce((total, week) => {
      return total + calculateTallies(week, schoolId, className);
    }, 0);
  };

  const handleDateChange = (e) => {
    setDateInput(e.target.value);
  };

  const handleDateSubmit = () => {
    try {
      const newDate = parse(dateInput, 'yyyy-MM-dd', new Date());
      setStartDate(startOfWeek(newDate, { weekStartsOn: 1 }));
      setShowDatePicker(false);
    } catch (error) {
      console.error('Invalid date format');
    }
  };

  const handleSetWeeksUntilNow = () => {
    const today = new Date();
    // Calculate full weeks between startDate and today
    // if startDate is in future relative to today, this might be negative, so clamp to 1
    const weeksDiff = differenceInCalendarWeeks(today, startDate, { weekStartsOn: 1 });
    const newNumWeeks = Math.max(1, weeksDiff + 1);
    setNumWeeks(newNumWeeks);
  };

  const cellRef = useRef(null);
  const observerRef = useRef(null);
  const [diagonalStyles, setDiagonalStyles] = useState({
    width: '100%',
    transform: 'rotate(45deg)'
  });

  const updateDiagonal = useCallback(() => {
    if (cellRef.current) {
      const cell = cellRef.current;
      const rect = cell.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      
      
      const length = Math.sqrt(width * width + height * height) + 8; 
      const angle = Math.atan2(height, width) * (180 / Math.PI);

      requestAnimationFrame(() => {
        setDiagonalStyles({
          width: `${length}px`,
          transform: `rotate(${angle}deg)`,
          top: '-2px', 
          left: '-2px'
        });
      });
    }
  }, []);

  useEffect(() => {
    
    observerRef.current = new ResizeObserver((entries) => {
      
      setTimeout(updateDiagonal, 0);
    });

    if (cellRef.current) {
      observerRef.current.observe(cellRef.current);
      updateDiagonal();
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [updateDiagonal]);

  
  useEffect(() => {
    updateDiagonal();
  }, [weeks, updateDiagonal]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setStartDate(date => subWeeks(date, numWeeks))}
            className="btn-primary flex items-center"
          >
            <FaArrowLeft className="mr-2" /> Previous Period
          </button>
          <button
            onClick={() => setStartDate(date => addWeeks(date, numWeeks))}
            className="btn-primary flex items-center"
          >
            Next Period <FaArrowRight className="ml-2" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="btn-secondary flex items-center"
            >
              <FaCalendar className="mr-2" /> Set Start Date
            </button>
            {showDatePicker && (
              <div className="absolute mt-2 p-2 bg-white border rounded-lg shadow-lg z-10 w-64">
                <input
                  type="date"
                  value={dateInput}
                  onChange={handleDateChange}
                  className="border rounded px-2 py-1 mb-2 w-full"
                />
                <div className="flex gap-2 justify-end">
                    <button
                      onClick={handleDateSubmit}
                      className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      Set Date
                    </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSetWeeksUntilNow}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded border border-gray-300 flex items-center h-full mr-2"
            title="Set number of weeks to include up to current week"
          >
            <FaClock className="mr-1" /> Up to Now
          </button>
          <label>Number of weeks:</label>
          <input
            type="number"
            min="1"
            max="52"
            value={numWeeks}
            onChange={(e) => setNumWeeks(Number(e.target.value))}
            className="border rounded px-2 py-1 w-20"
          />
        </div>
      </div>

      <div className="w-full">
        <table className="w-full border-collapse" style={{ border: '2px solid #94A3B8' }}>
          <thead>
            <tr>
              <th
                style={{ 
                  border: '2px solid #94A3B8',
                  padding: '8px'
                }}
              >
                School
              </th>
              {schools.map((school, schoolIndex) => {
                const schoolClassesList = schoolClasses[String(school.id)] || [];
                return schoolClassesList.length > 0 ? (
                  <th
                    key={school.id}
                    colSpan={schoolClassesList.length}
                    style={{ 
                      backgroundColor: `${school.accentColor}20`,
                      borderBottom: '2px solid #94A3B8',
                      borderRight: '2px solid #94A3B8',
                      borderLeft: schoolIndex === 0 ? '2px solid #94A3B8' : '1px solid #CBD5E0',
                      padding: '8px'
                    }}
                  >
                    {school.name}
                  </th>
                ) : null;
              })}
            </tr>
            <tr>
              <th 
                ref={cellRef}
                style={{ 
                  border: '2px solid #94A3B8',
                  padding: '8px',
                  position: 'relative',
                  height: '60px',
                  minWidth: 'max-content'
                }}
              >
                {}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    overflow: 'hidden',
                    pointerEvents: 'none'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      height: '2px',
                      background: '#94A3B8',
                      transformOrigin: '0 0',
                      ...diagonalStyles
                    }}
                  />
                </div>
                {}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    maxWidth: '45%',
                    zIndex: 1
                  }}
                >
                  Week
                </div>
                {}
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    maxWidth: '45%',
                    zIndex: 1
                  }}
                >
                  Class
                </div>
              </th>
              {schools.map(school => {
                const schoolClassesList = schoolClasses[String(school.id)] || [];
                return schoolClassesList.map((className, index) => (
                  <th
                    key={`${school.id}-${className}`}
                    style={{ 
                      backgroundColor: `${school.accentColor}10`,
                      height: '60px',
                      minWidth: '32px',
                      position: 'relative',
                      padding: 0,
                      borderBottom: '2px solid #94A3B8',
                      borderRight: index === schoolClassesList.length - 1 ? '2px solid #94A3B8' : '1px solid #CBD5E0',
                      borderLeft: 0
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%) rotate(-90deg)',
                        width: 'max-content',
                        textAlign: 'center',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {className}
                    </div>
                  </th>
                ));
              })}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, i) => (
              <tr key={i}>
                <td
                  style={{
                    borderRight: '2px solid #94A3B8',
                    borderBottom: '1px solid #CBD5E0',
                    padding: '8px'
                  }}
                >
                  {format(week.start, 'MMM d')} - {format(week.end, 'MMM d')}
                </td>
                {schools.map(school => {
                  const schoolClassesList = schoolClasses[String(school.id)] || [];
                  return schoolClassesList.map((className, index) => (
                    <td
                      key={`${school.id}-${className}`}
                      style={{ 
                        backgroundColor: `${school.accentColor}10`,
                        minWidth: '32px',
                        height: '32px',
                        textAlign: 'center',
                        padding: '4px',
                        borderRight: index === schoolClassesList.length - 1 ? '2px solid #94A3B8' : '1px solid #CBD5E0',
                        borderBottom: '1px solid #CBD5E0'
                      }}
                    >
                      {calculateTallies(week, school.id, className)}
                    </td>
                  ));
                })}
              </tr>
            ))}
            <tr>
              <td
                style={{
                  borderTop: '2px solid #94A3B8',
                  borderRight: '2px solid #94A3B8',
                  padding: '8px',
                  fontWeight: 'bold'
                }}
              >
                Total
              </td>
              {schools.map(school => {
                const schoolClassesList = schoolClasses[String(school.id)] || [];
                return schoolClassesList.map((className, index) => (
                  <td
                    key={`${school.id}-${className}`}
                    style={{ 
                      backgroundColor: `${school.accentColor}30`,
                      minWidth: '32px',
                      padding: '4px',
                      textAlign: 'center',
                      borderTop: '2px solid #94A3B8',
                      borderRight: index === schoolClassesList.length - 1 ? '2px solid #94A3B8' : '1px solid #CBD5E0',
                      fontWeight: 'bold'
                    }}
                  >
                    {calculateColumnTotal(school.id, className)}
                  </td>
                ));
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TallyView;
