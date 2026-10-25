/**
 * Client-side file import coordinator.
 * Reads simple files directly in the browser and delegates binary files (PDF, DOCX, XLSX)
 * to the server parser endpoint.
 */
const QuizImporter = (() => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

  function checkFileSize(file) {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum allowed size is 10MB.`);
    }
  }

  function readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file locally.'));
      reader.readAsText(file, 'utf-8');
    });
  }

  async function importFile(file, options = {}) {
    checkFileSize(file);
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();

    // 1. Client-side JSON parsing
    if (ext === '.json') {
      const text = await readTextFile(file);
      const parsed = QuizParser.parseJSONQuiz(text);
      if (!parsed.ok) {
        throw new Error(parsed.error);
      }
      return {
        format: 'json',
        title: parsed.title || file.name.replace(/\.[^/.]+$/, ''),
        questions: parsed.questions,
        rawCount: parsed.questions.length
      };
    }

    // 2. Client-side Plain Text / Markdown parsing
    if (ext === '.txt' || ext === '.md') {
      const text = await readTextFile(file);
      const parsed = QuizParser.parseTextQuestions(text);
      if (!parsed.questions.length) {
        throw new Error('No quiz questions could be identified in the text document. Please verify the format.');
      }
      return {
        format: ext === '.md' ? 'markdown' : 'text',
        title: file.name.replace(/\.[^/.]+$/, ''),
        questions: parsed.questions,
        rawCount: parsed.rawCount,
        warnings: parsed.warnings
      };
    }

    // 3. Client-side CSV parsing
    if (ext === '.csv' && !options.forceServer) {
      const text = await readTextFile(file);
      const rows = QuizParser.parseCSV(text);
      const tableResult = QuizParser.parseTableData(rows, options.customMapping || null);
      if (!tableResult.needsMapping && tableResult.questions.length > 0) {
        return {
          format: 'csv',
          title: file.name.replace(/\.[^/.]+$/, ''),
          questions: tableResult.questions,
          headers: tableResult.headers,
          detectedMapping: tableResult.mapping,
          needsMapping: false,
          rawCount: tableResult.questions.length
        };
      }
      // If client CSV needs custom mapping, we still return headers and mapping info
      if (tableResult.needsMapping) {
        return {
          format: 'csv',
          title: file.name.replace(/\.[^/.]+$/, ''),
          questions: tableResult.questions,
          headers: tableResult.headers,
          detectedMapping: tableResult.mapping,
          needsMapping: true,
          mappingError: tableResult.error,
          rows: rows
        };
      }
    }

    // 4. Binary or Advanced formats via Server Endpoint (PDF, DOCX, XLSX, Images, OCR, AI)
    const formData = new FormData();
    formData.append('quizFile', file);
    if (options.useAI) formData.append('useAI', 'true');
    if (options.sheetName) formData.append('sheetName', options.sheetName);
    if (options.customMapping) formData.append('customMapping', JSON.stringify(options.customMapping));

    const response = await fetch('/api/quiz/parse-file', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `Server error during parsing (${response.status})`);
    }

    return result;
  }

  return {
    importFile,
    MAX_FILE_SIZE
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuizImporter;
}
