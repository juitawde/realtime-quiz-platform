/**
 * IndexedDB storage manager for custom quizzes on the host's device.
 */
const QuizStorage = (() => {
  const DB_NAME = 'QuizArenaDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'quizzes';

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported in this browser; falling back to memory/session.');
        return resolve(null);
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('title', 'title', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        resolve(null);
      };
    });
    return dbPromise;
  }

  // Fallback in-memory/localStorage cache if IndexedDB fails
  function fallbackGet(id) {
    try {
      const data = JSON.parse(localStorage.getItem('qa_quizzes') || '{}');
      return id ? data[id] : Object.values(data);
    } catch {
      return id ? null : [];
    }
  }

  function fallbackSave(quiz) {
    try {
      const data = JSON.parse(localStorage.getItem('qa_quizzes') || '{}');
      data[quiz.id] = quiz;
      localStorage.setItem('qa_quizzes', JSON.stringify(data));
      return quiz;
    } catch (e) {
      console.warn('Fallback storage write failed', e);
      return quiz;
    }
  }

  function fallbackDelete(id) {
    try {
      const data = JSON.parse(localStorage.getItem('qa_quizzes') || '{}');
      delete data[id];
      localStorage.setItem('qa_quizzes', JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  async function saveQuiz(quiz) {
    const id = quiz.id || `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const record = {
      ...quiz,
      id,
      questionCount: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
      createdAt: quiz.createdAt || now,
      updatedAt: now
    };

    const db = await openDB();
    if (!db) return fallbackSave(record);

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);
        req.onsuccess = () => resolve(record);
        req.onerror = () => {
          console.warn('Failed to save quiz in IndexedDB, using fallback:', req.error);
          resolve(fallbackSave(record));
        };
      } catch (err) {
        console.warn('IndexedDB transaction error:', err);
        resolve(fallbackSave(record));
      }
    });
  }

  async function getQuiz(id) {
    if (!id) return null;
    const db = await openDB();
    if (!db) return fallbackGet(id);

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || fallbackGet(id));
        req.onerror = () => resolve(fallbackGet(id));
      } catch {
        resolve(fallbackGet(id));
      }
    });
  }

  async function getAllQuizzes() {
    const db = await openDB();
    if (!db) {
      const list = fallbackGet();
      return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          resolve(list);
        };
        req.onerror = () => {
          const list = fallbackGet();
          resolve(list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
        };
      } catch {
        const list = fallbackGet();
        resolve(list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
      }
    });
  }

  async function deleteQuiz(id) {
    if (!id) return false;
    const db = await openDB();
    if (!db) return fallbackDelete(id);

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => {
          fallbackDelete(id);
          resolve(true);
        };
        req.onerror = () => resolve(fallbackDelete(id));
      } catch {
        resolve(fallbackDelete(id));
      }
    });
  }

  async function duplicateQuiz(id) {
    const original = await getQuiz(id);
    if (!original) return null;
    const duplicate = JSON.parse(JSON.stringify(original));
    duplicate.id = `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    duplicate.title = `Copy of ${original.title || 'Untitled Quiz'}`.slice(0, 100);
    duplicate.createdAt = Date.now();
    duplicate.updatedAt = Date.now();
    return saveQuiz(duplicate);
  }

  return {
    saveQuiz,
    getQuiz,
    getAllQuizzes,
    deleteQuiz,
    duplicateQuiz
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuizStorage;
}
