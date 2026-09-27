import { useState, useEffect, useCallback } from 'react';
import { getData, setData } from '../services/indexedDB';


const stores = [
  
  { name: 'sections', keyPath: 'id' },
];


const dbConfig = {
  name: 'alt-planner-db', // Make sure this matches
  version: 1,
  stores: [
    
    { name: 'sections', keyPath: 'id' },
  ]
};

const useIndexedDB = (storeName, initialValue = []) => {
  
  const [data, setLocalData] = useState(undefined);

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
        let storedData = await getData(storeName);
        
        if (!mounted) return;

        // Debugging: Log the stored data
        console.log(`[useIndexedDB] Loaded data for ${storeName}:`, storedData);

        
        if (storeName === 'textbooks') {
          // Explicitly initialize as empty array if null or undefined
          if (storedData === null || storedData === undefined) {
            storedData = [];
            await setData(storeName, storedData); // Ensure data is set before continuing
          }

          const validData = Array.isArray(storedData) ? storedData : [];
          setLocalData(validData);
        } else if (storeName === 'assignments' || storeName === 'schedule') {
          
          const validData = typeof storedData === 'object' && storedData !== null ? storedData : {};
          setLocalData(validData);
          if (storedData === null || storedData === undefined || typeof storedData !== 'object') {
            await setData(storeName, validData);
          }
        } else {
          
          const validData = storedData ?? initialValue;
          setLocalData(validData);
          if (storedData === null || storedData === undefined) {
            await setData(storeName, validData);
          }
        }
      } catch (error) {
        console.error(`Error loading data from IndexedDB:`, error);
        
        const defaultValue = storeName === 'textbooks' ? [] : 
                           (storeName === 'assignments' || storeName === 'schedule') ? {} : 
                           initialValue;
        setLocalData(defaultValue);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [storeName]);

  const saveData = useCallback(async (newData) => {
    try {
      const dataToSave = typeof newData === 'function' ? newData(data) : newData;
      const result = await setData(storeName, dataToSave);
      setLocalData(result);
      return result;
    } catch (error) {
      console.error(`Error saving data to IndexedDB:`, error);
      throw error;
    }
  }, [storeName, data]);

  return [data, saveData];
};

export default useIndexedDB;
