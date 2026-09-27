import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useIndexedDB from '../hooks/useIndexedDB';
import { FaEdit, FaTrash, FaTimes, FaFilter, FaLink, FaFile } from 'react-icons/fa';
import LessonPlanViewer from '../components/LessonPlanViewer';
import EditLessonPlanModal from '../components/EditLessonPlanModal';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const LessonPlans = () => {
  const [lessonPlans, setLessonPlans] = useIndexedDB('lessonPlans', []);
  const [schools] = useIndexedDB('schools', []);
  const [textbooks] = useIndexedDB('textbooks', []);
  const [schedule, setSchedule] = useIndexedDB('schedule', {});
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const isSelectionMode = location.state?.selectionMode;
  const selectionYearGroup = location.state?.yearGroup;
  const [showFilters, setShowFilters] = useState(false);
  
  const initialPlanState = {
    title: '',
    school: '',  
    yearGroup: '',
    textbook: '',
    section: '',
    content: '',
    periodId: null,
    date: null,
    tags: [],
    resources: [], 
  };
  
  const [newPlan, setNewPlan] = useState(initialPlanState);
  const [filters, setFilters] = useState({
    search: '',
    school: '',
    yearGroup: '',
    classNumber: '',
    textbook: '',
    tags: []
  });
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  
  useEffect(() => {
    if (Array.isArray(lessonPlans)) {
      const allTags = new Set();
      lessonPlans.forEach(plan => {
        if (Array.isArray(plan.tags)) {
          plan.tags.forEach(tag => allTags.add(tag));
        }
      });
      setTags(Array.from(allTags));
    }
  }, [lessonPlans]);

  
  useEffect(() => {
    if (location.state && !isSelectionMode) {
      if (location.state.editPlan) {
        setNewPlan({
          ...initialPlanState,
          ...location.state.editPlan,
          yearGroup: location.state.editPlan.yearGroup?.toString() || '',
        });
        setEditingPlan(location.state.editPlan);
        setShowAddForm(true);
      } else if (location.state.createNewPlan) {
        setNewPlan(prev => ({
          ...initialPlanState,
          school: schools?.[0]?.id || '',
          textbook: location.state.textbook || '',
          section: location.state.section || '',
          yearGroup: location.state.yearGroup?.toString() || '',
        }));
        setShowAddForm(true);
      } else if (schools && schools.length > 0) {
        
        setNewPlan(prev => ({
          ...initialPlanState,
          school: schools[0]?.id || '',
          yearGroup: location.state.yearGroup || '',
          classNumber: location.state.classNumber || '',
          periodId: location.state.periodId || null,
          date: location.state.date || null,
        }));
        setShowAddForm(true);
      }
    }
  }, [location.state, schools, isSelectionMode]);

  
  const safeSchools = Array.isArray(schools) ? schools : [];
  const safeTextbooks = Array.isArray(textbooks) ? textbooks : [];
  const safeLessonPlans = Array.isArray(lessonPlans) ? lessonPlans : [];

  const getSchoolName = (id) => safeSchools.find(s => s.id === id)?.name || 'Unknown School';
  const getTextbookTitle = (id) => safeTextbooks.find(t => t.id === id)?.title || 'Unknown Textbook';

  const handleEditPlan = (plan) => {
    setNewPlan(plan);
    setEditingPlan(plan);
    setShowAddForm(true);
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'align': [] }],
      [{ 'color': [] }, { 'background': [] }],
      ['clean']
    ]
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'blockquote', 'code-block',
    'list', 'bullet',
    'script',
    'indent',
    'direction',
    'align',
    'color', 'background'
  ];

  const sanitizeContent = (content) => {
    if (!content) return '';
    // Return as-is since Quill provides clean HTML
    return content;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPlan.title || !newPlan.school || !newPlan.yearGroup) return;

    const planData = {
      ...newPlan,
      content: sanitizeContent(newPlan.content),
      yearGroup: parseInt(newPlan.yearGroup) || 1,
      id: editingPlan ? editingPlan.id : Date.now(),
      dateCreated: editingPlan ? editingPlan.dateCreated : new Date().toISOString(),
      dateModified: new Date().toISOString()
    };

    if (editingPlan) {
      await setLessonPlans(lessonPlans.map(p => p.id === editingPlan.id ? planData : p));
    } else {
      await setLessonPlans([...lessonPlans, planData]);
    }
    
    if (location.state?.returnTo) {
      navigate(location.state.returnTo);
    } else {
      setShowAddForm(false);
      setNewPlan(initialPlanState);
      setEditingPlan(null);
    }
  };

  const handleDelete = async (planId) => {
    if (window.confirm('Are you sure you want to delete this lesson plan?')) {
      await setLessonPlans(lessonPlans.filter(p => p.id !== planId));
      
      
      const updatedSchedule = { ...schedule };
      Object.entries(schedule).forEach(([key, value]) => {
        if (value.lessonPlanId === planId) {
          delete updatedSchedule[key].lessonPlanId;
        }
      });
      await setSchedule(updatedSchedule);
    }
  };

  const getTextbookInfo = (textbookId) => {
    if (!textbookId || !textbooks) return { title: 'No Textbook', section: '' };
    
    const textbook = textbooks.find(t => t.id === textbookId);
    if (!textbook) return { title: 'Unknown Textbook', section: '' };

    const section = textbook.sections?.find(s => s.id === newPlan.section);
    return {
      title: textbook.title,
      section: section?.title || 'No Section'
    };
  };

  const getTextbookSections = (textbookId) => {
    const textbook = textbooks.find(t => t.id === textbookId);
    return textbook?.sections || [];
  };

  
  const filteredLessonPlans = useMemo(() => {
    let plans = safeLessonPlans;
    return plans.filter(plan => {
      if (!plan) return false;
      
      const matchesSearch = filters.search ? (
        (plan.title || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (plan.content || '').toLowerCase().includes(filters.search.toLowerCase())
      ) : true;
      const matchesSchool = !filters.school || plan.school === filters.school;
      const matchesYear = !filters.yearGroup || plan.yearGroup?.toString() === filters.yearGroup;
      const matchesTextbook = !filters.textbook || plan.textbook === filters.textbook;
      const matchesTags = filters.tags.length === 0 || 
                         filters.tags.every(tag => Array.isArray(plan.tags) && plan.tags.includes(tag));

      return matchesSearch && matchesSchool && matchesYear && matchesTextbook && matchesTags;
    });
  }, [safeLessonPlans, filters]);

  const handleAddTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !newPlan.tags.includes(tagInput.trim())) {
      setNewPlan(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setNewPlan(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleUsePlan = (plan) => {
    if (location.state?.periodId && location.state?.date) {
      const updatedSchedule = {
        ...schedule,
        [`${location.state.date}-${location.state.periodId}`]: {
          yearGroup: parseInt(plan.yearGroup),
          classNumber: parseInt(plan.classNumber),
          lessonPlanId: plan.id
        }
      };
      setSchedule(updatedSchedule);
      
      
      if (location.state?.returnTo) {
        navigate(location.state.returnTo);
      }
    }
  };

  const handleResourceAdd = (resource) => {
    setNewPlan(prev => ({
      ...prev,
      resources: [...prev.resources, resource]
    }));
  };

  const handleResourceRemove = (resourceId) => {
    setNewPlan(prev => ({
      ...prev,
      resources: prev.resources.filter(r => r.id !== resourceId)
    }));
  };

  const handleResourceOpen = (resource) => {
    if (resource.type === 'url') {
      window.open(resource.path, '_blank');
    } else if (window.__TAURI__) {
      
      import('@tauri-apps/api/shell').then(({ open }) => {
        open(resource.path);
      });
    } else {
      
      window.open(resource.path, '_blank');
    }
  };

  const handleAddResource = () => {
    setNewPlan(prev => ({
      ...prev,
      resources: [...prev.resources, {
        id: Date.now(),
        title: '',
        path: '',
        type: 'url'
      }]
    }));
  };

  const handleRemoveResource = (index) => {
    setNewPlan(prev => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index)
    }));
  };

  const handleResourceChange = (index, field, value) => {
    setNewPlan(prev => ({
      ...prev,
      resources: prev.resources.map((r, i) => 
        i === index ? { ...r, [field]: value } : r
      )
    }));
  };

  const handleFileChange = (e, index) => {
    const file = e.target.files?.[0];
    if (file) {
      
      const blobUrl = URL.createObjectURL(file);
      handleResourceChange(index, 'path', blobUrl);
      handleResourceChange(index, 'originalName', file.name);
      if (!newPlan.resources[index].title) {
        handleResourceChange(index, 'title', file.name);
      }
    }
  };

  const handleFileSelect = async (index) => {
    if (window.__TAURI__) {
      const { open } = await import('@tauri-apps/api/dialog');
      try {
        const selected = await open({
          multiple: false,
          filters: [{ name: 'All Files', extensions: ['*'] }]
        });
        
        if (selected) {
          const fileName = selected.split(/[\\/]/).pop();
          handleResourceChange(index, 'path', selected);
          if (!newPlan.resources[index].title) {
            handleResourceChange(index, 'title', fileName);
          }
        }
      } catch (error) {
        console.error('Error selecting file:', error);
      }
    } else {
      
      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';
      input.onchange = (e) => handleFileChange(e, index);
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    }
  };

  
  useEffect(() => {
    return () => {
      
      if (!window.__TAURI__) {
        newPlan.resources.forEach(resource => {
          if (resource.type === 'file' && resource.path.startsWith('blob:')) {
            URL.revokeObjectURL(resource.path);
          }
        });
      }
    };
  }, [newPlan.resources]);

  const FilterSection = () => (
    <div className="bg-white shadow sm:rounded-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Filters</h3>
        <button onClick={() => setShowFilters(false)} className="text-gray-500">
          <FaTimes />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Search titles and content..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="col-span-2 p-2 border rounded"
        />
        <select
          value={filters.school}
          onChange={(e) => setFilters(prev => ({ ...prev, school: e.target.value }))}
          className="p-2 border rounded"
        >
          <option value="">All Schools</option>
          {safeSchools.map(school => (
            <option key={school.id} value={school.id}>{school.name}</option>
          ))}
        </select>
        <select
          value={filters.yearGroup}
          onChange={(e) => setFilters(prev => ({ ...prev, yearGroup: e.target.value }))}
          className="p-2 border rounded"
        >
          <option value="">All Years</option>
          {[1, 2, 3, 4, 5, 6].map(year => (
            <option key={year} value={year}>Year {year}</option>
          ))}
        </select>
        <select
          value={filters.textbook}
          onChange={(e) => setFilters(prev => ({ ...prev, textbook: e.target.value }))}
          className="p-2 border rounded"
        >
          <option value="">All Textbooks</option>
          {safeTextbooks.map(textbook => (
            <option key={textbook.id} value={textbook.id}>{textbook.title}</option>
          ))}
        </select>
        <div className="col-span-2">
          <div className="flex flex-wrap gap-2 mb-2">
            {filters.tags.map(tag => (
              <span key={tag} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center">
                {tag}
                <button
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    tags: prev.tags.filter(t => t !== tag)
                  }))}
                  className="ml-2"
                >
                  <FaTimes className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value && !filters.tags.includes(e.target.value)) {
                setFilters(prev => ({
                  ...prev,
                  tags: [...prev.tags, e.target.value]
                }));
              }
            }}
            className="w-full p-2 border rounded"
          >
            <option value="">Add Tag Filter...</option>
            {tags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      </div>
      <button
        onClick={() => setFilters({
          search: '',
          school: '',
          yearGroup: '',
          classNumber: '',
          textbook: '',
          tags: []
        })}
        className="mt-4 text-red-600 hover:text-red-800"
      >
        Clear Filters
      </button>
    </div>
  );

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-4 mb-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            type="text"
            value={newPlan.title}
            onChange={(e) =>
              setNewPlan(prev => ({ ...prev, title: e.target.value }))
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            School
          </label>
          <select
            value={newPlan.school}
            onChange={(e) =>
              setNewPlan(prev => ({ ...prev, school: e.target.value }))
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="">Select School</option>
            {safeSchools.map(school => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Year Group
          </label>
          <select
            value={newPlan.yearGroup}
            onChange={(e) =>
              setNewPlan(prev => ({ ...prev, yearGroup: e.target.value }))
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="">Select Year</option>
            {[1, 2, 3, 4, 5, 6].map(year => (
              <option key={year} value={year}>
                Year {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Textbook
          </label>
          <select
            value={newPlan.textbook}
            onChange={(e) => {
              setNewPlan(prev => ({
                ...prev,
                textbook: e.target.value,
                section: ''
              }));
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="">Select Textbook</option>
            {safeTextbooks.map(textbook => (
              <option key={textbook.id} value={textbook.id}>
                {textbook.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Section
          </label>
          <select
            value={newPlan.section}
            onChange={(e) => setNewPlan(prev => ({ ...prev, section: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            disabled={!newPlan.textbook}
          >
            <option value="">Select Section</option>
            {getTextbookSections(newPlan.textbook).map(section => (
              <option key={section.id} value={section.id}>
                {section.title} (p.{section.pageNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lesson Content
        </label>
        <ReactQuill
          theme="snow"
          value={newPlan.content || ''}
          onChange={(value) => setNewPlan(prev => ({ ...prev, content: value }))}
          modules={quillModules}
          formats={quillFormats}
          className="min-h-[200px]"
          preserveWhitespace={true}
        />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {newPlan.tags.map(tag => (
            <span key={tag} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center">
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-2"
              >
                <FaTimes className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add tags..."
            className="flex-1 p-2 border rounded"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Tag
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Resources</label>
        
        {Array.isArray(newPlan.resources) && newPlan.resources.length > 0 && (
          <div className="mt-2 space-y-2">
            {newPlan.resources.map(resource => (
              <div key={resource.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <button
                  type="button"
                  onClick={() => handleResourceOpen(resource)}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  {resource.type === 'url' ? <FaLink className="mr-2" /> : <FaFile className="mr-2" />}
                  {resource.title}
                </button>
                <button
                  type="button"
                  onClick={() => handleResourceRemove(resource.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <FaTimes />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Resources</h3>
          <button
            type="button"
            onClick={handleAddResource}
            className="btn-secondary text-sm"
          >
            Add Resource
          </button>
        </div>
        <div className="space-y-2">
          {newPlan.resources.map((resource, index) => (
            <div key={index} className="flex gap-2 items-center">
              <select
                value={resource.type}
                onChange={(e) => handleResourceChange(index, 'type', e.target.value)}
                className="w-24 p-2 border rounded"
              >
                <option value="url">URL</option>
                <option value="file">File</option>
              </select>
              
              <input
                type="text"
                value={resource.title}
                onChange={(e) => handleResourceChange(index, 'title', e.target.value)}
                placeholder="Resource Title"
                className="flex-1 p-2 border rounded"
              />

              {resource.type === 'url' ? (
                <input
                  type="url"
                  value={resource.path}
                  onChange={(e) => handleResourceChange(index, 'path', e.target.value)}
                  placeholder="https://..."
                  className="flex-1 p-2 border rounded"
                />
              ) : (
                <div className="flex flex-1 gap-2">
                  <input
                    type="text"
                    value={resource.path}
                    readOnly
                    placeholder="Select a file..."
                    className="flex-1 p-2 border rounded bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleFileSelect(index)}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Browse
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleRemoveResource(index)}
                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
        {editingPlan && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this lesson plan?')) {
                handleDelete(editingPlan.id);
                setShowAddForm(false);
                setNewPlan(initialPlanState);
                setEditingPlan(null);
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete Plan
          </button>
        )}
        <button 
          type="submit" 
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          {editingPlan ? 'Update Plan' : 'Create Plan'}
        </button>
      </div>
    </form>
  );

  
  if (!Array.isArray(lessonPlans) || !Array.isArray(schools) || !Array.isArray(textbooks)) {
    return (
      <div className="max-w-4xl mx-auto p-2">
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-500">Loading Lesson Plans...</div>
        </div>
      </div>
    );
  }

  const handlePlanSelect = (plan) => {
    if (isSelectionMode) {
      // Get the stored period data
      const periodData = JSON.parse(sessionStorage.getItem('periodSelection'));
      if (periodData) {
        const updatedSchedule = {
          ...schedule,
          [`${periodData.date}-${periodData.periodId}`]: {
            yearGroup: periodData.yearGroup,
            classNumber: periodData.classNumber,
            lessonPlanId: plan.id,
            type: 'class',
            special: null
          }
        };
        setSchedule(updatedSchedule);
        sessionStorage.removeItem('periodSelection'); // Clean up
      }
      navigate(location.state?.returnTo || '/');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {isSelectionMode ? (
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-bold">Select a Lesson Plan</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Lesson Plans</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center gap-2"
            >
              <FaFilter /> Filters
            </button>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingPlan(null);
                setNewPlan(initialPlanState);
              }}
              className="btn-primary"
            >
              {showAddForm ? 'Cancel' : 'Add Lesson Plan'}
            </button>
          </div>
        </div>
      )}

      {showFilters && <FilterSection />}
      {!isSelectionMode && showAddForm && renderForm()}

      <LessonPlanViewer 
        plans={filteredLessonPlans}
        schools={schools}
        textbooks={textbooks}
        onEdit={!isSelectionMode ? handleEditPlan : undefined}
        onSelect={isSelectionMode ? handlePlanSelect : undefined}
        isSelectionMode={isSelectionMode}
      />
    </div>
  );
};

LessonPlans.defaultProps = {
  textbooks: [],
  setTextbooks: () => console.warn('setTextbooks prop not provided')
};

export default LessonPlans;
