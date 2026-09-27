const DB_NAME = 'alt-planner-db';
const DB_VERSION = 8;

const stores = [
  'schools',
  'textbooks',
  'lessonPlans',
  'assignments',
  'schedule',
  'sections',
  'settings',
  'todos',
  'curriculums'
];

let db = null;

export const initDB = () => {
  if (db) return Promise.resolve(db);
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      stores.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
  });
};

export const getData = async (storeName) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    
    if (storeName === 'assignments' || storeName === 'schedule') {
      const request = store.get('default');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.data || {});
    } else if (storeName === 'settings') {
      const request = store.get('default');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.data || {
        accentColor: '#2563eb',
        dateFormat: 'dd/MM/yyyy'
      });
    } else {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    }
  });
};

export const setData = async (storeName, data) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    try {
      if (storeName === 'assignments' || storeName === 'schedule' || storeName === 'settings') {
        const itemToStore = {
          id: 'default',
          data: data
        };
        const request = store.put(itemToStore);
        request.onsuccess = () => resolve(data);
        request.onerror = () => reject(request.error);
      } else {
        store.clear().onsuccess = () => {
          const dataArray = Array.isArray(data) ? data : [data];
          dataArray.forEach(item => {
            store.add({
              ...item,
              id: item.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            });
          });
          resolve(dataArray);
        };
      }
    } catch (error) {
      console.error('Store error:', error);
      reject(error);
    }
  });
};

export const clearStore = async (storeName) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
