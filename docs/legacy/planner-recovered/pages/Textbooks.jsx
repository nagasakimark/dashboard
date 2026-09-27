import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useIndexedDB from '../hooks/useIndexedDB';
import ErrorBoundary from '../components/ErrorBoundary';

function Textbooks() {
  const [textbooks, setTextbooks] = useIndexedDB('textbooks', []);
  const [newTitle, setNewTitle] = useState('');
  const [newImageFile, setNewImageFile] = useState(null);
  const [newDigitalLink, setNewDigitalLink] = useState('');
  const [newAltopediaLink, setNewAltopediaLink] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[Textbooks] Component mounted');
    console.log('[Textbooks] textbooks:', textbooks);
  }, [textbooks]);

  // Loading state check
  if (textbooks === undefined) {
    console.log('[Textbooks] Loading state: textbooks is undefined');
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center"></h1>
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-500">Loading Textbooks...</div>
        </div>
      </div>
    );
  }

  const handleAddTextbook = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Please enter a textbook title');
      return;
    }

    let imageUrl = '';
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

    const newTextbook = {
      id: `textbook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: newTitle.trim(),
      image: imageUrl,
      digitalLink: newDigitalLink.trim(),
      altopediaLink: newAltopediaLink.trim(),
      sections: [],
      dateCreated: new Date().toISOString()
    };

    try {
      await setTextbooks([...textbooks, newTextbook]);

      setNewTitle('');
      setNewImageFile(null);
      setNewDigitalLink('');
      setNewAltopediaLink('');
    } catch (error) {
      console.error('Error saving textbook:', error);
      alert('Failed to save textbook. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-2">
      {/* Content area - Further reduce margin-top */}
      <div className="mt-[0px]"> {/* Changed from mt-[60px] to mt-[48px] */}
        {/* Add button and form */}
        <div className="mb-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-primary"
            >
              {showAddForm ? 'Cancel' : 'Add Textbook'}
            </button>
          </div>

          {showAddForm && (
            <div className="mt-4">
              <form onSubmit={handleAddTextbook} className="rounded-lg p-4 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Textbook Title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  />
                  <input
                    type="url"
                    placeholder="Digital Textbook URL"
                    value={newDigitalLink}
                    onChange={(e) => setNewDigitalLink(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                  <input
                    type="url"
                    placeholder="Altopedia Link"
                    value={newAltopediaLink}
                    onChange={(e) => setNewAltopediaLink(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="mt-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewImageFile(e.target.files[0])}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <button type="submit" className="w-full bg-blue-500 text-white px-4 py-2 rounded mt-4">
                  Add Textbook
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Grid of textbooks - Add specific z-index to ensure cards stay below nav */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {textbooks.length > 0 ? (
            textbooks.map(book => (
              <React.Fragment key={book?.id || Date.now()}>
                <Link to={`/textbooks/${book.id}`} className="block">
                  <div className="rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow">
                    <div className="p-4 rounded-lg bg-white"> {/* Move background-color here */}
                      <div className="relative pt-[142%]">
                        <img
                          src={
                            book?.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4NCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='
                          }
                          alt={book?.title || 'Textbook'}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4NCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                          }}
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold truncate">{book?.title || 'Untitled'}</h3>
                        <p className="text-sm text-gray-500">
                          {book?.sections?.length || 0} sections
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </React.Fragment>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500 py-8 bg-white rounded-lg">
              No textbooks added yet. Add your first textbook using the button above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const WrappedTextbooks = () => (
  <ErrorBoundary>
    <Textbooks />
  </ErrorBoundary>
);

export default WrappedTextbooks;
