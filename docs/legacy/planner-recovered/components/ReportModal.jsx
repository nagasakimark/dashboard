import React, { useState } from 'react';
import { startOfWeek, format, differenceInCalendarWeeks } from 'date-fns';

const ReportModal = ({ isOpen, onClose, onGenerate }) => {
  const [startDate, setStartDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [numWeeks, setNumWeeks] = useState(4);
  const [dateInput, setDateInput] = useState(format(startDate, 'yyyy-MM-dd'));

  if (!isOpen) return null;

  const handleDateChange = (e) => {
    const date = new Date(e.target.value);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    setStartDate(weekStart);
    setDateInput(e.target.value);
  };

  const handleSetWeeksUntilNow = () => {
    const today = new Date();
    const weeksDiff = differenceInCalendarWeeks(today, startDate, { weekStartsOn: 1 });
    const newNumWeeks = Math.max(1, weeksDiff + 1);
    setNumWeeks(newNumWeeks);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Generate Report</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={dateInput}
              onChange={handleDateChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Number of Weeks</label>
            <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={numWeeks}
                  onChange={(e) => setNumWeeks(Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
                <button
                    onClick={handleSetWeeksUntilNow}
                    className="px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm hover:bg-gray-200 whitespace-nowrap"
                    title="Calculate weeks until current week"
                >
                    Up to Now
                </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onGenerate(startDate, numWeeks)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Generate PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
