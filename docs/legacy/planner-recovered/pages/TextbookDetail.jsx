import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaBook, FaExternalLinkAlt } from 'react-icons/fa';
import useIndexedDB from '../hooks/useIndexedDB';
import { NO_IMAGE_PLACEHOLDER } from '../constants/placeholders';

function TextbookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  // eslint-disable-next-line
  const [textbooks, setTextbooks] = useIndexedDB('textbooks');
  // eslint-disable-next-line
  const [sections, setSections] = useIndexedDB('sections', []);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    image: '',
    digitalLink: '',
    altopediaLink: ''
  });
  const [newSection, setNewSection] = useState({
    pageNumber: '',
    title: '',
    topic: ''
  });
  const [editingSection, setEditingSection] = useState(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newImageFile, setNewImageFile] = useState(null);
  // eslint-disable-next-line
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleImportSections = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!Array.isArray(data)) {
          alert('Invalid format: structure must be an array');
          return;
        }

        const importedSections = data.map(item => ({
          id: Date.now() + Math.random(),
          pageNumber: parseInt(item.page || item.pageNumber || item['Page Number'] || 0),
          title: item.unit || item.title || item['Section Name'] || `Unit ${item.page || item['Page Number']}`,
          topic: item.content || item.topic || item.grammar || item['Topic (Grammar)'] || '',
          dateCreated: new Date().toISOString()
        })).filter(s => s.pageNumber > 0);

        if (importedSections.length === 0) {
          alert('No valid sections found');
          return;
        }

        const updatedTextbooks = textbooks.map(book => {
          if (String(book.id) === String(id)) {
            const existingSections = book.sections || [];
            const newSections = [...existingSections, ...importedSections];
            newSections.sort((a, b) => a.pageNumber - b.pageNumber);
            return { ...book, sections: newSections };
          }
          return book;
        });

        await setTextbooks(updatedTextbooks);
        alert(`Imported ${importedSections.length} sections successfully.`);

      } catch (error) {
        console.error('Import error:', error);
        alert('Failed to parse JSON file');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  
  useEffect(() => {
    if (textbooks) {
      const textbook = textbooks.find(book => String(book.id) === String(id));
      if (textbook) {
        setEditData({
          title: textbook.title || '',
          image: textbook.image || '',
          digitalLink: textbook.digitalLink || '',
          altopediaLink: textbook.altopediaLink || ''
        });
      }
    }
  }, [textbooks, id]);

  
  if (textbooks === undefined) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center"></h1>
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-500">Loading textbook...</div>
        </div>
      </div>
    );
  }

  const textbook = textbooks.find(book => String(book.id) === String(id));

  
  const handleAddSection = async (e) => {
    e.preventDefault();
    if (!newSection.pageNumber || !newSection.title) {
      alert('Page number and title are required');
      return;
    }

    const updatedTextbooks = textbooks.map(book => {
      if (String(book.id) === String(id)) {
        const newSections = [...(book.sections || []), {
          ...newSection,
          id: Date.now(),
          pageNumber: parseInt(newSection.pageNumber),
          dateCreated: new Date().toISOString()
        }];
        newSections.sort((a, b) => a.pageNumber - b.pageNumber);

        return { ...book, sections: newSections };
      }
      return book;
    });

    await setTextbooks(updatedTextbooks);
    setNewSection({ pageNumber: '', title: '', topic: '' });
  };

  const handleUpdateSection = async (e) => {
    e.preventDefault();
    if (!newSection.pageNumber || !newSection.title) {
      alert('Page number and title are required');
      return;
    }

    const updatedTextbooks = textbooks.map(book => {
      if (String(book.id) === String(id)) {
        const updatedSections = book.sections.map(section => 
          section.id === editingSection.id 
            ? { 
                ...newSection, 
                id: section.id,
                pageNumber: parseInt(newSection.pageNumber),
                dateModified: new Date().toISOString()
              }
            : section
        );
        updatedSections.sort((a, b) => a.pageNumber - b.pageNumber);
        return { ...book, sections: updatedSections };
      }
      return book;
    });

    await setTextbooks(updatedTextbooks);
    setEditingSection(null);
    setNewSection({ pageNumber: '', title: '', topic: '' });
  };

  const handleUpdateTextbook = async (e) => {
    e.preventDefault();
    let imageUrl = editData.image;

    if (newImageFile) {
      try {
        const reader = new FileReader();
        imageUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(newImageFile);
        });
      } catch (error) {
        console.error('Error reading image file:', error);
      }
    }

    const updatedTextbooks = textbooks.map(book => {
      if (String(book.id) === String(id)) {
        return {
          ...book,
          title: editData.title,
          image: imageUrl,
          digitalLink: editData.digitalLink,
          altopediaLink: editData.altopediaLink
        };
      }
      return book;
    });
    
    await setTextbooks(updatedTextbooks);
    setEditing(false);
    setNewImageFile(null);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this textbook? This action cannot be undone.')) {
      const updatedTextbooks = textbooks.filter(t => t.id !== id);
      await setTextbooks(updatedTextbooks);
      navigate('/textbooks');
    }
  };

  const handleSectionClick = (section) => {
    navigate(`/textbooks/${id}/sections/${section.id}`);
  };

  
  if (!textbook) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Textbook not found. The ID might be invalid or the textbook has been deleted.</p>
          <button 
            onClick={() => navigate('/textbooks')}
            className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Return to Textbooks
          </button>
        </div>
      </div>
    );
  }

  
  return (
    <div className="max-w-4xl mx-auto p-2 relative">
      {/* Navigation */}
      <div className="sticky top-0 bg-white z-50">
        <div className="navbar bg-white shadow-sm mb-4">
          {}
        </div>
      </div>

      {/* Content area - wrapped in stacking context container */}
      <div className="relative z-0 isolate">
        <div className="mb-4">
          {editing ? (
            <form onSubmit={handleUpdateTextbook} className="bg-white rounded-lg p-6 shadow-sm">
              <div className="grid grid-cols-1 gap-4 mb-4">
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({...editData, title: e.target.value})}
                  className="p-2 border rounded w-full"
                  placeholder="Textbook Title"
                />
                <div className="flex gap-4 items-start">
                  <div className="w-32 flex-shrink-0">
                    <div className="relative pt-[142%]">
                      <img
                        src={newImageFile ? URL.createObjectURL(newImageFile) : editData.image}
                        alt="Preview"
                        className="absolute inset-0 w-full h-full object-cover rounded"
                        onClick={() => setSelectedImage(newImageFile ? URL.createObjectURL(newImageFile) : editData.image)}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewImageFile(e.target.files[0])}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>
                <input
                  type="url"
                  value={editData.digitalLink}
                  onChange={(e) => setEditData({...editData, digitalLink: e.target.value})}
                  className="p-2 border rounded w-full"
                  placeholder="Digital Textbook URL"
                />
                <input
                  type="url"
                  value={editData.altopediaLink}
                  onChange={(e) => setEditData({...editData, altopediaLink: e.target.value})}
                  className="p-2 border rounded w-full"
                  placeholder="Altopedia Link"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex gap-6">
                <div className="w-32 flex-shrink-0">
                  <div className="relative pt-[142%]">
                    <img
                      src={textbook.image || NO_IMAGE_PLACEHOLDER}
                      alt={textbook.title}
                      className="absolute inset-0 w-full h-full object-cover rounded"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">{textbook.title}</h2>
                  <div className="flex gap-2 items-center mb-2">
                    <FaBook className="text-gray-500" />
                    <a href={textbook.digitalLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                      Digital Textbook <FaExternalLinkAlt />
                    </a>
                  </div>
                  <div className="flex gap-2 items-center mb-2">
                    <FaBook className="text-gray-500" />
                    <a href={textbook.altopediaLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                      Altopedia <FaExternalLinkAlt />
                    </a>
                  </div>
                  <button
                    onClick={() => setEditing(true)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ml-2"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Sections</h3>
            <div className="flex items-center">
              <input
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleImportSections}
              />
              <button
                onClick={() => fileInputRef.current.click()}
                className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
              >
                Import JSON
              </button>
              <button
                onClick={() => setShowAddSection(!showAddSection)}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                {showAddSection ? 'Cancel' : 'Add Section'}
              </button>
            </div>
          </div>
          {showAddSection && (
            <form onSubmit={editingSection ? handleUpdateSection : handleAddSection} className="mb-4">
              <div className="grid grid-cols-1 gap-4 mb-4">
                <input
                  type="number"
                  value={newSection.pageNumber}
                  onChange={(e) => setNewSection({...newSection, pageNumber: e.target.value})}
                  className="p-2 border rounded w-full"
                  placeholder="Page Number"
                />
                <input
                  type="text"
                  value={newSection.title}
                  onChange={(e) => setNewSection({...newSection, title: e.target.value})}
                  className="p-2 border rounded w-full"
                  placeholder="Section Title"
                />
                <input
                  type="text"
                  value={newSection.topic}
                  onChange={(e) => setNewSection({...newSection, topic: e.target.value})}
                  className="p-2 border rounded w-full"
                  placeholder="Topic"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  {editingSection ? 'Update Section' : 'Add Section'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSection(false);
                    setEditingSection(null);
                    setNewSection({ pageNumber: '', title: '', topic: '' });
                  }}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          <ul>
            {textbook.sections && textbook.sections.map(section => (
              <li key={section.id} className="mb-2">
                <div className="flex justify-between items-center p-2 border rounded hover:bg-gray-100 cursor-pointer" onClick={() => handleSectionClick(section)}>
                  <div>
                    <h4 className="font-bold">{section.title}</h4>
                    <p className="text-sm text-gray-600">Page {section.pageNumber}</p>
                    <p className="text-sm text-gray-600">{section.topic}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSection(section);
                      setNewSection({ pageNumber: section.pageNumber, title: section.title, topic: section.topic });
                      setShowAddSection(true);
                    }}
                    className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                  >
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default TextbookDetail;
