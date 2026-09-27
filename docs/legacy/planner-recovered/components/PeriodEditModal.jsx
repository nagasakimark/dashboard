import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaHistory } from 'react-icons/fa';
import { parseISO, compareDesc } from 'date-fns';

function PeriodEditModal({ isOpen, onClose, currentData, onSave, onRemove, textbooks, lessonPlans, className, schedule = {} }) {
  const [selectedType, setSelectedType] = useState('class');
  const [yearGroup, setYearGroup] = useState('');
  const [classNumber, setClassNumber] = useState('');
  const [summary, setSummary] = useState('');
  const navigate = useNavigate();

  const [selectedLessonPlanId, setSelectedLessonPlanId] = useState(null);

  useEffect(() => {
    console.log('Current Data:', currentData);
    if (currentData) {
      if (currentData.special) {
        setSelectedType(currentData.special);
        setYearGroup('');
        setClassNumber('');
      } else {
        setSelectedType(currentData.periodType === 'lunch' ? 'lunch' : 'class');
        setYearGroup(currentData.yearGroup?.toString() || '');
        setClassNumber(currentData.classNumber?.toString() || '');
      }
      setSummary(currentData.summary || '');
      setSelectedLessonPlanId(currentData.lessonPlanId || null);
    } else {
      setSelectedType('class');
      setYearGroup('');
      setClassNumber('');
      setSummary('');
      setSelectedLessonPlanId(null);
    }
  }, [currentData]);

  const existingLessonPlan = selectedLessonPlanId 
      ? lessonPlans?.find(p => p.id === selectedLessonPlanId)
      : (currentData?.lessonPlan || (currentData?.lessonPlanId && lessonPlans?.find(p => p.id === currentData.lessonPlanId)));

  const handleTypeChange = (type) => {
    setSelectedType(type);
    if (type === 'Lesson Planning' || type === 'Marking') {
      setSummary(type);
      setYearGroup('');
      setClassNumber('');
    } else if (type !== 'class' && type !== 'lunch') {
      setYearGroup('');
      setClassNumber('');
    }
  };

  const handleClassChange = (field, value) => {
    if (field === 'yearGroup') {
      setYearGroup(value);
    } else {
      setClassNumber(value);
    }
  };

  const handleSummaryChange = (value) => {
    setSummary(value);
  };

  const handleCopyPreviousSummary = () => {
    if (!yearGroup || !classNumber || !schedule) return;

    const currentYear = parseInt(yearGroup);
    const currentClass = parseInt(classNumber);
    
    // Parse current date
    let currentDateObj = new Date(); // Default to now (future planning)
    if (currentData?.date) {
        // currentData.date from DailySchedule is "yyyy-MM-dd-DayName" so parseISO fails on it directly
        // We need to extract just the yyyy-MM-dd part
        const parts = currentData.date.split('-');
        if (parts.length >= 3) {
             const cleanDateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
             currentDateObj = parseISO(cleanDateStr);
        }
    }
    
    // Fallback if parsing failed
    if (isNaN(currentDateObj.getTime())) {
        currentDateObj = new Date();
    }

    const previousEntry = Object.entries(schedule)
      .map(([key, value]) => {
          const parts = key.split('-');
          if (parts.length < 4) return null; // yyyy-MM-dd-Day...
          const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
          
          // Extract periodId from the end of the key (e.g. ...-DayName-1)
          const periodId = parseInt(parts[parts.length - 1]);

          return {
              dateStr,
              date: parseISO(dateStr),
              periodId: isNaN(periodId) ? 0 : periodId,
              ...value
          };
      })
      .filter(entry => entry && entry.yearGroup === currentYear) // Match Year Group only (any class)
      .filter(entry => entry.summary && entry.summary.trim().length > 0) // Has summary
      .filter(entry => {
          // Strict previous check
          if (!currentData?.date) return true; // If no current date, assume all are valid (or just take latest)
          
          // compareDesc(a, b): -1 if a > b (a is after b), 1 if a < b (a is before b), 0 if same
          // We want entries where Current > Entry (Past). So result -1.
          const dateComparison = compareDesc(currentDateObj, entry.date);
          
          if (dateComparison === -1) return true; // Entry is on a past date
          if (dateComparison === 1) return false; // Entry is in future
          
          // If Same Day (0): Check Period ID
          // We want Entry Period < Current Period
          const currentPeriod = parseInt(currentData?.periodId || 0);
          return entry.periodId < currentPeriod;
      })
      .sort((a, b) => {
          // Sort logic: We want the "Latest" one at the top [0]
          // Primary: Date (descending - latest first)
          const dateComp = compareDesc(a.date, b.date); // -1 if a > b (a is later). 
          // Wait, compareDesc(later, earlier) returns -1. 
          // Sort order: [Later, Earlier].
          // So if compareDesc returns -1, a comes first. Correct.
          
          if (dateComp !== 0) return dateComp;
          
          // Secondary: Period (descending - higher period first)
          return b.periodId - a.periodId; 
      }) 
      [0]; // Take the first one

    if (previousEntry) {
        setSummary(previousEntry.summary);
        if (previousEntry.lessonPlanId) {
            setSelectedLessonPlanId(previousEntry.lessonPlanId);
        }
    } else {
        // Optional: toast or shake or nothing
        console.log("No previous summary found", {
            currentYear, 
            currentClass, 
            currentDateObj,
            entriesCount: Object.keys(schedule).length 
        });
    }
  };

  const handleSaveAll = async () => {
    try {
      if (selectedType === 'class') {
        if (yearGroup && classNumber) {
          await onSave(yearGroup, classNumber, {
            yearGroup: parseInt(yearGroup),
            classNumber: parseInt(classNumber),
            summary,
            type: 'class',
            special: null,
            lessonPlanId: selectedLessonPlanId || currentData?.lessonPlanId
          });
        }
      } else if (selectedType === 'lunch') {
        if (yearGroup && classNumber) {
          await onSave(yearGroup, classNumber, {
            yearGroup: parseInt(yearGroup),
            classNumber: parseInt(classNumber),
            type: 'class',
            special: null
          });
        }
      } else if (selectedType === 'Lesson Planning' || selectedType === 'Marking') {
         // Treat as 'Other' type but with auto-filled summary
         await onSave('other', selectedType, {
            type: 'other',
            special: 'Other', // Or maybe specific? sticking to 'Other' keeps color scheme consistent usually
            summary: summary || selectedType, // Use summary if edited, or default
            yearGroup: null,
            classNumber: null
         });
      } else {
        await onSave('special', selectedType, {
          type: 'special',
          special: selectedType,
          summary,
          yearGroup: null,
          classNumber: null
        });
      }
      onClose();
    } catch (error) {
      console.error('Error saving period:', error);
    }
  };

  const handleSelectLessonPlan = () => {
    const periodData = {
      yearGroup: parseInt(yearGroup) || 1,
      classNumber: parseInt(classNumber) || 1,
      date: currentData?.date,
      periodId: currentData?.periodId,
      returnTo: '/'
    };

    sessionStorage.setItem('periodSelection', JSON.stringify(periodData));

    navigate('/lesson-plans', {
      state: {
        selectionMode: true,
        yearGroup: parseInt(yearGroup) || 1,
        returnTo: '/'
      }
    });
    onClose();
  };

  const handleLessonPlanSelect = (lessonPlanId) => {
    onSave(yearGroup, classNumber, {
      yearGroup: parseInt(yearGroup),
      classNumber: parseInt(classNumber),
      summary,
      type: 'class',
      special: null,
      lessonPlanId: lessonPlanId
    });
    onClose();
  };

  const filteredLessonPlans = lessonPlans?.filter(plan => 
    plan.yearGroup === parseInt(yearGroup) && 
    plan.classNumber === parseInt(classNumber)
  ) || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className={className}>
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type
          </label>
          <select
            value={selectedType}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="class">Class</option>
            <option value="lunch">Lunch</option>
            <option value="Lesson Planning">Lesson Planning</option>
            <option value="Marking">Marking</option>
            <option value="Paid Leave">Paid Leave</option>
            <option value="Sick Leave">Sick Leave</option>
            <option value="Special Leave">Special Leave</option>
            <option value="Public Holiday">Public Holiday</option>
            <option value="Substitute Holiday">Substitute Holiday</option>
            <option value="BoE">BoE</option>
            <option value="Event">Event</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {(selectedType === 'class' || selectedType === 'lunch') && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <select
                value={yearGroup}
                onChange={(e) => handleClassChange('yearGroup', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select Year</option>
                {[1, 2, 3, 4, 5, 6].map(year => (
                  <option key={year} value={year}>Year {year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class
              </label>
              <select
                value={classNumber}
                onChange={(e) => handleClassChange('classNumber', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select Class</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                  <option key={num} value={num}>Class {num}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {selectedType !== 'lunch' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Summary
            </label>
            <div className="flex gap-2">
                <input
                type="text"
                value={summary}
                onChange={(e) => handleSummaryChange(e.target.value)}
                className="flex-1 p-2 border rounded"
                placeholder="Add a summary..."
                />
                {(selectedType === 'class' || (yearGroup && classNumber)) && (
                    <button 
                        onClick={handleCopyPreviousSummary}
                        className="p-2 border border-gray-300 rounded bg-gray-50 hover:bg-gray-100 text-gray-600"
                        title="Copy summary from previous lesson"
                        type="button"
                    >
                        <FaHistory />
                    </button>
                )}
            </div>
          </div>
        )}

        {selectedType === 'class' && yearGroup && classNumber && (
          <div className="space-y-4">
            {existingLessonPlan ? (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Current Lesson Plan</h3>
                <p className="text-sm text-gray-700">{existingLessonPlan.title}</p>
                <div className="mt-2 flex justify-end space-x-2">
                  <button
                    onClick={() => navigate(`/lesson-plans`, { 
                      state: { editPlan: existingLessonPlan, returnTo: '/' }
                    })}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View/Edit Plan
                  </button>
                  <button
                    onClick={handleSelectLessonPlan}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Change Plan
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSelectLessonPlan}
                className="w-full bg-blue-500 text-white rounded px-4 py-2 flex items-center justify-center"
              >
                Select Lesson Plan
              </button>
            )}
          </div>
        )}

        <div>
          <button
            onClick={handleSaveAll}
            className="w-full bg-blue-500 text-white rounded px-4 py-2"
          >
            Save Changes
          </button>
        </div>

        <div>
          <button
            onClick={onRemove}
            className="w-full bg-red-500 text-white rounded px-4 py-2"
          >
            Remove Assignment
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default PeriodEditModal;

