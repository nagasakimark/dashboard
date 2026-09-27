import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const SPECIAL_OPTIONS = [
  'Paid Leave',
  'Sick Leave', 
  'Special Leave',
  'Substitute Holiday',
  'Public Holiday',
  'BoE',
  'Event'
];

const SchoolSelectModal = ({ isOpen, onClose, schools, selectedSchool, onSelect, onRemove }) => {
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [specialOption, setSpecialOption] = useState('');

  useEffect(() => {
    if (selectedSchool) {
      setSelectedSchoolId(selectedSchool.schoolId);
      setSelectedScheduleId(selectedSchool.scheduleId);
    } else {
      setSelectedSchoolId(null);
      setSelectedScheduleId(null);
    }
  }, [selectedSchool]);

  const handleSchoolSelect = (schoolId) => {
    setSelectedSchoolId(schoolId);
    const school = schools.find(s => s.id === schoolId);
    if (school?.timeSchedules?.length > 0) {
      setSelectedScheduleId(school.timeSchedules[0].id);
    }
  };

  const handleScheduleSelect = (scheduleId) => {
    setSelectedScheduleId(scheduleId);
    onSelect(selectedSchoolId, scheduleId);
    onClose();
  };

  const handleSpecialOptionSelect = (value) => {
    setSpecialOption(value);
    if (value) {
      onSelect(`special_${value}`, null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Select School</h2>
        
        {}
        <div className="space-y-2 mb-4">
          {schools.map(school => (
            <div key={school.id} className="space-y-2">
              <button
                onClick={() => handleSchoolSelect(school.id)}
                className={`w-full p-2 text-left rounded ${
                  selectedSchoolId === school.id
                    ? 'bg-blue-100 border-blue-500'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                style={{ 
                  borderLeft: `4px solid ${school.accentColor}`
                }}
              >
                {school.name}
              </button>
              
              {}
              {selectedSchoolId === school.id && school.timeSchedules?.length > 0 && (
                <div className="ml-4 space-y-2">
                  {school.timeSchedules.map(schedule => (
                    <button
                      key={schedule.id}
                      onClick={() => handleScheduleSelect(schedule.id)}
                      className={`w-full p-2 text-left rounded ${
                        selectedScheduleId === schedule.id
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {schedule.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Special Assignment</h3>
          <select
            value={specialOption}
            onChange={(e) => handleSpecialOptionSelect(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Special Assignment</option>
            {SPECIAL_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        {}
        <div className="flex justify-between mt-4">
          <button
            onClick={onRemove}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Remove
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SchoolSelectModal;
