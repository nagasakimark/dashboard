import { getData, setData } from './indexedDB';

const preprocessLessonPlan = (plan) => {
  return {
    ...plan,
    // Handle HTML content from Quill
    content: plan.content || '',  // Quill already provides HTML string
    yearGroup: parseInt(plan.yearGroup) || 1,
    tags: Array.isArray(plan.tags) ? plan.tags : [],
    dateCreated: plan.dateCreated || new Date().toISOString(),
    dateModified: new Date().toISOString()
  };
};

export const exportData = async () => {
  const stores = ['schools', 'assignments', 'schedule', 'textbooks', 'lessonPlans', 'settings', 'todos', 'sections', 'curriculums'];
  const data = {};

  for (const store of stores) {
    const storeData = await getData(store);
    if (store === 'lessonPlans' && Array.isArray(storeData)) {
      data[store] = storeData.map(preprocessLessonPlan);
    } else {
      data[store] = storeData;
    }
  }

  return data;
};

export const importData = async (importedData) => {
  const validStores = ['schools', 'assignments', 'schedule', 'textbooks', 'lessonPlans', 'settings', 'todos', 'sections', 'curriculums'];
  
  for (const store of validStores) {
    if (importedData[store]) {
      if (store === 'lessonPlans') {
        const cleanedPlans = importedData[store].map(plan => {
          // Parse stringified content back to object if needed
          if (plan.content && typeof plan.content === 'string') {
            try {
              plan.content = JSON.parse(plan.content);
            } catch (e) {
              console.warn('Could not parse lesson plan content:', e);
            }
          }
          return preprocessLessonPlan(plan);
        });
        await setData(store, cleanedPlans);
      } else {
        await setData(store, importedData[store]);
      }
    }
  }
};
