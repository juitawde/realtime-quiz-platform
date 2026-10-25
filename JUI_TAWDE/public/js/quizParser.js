/**
 * Modular parser to extract questions, options, correct answers, and explanations
 * from various text, structured, and tabular formats.
 */
(function (root, factory) {
  if (typeof exports === 'object' && typeof module === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.QuizParser = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // Clean and normalize text
  function cleanLine(l) {
    return l.replace(/\r/g, '').trim();
  }

  /**
   * Parse plain text or Markdown into structured questions.
   */
  function parseTextQuestions(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return { questions: [], rawCount: 0, warnings: ['Empty text provided.'] };
    }

    const lines = rawText.split('\n').map(cleanLine);
    const questions = [];
    const warnings = [];

    // Separate possible trailing Answer Key section
    let bodyLines = [];
    let answerKeyLines = [];
    let inAnswerKey = false;

    const answerKeyHeaderRegex = /^(?:answer\s*key|answers|solutions|correct\s*answers)[\s:]*$/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!inAnswerKey && answerKeyHeaderRegex.test(line)) {
        inAnswerKey = true;
        continue;
      }
      if (inAnswerKey) {
        answerKeyLines.push(line);
      } else {
        bodyLines.push(line);
      }
    }

    // Parse separate answer key if found
    const answerKeyMap = new Map();
    if (answerKeyLines.length > 0) {
      const keyEntryRegex = /^(?:q(?:uestion)?\s*)?(\d+)[\.\)\:\-\s]+([A-Fa-f0-9]|true|false|[^\n]+?)(?:[\s\-–—:]+(.*))?$/;
      answerKeyLines.forEach(l => {
        if (!l) return;
        const match = l.match(keyEntryRegex);
        if (match) {
          const qNum = parseInt(match[1], 10);
          const ansVal = match[2].trim();
          const explVal = match[3] ? match[3].trim() : '';
          answerKeyMap.set(qNum, { answer: ansVal, explanation: explVal });
        }
      });
    }

    // Question start regex:
    // "1. ", "1) ", "Question 1:", "Q1.", "Q1:", "### Question 1"
    const qStartRegex = /^(?:#{1,6}\s*)?(?:(?:question|q)\s*(\d+)[\.\:\-\s]*|(\d+)[\.\)][\s]+)(.*)$/i;
    // Option regex:
    // "A. ", "A) ", "(A) ", "- [ ] Option", "- [x] Option", "* A. Option"
    const optRegex = /^([*+–-]\s*)?(?:\(([A-Fa-f0-9])\)|([A-Fa-f0-9])[\.\)][\s]*|\[([ xX])\][\s]*)(.*)$/;
    // Inline answer regex:
    const ansRegex = /^(?:correct\s*answer|answer\s*key|answer|ans)[\s:\-=]+(.*)$/i;
    // Inline explanation regex:
    const explRegex = /^(?:explanation|explain|rationale|reason|note)[\s:\-=]+(.*)$/i;

    let currentQ = null;

    function finalizeQuestion(q, idx) {
      if (!q) return;
      // Do not accept preamble/headers that have no options and no answers as a question
      if (q.options.length === 0 && q.rawAnswer === null && !q.explanation) {
        return;
      }

      // Check external answer key if answer or explanation is missing
      const keyData = answerKeyMap.get(q.number || (idx + 1));
      if (keyData) {
        if (q.rawAnswer === null || q.rawAnswer === undefined) {
          q.rawAnswer = keyData.answer;
        }
        if (!q.explanation && keyData.explanation) {
          q.explanation = keyData.explanation;
        }
      }

      // Resolve correctOption index
      let correctOption = -1;
      if (q.checkedIndex !== undefined && q.checkedIndex !== -1) {
        correctOption = q.checkedIndex;
      } else if (q.rawAnswer !== null && q.rawAnswer !== undefined) {
        const raw = String(q.rawAnswer).trim();
        // Check letter: A, B, C, D
        const letterMatch = raw.match(/^([A-Fa-f])(?:\b|\.|\))/);
        if (letterMatch) {
          correctOption = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
        } else if (/^\d+$/.test(raw)) {
          // Number index: 0 or 1-based
          const num = parseInt(raw, 10);
          if (num >= 1 && num <= q.options.length) {
            correctOption = num - 1; // 1-based
          } else if (num === 0 && q.options.length > 0) {
            correctOption = 0;
          }
        } else {
          // Match option text
          const foundIdx = q.options.findIndex(opt => opt.toLowerCase() === raw.toLowerCase());
          if (foundIdx !== -1) {
            correctOption = foundIdx;
          }
        }
      }

      const attentionReasons = [];
      if (!q.question.trim()) {
        attentionReasons.push('Question text is empty');
      }
      if (q.options.length < 2) {
        attentionReasons.push('Less than 2 options found');
      }
      if (correctOption < 0 || correctOption >= q.options.length) {
        attentionReasons.push('Correct answer could not be determined');
      }
      if (!q.explanation || !q.explanation.trim()) {
        attentionReasons.push('Explanation is missing');
      }

      questions.push({
        number: q.number || (idx + 1),
        question: q.question.trim(),
        options: q.options.map(o => o.trim()).filter(Boolean),
        correctOption: correctOption >= 0 ? correctOption : 0,
        explanation: (q.explanation || '').trim(),
        timeLimitSeconds: q.timeLimitSeconds || 15,
        needsAttention: attentionReasons.length > 0,
        attentionReasons: attentionReasons
      });
    }

    let questionIndexCounter = 0;

    for (let i = 0; i < bodyLines.length; i++) {
      const line = bodyLines[i];
      if (!line) continue;

      // Check for Question start
      const qMatch = line.match(qStartRegex);
      if (qMatch) {
        if (currentQ) {
          finalizeQuestion(currentQ, questionIndexCounter++);
        }
        const num = qMatch[1] || qMatch[2] ? parseInt(qMatch[1] || qMatch[2], 10) : (questionIndexCounter + 1);
        const qText = qMatch[3] ? qMatch[3].trim() : '';
        currentQ = {
          number: num,
          question: qText,
          options: [],
          rawAnswer: null,
          checkedIndex: -1,
          explanation: '',
          readingState: 'question'
        };
        continue;
      }

      if (!currentQ) {
        // Look ahead for first question; or if starts with options, make a default question
        currentQ = {
          number: 1,
          question: line,
          options: [],
          rawAnswer: null,
          checkedIndex: -1,
          explanation: '',
          readingState: 'question'
        };
        continue;
      }

      // Check for Option
      const optMatch = line.match(optRegex);
      if (optMatch) {
        currentQ.readingState = 'option';
        const isBulletAsterisk = optMatch[1] && optMatch[1].includes('*');
        const letter = optMatch[2] || optMatch[3];
        const checkboxState = optMatch[4];
        let optText = optMatch[5] ? optMatch[5].trim() : '';

        // If markdown marked [x]
        if (checkboxState && checkboxState.toLowerCase() === 'x') {
          currentQ.checkedIndex = currentQ.options.length;
        } else if (isBulletAsterisk) {
          currentQ.checkedIndex = currentQ.options.length;
        }

        // Check if option text has inline *Correct* or (Correct)
        if (/\((?:correct|answer)\)|\*(?:correct|answer)\*/i.test(optText)) {
          currentQ.checkedIndex = currentQ.options.length;
          optText = optText.replace(/\((?:correct|answer)\)|\*(?:correct|answer)\*/gi, '').trim();
        }

        currentQ.options.push(optText);
        continue;
      }

      // Check for Inline Answer
      const ansMatch = line.match(ansRegex);
      if (ansMatch) {
        currentQ.readingState = 'answer';
        currentQ.rawAnswer = ansMatch[1].trim();
        continue;
      }

      // Check for Inline Explanation
      const explMatch = line.match(explRegex);
      if (explMatch) {
        currentQ.readingState = 'explanation';
        currentQ.explanation = explMatch[1].trim();
        continue;
      }

      // Continuation line based on state
      if (currentQ.readingState === 'explanation') {
        currentQ.explanation += (currentQ.explanation ? ' ' : '') + line;
      } else if (currentQ.readingState === 'question' && currentQ.options.length === 0) {
        currentQ.question += (currentQ.question ? ' ' : '') + line;
      } else if (currentQ.readingState === 'option' && currentQ.options.length > 0) {
        currentQ.options[currentQ.options.length - 1] += ' ' + line;
      }
    }

    if (currentQ) {
      finalizeQuestion(currentQ, questionIndexCounter++);
    }

    return {
      questions,
      rawCount: questions.length,
      warnings
    };
  }

  /**
   * Parse CSV string into array of rows.
   */
  function parseCSV(text) {
    const lines = [];
    let row = [''];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push('');
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') {
          i++;
        }
        lines.push(row);
        row = [''];
      } else {
        row[row.length - 1] += c;
      }
    }
    if (row.length > 1 || (row.length === 1 && row[0].trim())) {
      lines.push(row);
    }
    return lines;
  }

  /**
   * Parse tabular data (from CSV or XLSX rows) into questions.
   * Supports auto-detection of column headers and custom column mappings.
   */
  function parseTableData(rows, customMapping = null) {
    if (!Array.isArray(rows) || rows.length < 2) {
      return {
        questions: [],
        headers: [],
        mapping: null,
        needsMapping: true,
        error: 'Table must have at least a header row and one data row.'
      };
    }

    // Filter out completely empty rows
    const cleanRows = rows.filter(r => Array.isArray(r) && r.some(cell => String(cell || '').trim()));
    if (cleanRows.length < 2) {
      return {
        questions: [],
        headers: [],
        mapping: null,
        needsMapping: true,
        error: 'No data rows found.'
      };
    }

    const headerRow = cleanRows[0].map(h => String(h || '').trim());
    const dataRows = cleanRows.slice(1);

    // Auto-detect columns if no customMapping
    const mapping = customMapping || detectColumns(headerRow);

    if (mapping.questionCol === -1 || mapping.optionCols.length < 2) {
      return {
        questions: [],
        headers: headerRow,
        mapping,
        needsMapping: true,
        error: 'Could not automatically identify Question and at least 2 Option columns. Please verify column mapping.'
      };
    }

    const questions = [];

    dataRows.forEach((row, rowIdx) => {
      const qText = String(row[mapping.questionCol] || '').trim();
      if (!qText) return; // Skip rows without question text

      const options = [];
      mapping.optionCols.forEach(colIdx => {
        const val = String(row[colIdx] || '').trim();
        if (val) options.push(val);
      });

      if (options.length < 2) return;

      let rawAns = mapping.answerCol !== -1 ? String(row[mapping.answerCol] || '').trim() : '';
      let correctOption = -1;

      if (rawAns) {
        const letter = rawAns.toUpperCase().match(/^([A-F])/);
        if (letter) {
          correctOption = letter[1].charCodeAt(0) - 65;
        } else if (/^\d+$/.test(rawAns)) {
          const num = parseInt(rawAns, 10);
          if (num >= 1 && num <= options.length) correctOption = num - 1;
          else if (num === 0) correctOption = 0;
        } else {
          const idx = options.findIndex(o => o.toLowerCase() === rawAns.toLowerCase());
          if (idx !== -1) correctOption = idx;
        }
      }

      let expl = mapping.explanationCol !== -1 ? String(row[mapping.explanationCol] || '').trim() : '';
      let timeLimit = mapping.timeLimitCol !== -1 ? parseInt(row[mapping.timeLimitCol], 10) : 15;
      if (isNaN(timeLimit) || timeLimit < 5 || timeLimit > 120) timeLimit = 15;

      const attentionReasons = [];
      if (correctOption < 0 || correctOption >= options.length) {
        attentionReasons.push('Correct answer could not be determined');
        correctOption = 0;
      }
      if (!expl) {
        attentionReasons.push('Explanation is missing');
      }

      questions.push({
        number: questions.length + 1,
        question: qText,
        options,
        correctOption,
        explanation: expl,
        timeLimitSeconds: timeLimit,
        needsAttention: attentionReasons.length > 0,
        attentionReasons
      });
    });

    return {
      questions,
      headers: headerRow,
      mapping,
      needsMapping: false
    };
  }

  function detectColumns(headers) {
    let questionCol = -1;
    const optionCols = [];
    let answerCol = -1;
    let explanationCol = -1;
    let timeLimitCol = -1;

    headers.forEach((h, idx) => {
      const norm = h.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Question detection
      if (questionCol === -1 && (norm === 'question' || norm === 'questiontext' || norm === 'prompt' || norm === 'q')) {
        questionCol = idx;
        return;
      }

      // Answer / Correct answer detection
      if (answerCol === -1 && (
        norm === 'correctanswer' || norm === 'answer' || norm === 'correct' ||
        norm === 'answerkey' || norm === 'key' || norm === 'correctoption'
      )) {
        answerCol = idx;
        return;
      }

      // Explanation detection
      if (explanationCol === -1 && (
        norm === 'explanation' || norm === 'reason' || norm === 'rationale' || norm === 'note'
      )) {
        explanationCol = idx;
        return;
      }

      // Time limit detection
      if (timeLimitCol === -1 && (
        norm === 'timelimit' || norm === 'time' || norm === 'timer' || norm === 'seconds'
      )) {
        timeLimitCol = idx;
        return;
      }

      // Option detection: Option A, Option 1, A, B, C, D
      if (
        /^option[a-f1-6]$/.test(norm) ||
        /^opt[a-f1-6]$/.test(norm) ||
        /^[a-f]$/.test(norm)
      ) {
        optionCols.push(idx);
        return;
      }
    });

    // Fallback if question was not detected by name: first column
    if (questionCol === -1 && headers.length > 2) {
      questionCol = 0;
    }

    // Fallback if options were not matched explicitly: columns between question and answer
    if (optionCols.length < 2) {
      headers.forEach((_, idx) => {
        if (idx !== questionCol && idx !== answerCol && idx !== explanationCol && idx !== timeLimitCol) {
          if (!optionCols.includes(idx)) {
            optionCols.push(idx);
          }
        }
      });
    }

    return {
      questionCol,
      optionCols,
      answerCol,
      explanationCol,
      timeLimitCol
    };
  }

  /**
   * Parse JSON quiz structure with validation.
   */
  function parseJSONQuiz(jsonString) {
    try {
      const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      let rawQuestions = [];
      let title = 'Imported Quiz';

      if (Array.isArray(data)) {
        rawQuestions = data;
      } else if (data && typeof data === 'object') {
        if (data.title) title = String(data.title);
        if (Array.isArray(data.questions)) rawQuestions = data.questions;
      } else {
        return { ok: false, error: 'JSON content must be an array of questions or an object with a "questions" array.' };
      }

      const questions = [];
      rawQuestions.forEach((q, idx) => {
        let correctOpt = q.correctOption;
        if (correctOpt === undefined && q.correctAnswer !== undefined) {
          // Map correctAnswer to correctOption
          if (typeof q.correctAnswer === 'string') {
            const letter = q.correctAnswer.trim().toUpperCase().match(/^[A-F]$/);
            if (letter) {
              correctOpt = letter[0].charCodeAt(0) - 65;
            } else if (Array.isArray(q.options)) {
              const fIdx = q.options.findIndex(o => o.toLowerCase() === q.correctAnswer.toLowerCase());
              correctOpt = fIdx !== -1 ? fIdx : 0;
            }
          } else {
            correctOpt = Number(q.correctAnswer);
          }
        }

        const attentionReasons = [];
        if (!q.question || !String(q.question).trim()) attentionReasons.push('Question text missing');
        if (!Array.isArray(q.options) || q.options.length < 2) attentionReasons.push('Fewer than 2 options');
        if (correctOpt === undefined || correctOpt < 0 || (Array.isArray(q.options) && correctOpt >= q.options.length)) {
          attentionReasons.push('Invalid or missing correct answer');
          correctOpt = 0;
        }
        if (!q.explanation || !String(q.explanation).trim()) attentionReasons.push('Explanation missing');

        questions.push({
          number: idx + 1,
          question: String(q.question || '').trim(),
          options: Array.isArray(q.options) ? q.options.map(o => String(o).trim()) : [],
          correctOption: Number(correctOpt) || 0,
          explanation: String(q.explanation || '').trim(),
          timeLimitSeconds: Number(q.timeLimitSeconds) || 15,
          needsAttention: attentionReasons.length > 0,
          attentionReasons
        });
      });

      return {
        ok: true,
        title,
        questions
      };
    } catch (err) {
      return { ok: false, error: `Invalid JSON syntax: ${err.message}` };
    }
  }

  return {
    parseTextQuestions,
    parseCSV,
    parseTableData,
    detectColumns,
    parseJSONQuiz
  };
});
