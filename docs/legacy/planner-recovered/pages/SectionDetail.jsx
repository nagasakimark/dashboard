import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaExternalLinkAlt, FaFile } from 'react-icons/fa';
import useIndexedDB from '../hooks/useIndexedDB';

function SectionDetail() {
  const { textbookId, sectionId } = useParams();
  const navigate = useNavigate();
  const [textbooks, setTextbooks] = useIndexedDB('textbooks', []);
  const [lessonPlans] = useIndexedDB('lessonPlans', []);
  const [sections, setSections] = useIndexedDB('sections', []);
  const [newFile, setNewFile] = useState(null);

  
  const [isEditing, setIsEditing] = useState(false);

  
  const [formData, setFormData] = useState({
    pageNumber: '',
    title: '',
    topic: '',
    notes: '',
    digitalLink: '',
    scanUrl: '',
  });

  const textbook = textbooks?.find(t => String(t.id) === String(textbookId));
  const section = textbook?.sections?.find(s => String(s.id) === String(sectionId));
  const sectionDetails = sections?.find(s => String(s.sectionId) === String(sectionId));
  const relatedLessonPlans = lessonPlans?.filter(plan => 
    plan.textbook === textbookId && plan.section === sectionId
  );

  
  useEffect(() => {
    if (section && sectionDetails) {
      setFormData({
        pageNumber: section.pageNumber.toString(),
        title: section.title,
        topic: section.topic || '',
        notes: sectionDetails.notes || '',
        digitalLink: sectionDetails.digitalLink || '',
        scanUrl: sectionDetails.scanUrl || '',
      });
    } else if (section) {
      setFormData({
        pageNumber: section.pageNumber.toString(),
        title: section.title,
        topic: section.topic || '',
        notes: '',
        digitalLink: '',
        scanUrl: '',
      });
    }
  }, [section, sectionDetails]);

  if (!textbook || !section) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Section not found.</p>
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

  
  const handleSave = async () => {
    
    const updatedTextbooks = textbooks.map(book => {
      if (String(book.id) === String(textbookId)) {
        const updatedSections = book.sections.map(s => 
          s.id === section.id 
            ? { 
                ...s,
                pageNumber: parseInt(formData.pageNumber),
                title: formData.title,
                topic: formData.topic,
                dateModified: new Date().toISOString()
              }
            : s
        );
        updatedSections.sort((a, b) => a.pageNumber - b.pageNumber);
        return { ...book, sections: updatedSections };
      }
      return book;
    });

    
    let scanUrl = formData.scanUrl;
    if (newFile) {
      try {
        const reader = new FileReader();
        scanUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(newFile);
        });
      } catch (error) {
        console.error('Error reading file:', error);
      }
    }

    const updatedDetails = {
      notes: formData.notes,
      digitalLink: formData.digitalLink,
      scanUrl,
      sectionId,
      textbookId,
      id: sectionDetails?.id || Date.now(),
    };

    await setTextbooks(updatedTextbooks);
    
    if (sectionDetails) {
      await setSections(sections.map(s => 
        s.id === sectionDetails.id ? updatedDetails : s
      ));
    } else {
      await setSections([...sections, updatedDetails]);
    }

    setIsEditing(false);
    setNewFile(null);
  };

  const handleDeleteSection = async () => {
    if (window.confirm('Are you sure you want to delete this section?')) {
      const updatedTextbooks = textbooks.map(book => {
        if (String(book.id) === String(textbookId)) {
          return {
            ...book,
            sections: book.sections.filter(s => s.id !== section.id)
          };
        }
        return book;
      });

      await setTextbooks(updatedTextbooks);
      navigate(`/textbooks/${textbookId}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-4">
        <button
          onClick={() => navigate(`/textbooks/${textbookId}`)}
          className="flex items-center text-blue-500 hover:text-blue-700"
        >
          <FaArrowLeft className="mr-2" /> Back to {textbook.title}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
        {isEditing ? (
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Page Number
                </label>
                <input
                  type="number"
                  value={formData.pageNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, pageNumber: e.target.value }))}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic
              </label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Digital Link
              </label>
              <input
                type="url"
                value={formData.digitalLink}
                onChange={(e) => setFormData(prev => ({ ...prev, digitalLink: e.target.value }))}
                className="w-full p-2 border rounded"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-2 border rounded"
                rows={4}
                placeholder="Add notes about this section..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Page Scan
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewFile(e.target.files[0])}
                className="w-full p-2 border rounded"
              />
              {(formData.scanUrl || newFile) && (
                <div className="mt-2">
                  <img
                    src={newFile ? URL.createObjectURL(newFile) : formData.scanUrl}
                    alt="Page scan preview"
                    className="max-h-48 object-contain"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setNewFile(null);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold mb-2">{section.title}</h2>
                <p className="text-gray-600">Page {section.pageNumber}</p>
                {section.topic && <p className="text-gray-600">Topic: {section.topic}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Edit Section
                </button>
                <button
                  onClick={handleDeleteSection}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Delete Section
                </button>
              </div>
            </div>

            {sectionDetails && (
              <div className="mt-4 space-y-4">
                {sectionDetails.digitalLink && (
                  <div>
                    <h4 className="font-medium">Digital Version:</h4>
                    <a
                      href={sectionDetails.digitalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline flex items-center gap-1"
                    >
                      <FaExternalLinkAlt /> Open Digital Version
                    </a>
                  </div>
                )}

                {sectionDetails.notes && (
                  <div>
                    <h4 className="font-medium">Notes:</h4>
                    <p className="whitespace-pre-wrap">{sectionDetails.notes}</p>
                  </div>
                )}

                {sectionDetails.scanUrl && (
                  <div>
                    <h4 className="font-medium">Page Scan:</h4>
                    <a
                      href={sectionDetails.scanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-2"
                    >
                      <img
                        src={sectionDetails.scanUrl}
                        alt="Page scan"
                        className="max-h-48 object-contain cursor-zoom-in hover:opacity-90 transition-opacity duration-150"
                        title="Click to view full size"
                      />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
        <h3 className="text-lg font-semibold mb-4">Related Lesson Plans</h3>
        {relatedLessonPlans && relatedLessonPlans.length > 0 ? (
          <div className="space-y-4">
            {relatedLessonPlans.map(plan => (
              <div key={plan.id} className="border rounded p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{plan.title}</h4>
                    <p className="text-sm text-gray-600">
                      Year {plan.yearGroup} Class {plan.classNumber}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/lesson-plans', { 
                      state: { editPlan: plan }
                    })}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    View/Edit
                  </button>
                </div>
                {plan.content && (
                  <p className="mt-2 text-gray-600 text-sm line-clamp-2">
                    {plan.content}
                  </p>
                )}
                {plan.tags && plan.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {plan.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No lesson plans use this section yet.</p>
        )}
        <div className="mt-4">
          <button
            onClick={() => navigate('/lesson-plans', { 
              state: { 
                createNewPlan: true,
                textbook: textbookId,
                section: sectionId
              }
            })}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Create New Lesson Plan
          </button>
        </div>
      </div>
    </div>
  );
}

export default SectionDetail;
