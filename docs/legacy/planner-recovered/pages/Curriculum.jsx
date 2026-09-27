import React, { useState } from 'react';
import { FaPlus, FaTrash, FaCheckCircle, FaRegCircle, FaBook, FaEdit, FaChevronRight } from 'react-icons/fa';
import useIndexedDB from '../hooks/useIndexedDB';
import { useSettings } from '../contexts/SettingsContext';

const Curriculum = () => {
  const { settings } = useSettings();
  const [curriculums, setCurriculums] = useIndexedDB('curriculums', []);
  const [activeCurriculumId, setActiveCurriculumId] = useState(null);
  
  // Modal / Form States
  const [showAddCurriculum, setShowAddCurriculum] = useState(false);
  const [newCurriculumName, setNewCurriculumName] = useState('');
  
  const [newItemText, setNewItemText] = useState('');

  // Derived state
  const activeCurriculum = curriculums ? curriculums.find(c => c.id === activeCurriculumId) : null;

  const handleAddCurriculum = async (e) => {
    e.preventDefault();
    if (!newCurriculumName.trim()) return;

    const newCurriculum = {
      id: Date.now().toString(), // Simple ID
      name: newCurriculumName,
      items: [],
      dateCreated: new Date().toISOString()
    };

    await setCurriculums([...(curriculums || []), newCurriculum]);
    setNewCurriculumName('');
    setShowAddCurriculum(false);
    setActiveCurriculumId(newCurriculum.id);
  };

  const handleDeleteCurriculum = async (id) => {
    if (!window.confirm('Are you sure you want to delete this curriculum?')) return;
    const updated = curriculums.filter(c => c.id !== id);
    await setCurriculums(updated);
    if (activeCurriculumId === id) setActiveCurriculumId(null);
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemText.trim() || !activeCurriculum) return;

    const newItem = {
      id: Date.now().toString(),
      text: newItemText,
      completed: false
    };

    const updatedCurriculums = curriculums.map(c => {
      if (c.id === activeCurriculumId) {
        return { ...c, items: [...c.items, newItem] };
      }
      return c;
    });

    await setCurriculums(updatedCurriculums);
    setNewItemText('');
  };

  const handleToggleComplete = async (itemId) => {
    const updatedCurriculums = curriculums.map(c => {
      if (c.id === activeCurriculumId) {
        const updatedItems = c.items.map(item => {
          if (item.id === itemId) return { ...item, completed: !item.completed };
          return item;
        });
        return { ...c, items: updatedItems };
      }
      return c;
    });
    await setCurriculums(updatedCurriculums);
  };

  const handleDeleteItem = async (itemId) => {
    const updatedCurriculums = curriculums.map(c => {
      if (c.id === activeCurriculumId) {
        return { ...c, items: c.items.filter(i => i.id !== itemId) };
      }
      return c;
    });
    await setCurriculums(updatedCurriculums);
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-50">
      
      {/* Sidebar - Curriculum List */}
      <div className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-lg font-bold text-gray-700">Curriculums</h2>
             <button 
               onClick={() => setShowAddCurriculum(true)}
               className="text-blue-500 hover:text-blue-700 p-1"
               title="Add Curriculum"
             >
               <FaPlus />
             </button>
          </div>

          {showAddCurriculum && (
            <form onSubmit={handleAddCurriculum} className="mb-2">
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-sm mb-2"
                placeholder="Name (e.g. Year 1)"
                value={newCurriculumName}
                onChange={(e) => setNewCurriculumName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setShowAddCurriculum(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  Add
                </button>
              </div>
            </form>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {curriculums && curriculums.length > 0 ? (
            <ul>
              {curriculums.map(c => (
                <li key={c.id}>
                  <button
                    onClick={() => setActiveCurriculumId(c.id)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                      activeCurriculumId === c.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <span className={`font-medium ${activeCurriculumId === c.id ? 'text-blue-700' : 'text-gray-700'}`}>
                      {c.name}
                    </span>
                    <div className="flex items-center text-gray-400">
                      <span className="text-xs mr-2">{c.items?.filter(i=>i.completed).length}/{c.items?.length || 0}</span>
                      <FaChevronRight className="w-3 h-3" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              <p>No curriculums yet.</p>
              <p className="mt-1">Click + to create one.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Active Curriculum Items */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {activeCurriculum ? (
          <>
            {/* Header */}
            <div className="p-6 bg-white border-b border-gray-200 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{activeCurriculum.name}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {activeCurriculum.items?.filter(i => i.completed).length} of {activeCurriculum.items?.length} items completed
                </p>
              </div>
              <button
                onClick={() => handleDeleteCurriculum(activeCurriculum.id)}
                className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50"
                title="Delete Curriculum"
              >
                <FaTrash />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto space-y-4">
                {/* Add Item Input */}
                <form onSubmit={handleAddItem} className="flex gap-2 mb-6">
                  <input
                    type="text"
                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                    placeholder="Add a lesson or topic..."
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
                    style={{ backgroundColor: settings.accentColor }}
                  >
                    Add Item
                  </button>
                </form>

                {/* List */}
                <ul className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
                  {activeCurriculum.items && activeCurriculum.items.length > 0 ? (
                    activeCurriculum.items.map(item => (
                      <li key={item.id} className={`flex items-center p-4 hover:bg-gray-50 transition-colors ${item.completed ? 'bg-gray-50' : ''}`}>
                        <button
                          onClick={() => handleToggleComplete(item.id)}
                          className={`flex-shrink-0 mr-4 text-xl ${item.completed ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'}`}
                        >
                          {item.completed ? <FaCheckCircle /> : <FaRegCircle />}
                        </button>
                        
                        <span className={`flex-1 text-gray-800 ${item.completed ? 'line-through text-gray-500' : ''}`}>
                          {item.text}
                        </span>

                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="ml-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                        >
                          <FaTrash size={14} />
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="p-8 text-center text-gray-500">
                      No items in this curriculum yet.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
            <FaBook className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-xl font-medium">Select a curriculum to view details</p>
            <p className="mt-2">Or add a new one from the sidebar</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Curriculum;
