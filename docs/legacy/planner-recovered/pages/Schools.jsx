import React, { useState } from 'react';
import useIndexedDB from '../hooks/useIndexedDB';
import { FaEdit, FaTrash } from 'react-icons/fa';

const Schools = () => {
  const [schools, setSchools] = useIndexedDB('schools', []);
  const [newSchool, setNewSchool] = useState({
    name: '',
    accentColor: '#4F46E5',
    lunchPeriod: 3,
    jtes: [''], 
    classes: [], 
    timeSchedules: [{
      id: Date.now(),
      name: 'Default Schedule',
      periods: Array(6).fill(null).map((_, i) => ({
        id: i + 1,
        startTime: '',
        endTime: ''
      })),
      lunchTime: {
        startTime: '',
        endTime: ''
      }
    }]
  });
  const [editingSchool, setEditingSchool] = useState(null);
  const [formMode, setFormMode] = useState('closed'); 
  const [activeScheduleIndex, setActiveScheduleIndex] = useState(0);

  
  if (schools === undefined) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center"></h1>
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-500">Loading Schools...</div>
        </div>
      </div>
    );
  }

  
  const safeSchools = Array.isArray(schools) ? schools : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const schoolData = {
      id: editingSchool ? editingSchool.id : String(Date.now() + Math.random()),
      name: newSchool.name,
      accentColor: newSchool.accentColor,
      lunchPeriod: parseInt(newSchool.lunchPeriod),
      jtes: newSchool.jtes.filter(jte => jte.trim() !== ''),
      classes: newSchool.classes,
      timeSchedules: newSchool.timeSchedules
    };

    const updatedSchools = editingSchool
      ? safeSchools.map(school => school.id === editingSchool.id ? schoolData : school)
      : [...safeSchools, schoolData];

    await setSchools(updatedSchools);
    
    
    setNewSchool({
      name: '',
      accentColor: '#4F46E5',
      lunchPeriod: 3,
      jtes: [''],
      classes: [],
      timeSchedules: [{
        id: Date.now(),
        name: 'Default Schedule',
        periods: Array(6).fill(null).map((_, i) => ({
          id: i + 1,
          startTime: '',
          endTime: ''
        })),
        lunchTime: {
          startTime: '',
          endTime: ''
        }
      }]
    });
    setEditingSchool(null);
    setFormMode('closed');
  };

  const handleEdit = (school) => {
    setNewSchool({
      name: school.name,
      accentColor: school.accentColor,
      lunchPeriod: school.lunchPeriod,
      jtes: school.jtes || [''],
      classes: school.classes || [],
      timeSchedules: school.timeSchedules || [{
        id: Date.now(),
        name: 'Default Schedule',
        periods: Array(6).fill(null).map((_, i) => ({
          id: i + 1,
          startTime: '',
          endTime: ''
        })),
        lunchTime: {
          startTime: '',
          endTime: ''
        }
      }]
    });
    setEditingSchool(school);
    setFormMode('edit');
  };

  const handleDelete = async (schoolId) => {
    if (window.confirm('Are you sure you want to delete this school? This action cannot be undone.')) {
      const updatedSchools = safeSchools.filter(school => school.id !== schoolId);
      await setSchools(updatedSchools);
    }
  };

  const handleCancel = () => {
    setNewSchool({
      name: '',
      accentColor: '#4F46E5',
      lunchPeriod: 3,
      jtes: [''],
      classes: [],
      timeSchedules: [{
        id: Date.now(),
        name: 'Default Schedule',
        periods: Array(6).fill(null).map((_, i) => ({
          id: i + 1,
          startTime: '',
          endTime: ''
        })),
        lunchTime: {
          startTime: '',
          endTime: ''
        }
      }]
    });
    setEditingSchool(null);
    setFormMode('closed');
  };

  const handleAddJTE = () => {
    setNewSchool(prev => ({
      ...prev,
      jtes: [...prev.jtes, '']
    }));
  };

  const handleRemoveJTE = (index) => {
    setNewSchool(prev => ({
      ...prev,
      jtes: prev.jtes.filter((_, i) => i !== index),
      
      classes: prev.classes.map(c => 
        c.jteIndex === index 
          ? { ...c, jteIndex: -1 }
          : c.jteIndex > index 
            ? { ...c, jteIndex: c.jteIndex - 1 }
            : c
      )
    }));
  };

  const handleJTEChange = (index, value) => {
    setNewSchool(prev => ({
      ...prev,
      jtes: prev.jtes.map((jte, i) => i === index ? value : jte)
    }));
  };

  const handleAddClass = () => {
    setNewSchool(prev => ({
      ...prev,
      classes: [...prev.classes, { yearGroup: 1, classNumber: 1, jteIndex: -1 }]
    }));
  };

  const handleRemoveClass = (index) => {
    setNewSchool(prev => ({
      ...prev,
      classes: prev.classes.filter((_, i) => i !== index)
    }));
  };

  const handleClassChange = (index, field, value) => {
    setNewSchool(prev => ({
      ...prev,
      classes: prev.classes.map((c, i) => 
        i === index ? { ...c, [field]: value } : c
      )
    }));
  };

  const handleAddSchedule = () => {
    setNewSchool(prev => ({
      ...prev,
      timeSchedules: [
        ...prev.timeSchedules,
        {
          id: Date.now(),
          name: `Schedule ${prev.timeSchedules.length + 1}`,
          periods: Array(6).fill(null).map((_, i) => ({
            id: i + 1,
            startTime: '',
            endTime: ''
          })),
          lunchTime: {
            startTime: '',
            endTime: ''
          }
        }
      ]
    }));
    setActiveScheduleIndex(newSchool.timeSchedules.length);
  };

  const handleScheduleChange = (scheduleIndex, field, value) => {
    setNewSchool(prev => ({
      ...prev,
      timeSchedules: prev.timeSchedules.map((schedule, idx) =>
        idx === scheduleIndex ? { ...schedule, [field]: value } : schedule
      )
    }));
  };

  const handlePeriodTimeChange = (scheduleIndex, periodId, field, value) => {
    setNewSchool(prev => ({
      ...prev,
      timeSchedules: prev.timeSchedules.map((schedule, idx) =>
        idx === scheduleIndex ? {
          ...schedule,
          periods: schedule.periods.map(period =>
            period.id === periodId ? { ...period, [field]: value } : period
          )
        } : schedule
      )
    }));
  };

  const handleLunchTimeChange = (scheduleIndex, field, value) => {
    setNewSchool(prev => ({
      ...prev,
      timeSchedules: prev.timeSchedules.map((schedule, idx) =>
        idx === scheduleIndex ? {
          ...schedule,
          lunchTime: { ...schedule.lunchTime, [field]: value }
        } : schedule
      )
    }));
  };

  const handleDeleteSchedule = (scheduleIndex) => {
    if (newSchool.timeSchedules.length <= 1) return; 
    setNewSchool(prev => ({
      ...prev,
      timeSchedules: prev.timeSchedules.filter((_, idx) => idx !== scheduleIndex)
    }));
    setActiveScheduleIndex(0);
  };

  const renderTimeSchedules = () => (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Time Schedules</h3>
        <button
          type="button"
          onClick={handleAddSchedule}
          className="btn-secondary text-sm"
        >
          Add Schedule
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          {newSchool.timeSchedules.map((schedule, idx) => (
            <button
              key={schedule.id}
              type="button"
              onClick={() => setActiveScheduleIndex(idx)}
              className={`px-4 py-2 rounded ${
                activeScheduleIndex === idx
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {schedule.name}
            </button>
          ))}
        </div>

        <div className="bg-gray-50 p-4 rounded">
          <div className="flex justify-between items-center mb-4">
            <input
              type="text"
              value={newSchool.timeSchedules[activeScheduleIndex].name}
              onChange={(e) => handleScheduleChange(activeScheduleIndex, 'name', e.target.value)}
              className="p-2 border rounded"
              placeholder="Schedule Name"
            />
            {newSchool.timeSchedules.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeleteSchedule(activeScheduleIndex)}
                className="text-red-600 hover:text-red-800"
              >
                Delete Schedule
              </button>
            )}
          </div>

          <div className="grid gap-4">
            {newSchool.timeSchedules[activeScheduleIndex].periods.map((period) => (
              <div key={period.id} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Period {period.id} Start
                  </label>
                  <input
                    type="time"
                    value={period.startTime}
                    onChange={(e) => handlePeriodTimeChange(activeScheduleIndex, period.id, 'startTime', e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Period {period.id} End
                  </label>
                  <input
                    type="time"
                    value={period.endTime}
                    onChange={(e) => handlePeriodTimeChange(activeScheduleIndex, period.id, 'endTime', e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                  />
                </div>
                {period.id === newSchool.lunchPeriod && (
                  <div className="col-span-2 grid grid-cols-2 gap-4 mt-2 bg-yellow-50 p-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Lunch Start
                      </label>
                      <input
                        type="time"
                        value={newSchool.timeSchedules[activeScheduleIndex].lunchTime.startTime}
                        onChange={(e) => handleLunchTimeChange(activeScheduleIndex, 'startTime', e.target.value)}
                        className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Lunch End
                      </label>
                      <input
                        type="time"
                        value={newSchool.timeSchedules[activeScheduleIndex].lunchTime.endTime}
                        onChange={(e) => handleLunchTimeChange(activeScheduleIndex, 'endTime', e.target.value)}
                        className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-4 mb-4"> {/* Reduced padding */}
      <div className="grid grid-cols-2 gap-4"> {/* Changed to 2 columns */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
          <input
            type="text"
            value={newSchool.name}
            onChange={(e) => setNewSchool(prev => ({ ...prev, name: e.target.value }))}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lunch After Period</label>
          <select
            value={newSchool.lunchPeriod}
            onChange={(e) => setNewSchool(prev => ({
              ...prev,
              lunchPeriod: parseInt(e.target.value)
            }))}
            className="w-full p-2 border rounded"
          >
            {[1,2,3,4,5].map(num => (
              <option key={num} value={num}>After Period {num}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
          <input
            type="color"
            value={newSchool.accentColor}
            onChange={(e) => setNewSchool(prev => ({ ...prev, accentColor: e.target.value }))}
            className="w-16 p-1 border rounded"
          />
        </div>
      </div>

      {/* JTE Section */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">JTE Teachers</h3>
          <button
            type="button"
            onClick={handleAddJTE}
            className="btn-secondary text-sm"
          >
            Add JTE
          </button>
        </div>
        <div className="space-y-2">
          {newSchool.jtes.map((jte, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={jte}
                onChange={(e) => handleJTEChange(index, e.target.value)}
                placeholder="JTE Name"
                className="flex-1 p-2 border rounded"
              />
              <button
                type="button"
                onClick={() => handleRemoveJTE(index)}
                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Classes Section */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Classes</h3>
          <button
            type="button"
            onClick={handleAddClass}
            className="btn-secondary text-sm"
          >
            Add Class
          </button>
        </div>
        <div className="space-y-2">
          {newSchool.classes.map((cls, index) => (
            <div key={index} className="flex gap-2 items-center">
              <select
                value={cls.yearGroup}
                onChange={(e) => handleClassChange(index, 'yearGroup', parseInt(e.target.value))}
                className="p-2 border rounded"
              >
                {[1,2,3,4,5,6].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <span>-</span>
              <select
                value={cls.classNumber}
                onChange={(e) => handleClassChange(index, 'classNumber', parseInt(e.target.value))}
                className="p-2 border rounded"
              >
                {[1,2,3,4,5,6,7,8,9,10].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
              <select
                value={cls.jteIndex}
                onChange={(e) => handleClassChange(index, 'jteIndex', parseInt(e.target.value))}
                className="flex-1 p-2 border rounded"
              >
                <option value={-1}>Select JTE</option>
                {newSchool.jtes.map((jte, jteIndex) => (
                  <option key={jteIndex} value={jteIndex}>{jte || `JTE ${jteIndex + 1}`}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleRemoveClass(index)}
                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {renderTimeSchedules()}

      <div className="flex justify-between items-center mt-4">
        <div className="flex gap-2">
          {formMode === 'edit' && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this school? This will also remove all associated schedule entries.')) {
                  handleDelete(editingSchool.id);
                  setFormMode('closed');
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete School
            </button>
          )}
        </div>
        <button 
          type="submit" 
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          {formMode === 'edit' ? 'Update School' : 'Add School'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="max-w-4xl mx-auto p-2">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => formMode === 'closed' ? setFormMode('add') : handleCancel()}
          className="btn-primary"
        >
          {formMode === 'closed' ? 'Add School' : 'Cancel'}
        </button>
      </div>

      {formMode !== 'closed' && renderForm()}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {safeSchools.length > 0 ? (
          safeSchools.map(school => (
            <div 
              key={school.id} 
              onClick={() => handleEdit(school)}
              className="group bg-white rounded-lg shadow hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden border border-gray-100 hover:border-gray-200"
            >
              <div 
                className="h-1.5 w-full group-hover:h-2 transition-all duration-200"
                style={{ backgroundColor: school.accentColor }}
              />
              
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-lg font-medium group-hover:text-blue-600 transition-colors">
                    {school.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {school.classes?.length || 0} classes • {school.jtes?.length || 0} JTEs
                  </p>
                </div>

                <div className="text-sm text-gray-600">
                  <p>Lunch after Period {school.lunchPeriod}</p>
                  <p>{school.timeSchedules?.length || 1} time schedule(s)</p>
                </div>

                {school.jtes?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {school.jtes.map((jte, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full"
                      >
                        {jte}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500 py-8 bg-white rounded-lg">
            No schools added yet. Add your first school using the button above.
          </div>
        )}
      </div>
    </div>
  );
};

export default Schools;
