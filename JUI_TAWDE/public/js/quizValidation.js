/**
 * Quiz validation logic shared between client and server.
 */
(function (root, factory) {
  if (typeof exports === 'object' && typeof module === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.QuizValidation = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const MAX_QUIZ_TITLE_LENGTH = 100;
  const MAX_QUESTIONS_PER_QUIZ = 100;
  const MIN_QUESTIONS_PER_QUIZ = 1;
  const MAX_QUESTION_TEXT_LENGTH = 500;
  const MIN_OPTIONS_PER_QUESTION = 2;
  const MAX_OPTIONS_PER_QUESTION = 6;
  const MAX_OPTION_TEXT_LENGTH = 200;
  const MAX_EXPLANATION_LENGTH = 1000;
  const DEFAULT_TIME_LIMIT_SECONDS = 15;
  const MIN_TIME_LIMIT_SECONDS = 5;
  const MAX_TIME_LIMIT_SECONDS = 120;

  function sanitizeString(str, maxLength) {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, maxLength);
  }

  function validateQuestion(q, index = 0) {
    const qNum = index + 1;
    const errors = [];
    if (!q || typeof q !== 'object') {
      return { valid: false, errors: [`Question ${qNum} is not a valid object.`] };
    }

    const questionText = sanitizeString(q.question, MAX_QUESTION_TEXT_LENGTH);
    if (!questionText) {
      errors.push(`Question ${qNum} must have non-empty question text.`);
    }

    if (!Array.isArray(q.options) || q.options.length < MIN_OPTIONS_PER_QUESTION) {
      errors.push(`Question ${qNum} must have at least ${MIN_OPTIONS_PER_QUESTION} options.`);
    } else if (q.options.length > MAX_OPTIONS_PER_QUESTION) {
      errors.push(`Question ${qNum} cannot have more than ${MAX_OPTIONS_PER_QUESTION} options.`);
    }

    const sanitizedOptions = [];
    if (Array.isArray(q.options)) {
      q.options.forEach((opt, optIndex) => {
        const text = sanitizeString(opt, MAX_OPTION_TEXT_LENGTH);
        if (!text) {
          errors.push(`Question ${qNum}, Option ${String.fromCharCode(65 + optIndex)} cannot be empty.`);
        }
        sanitizedOptions.push(text);
      });
    }

    let correctOption = q.correctOption;
    // Map string letters like 'A', 'B' or string indexes if passed
    if (typeof correctOption === 'string') {
      const trimmed = correctOption.trim().toUpperCase();
      if (/^[A-F]$/.test(trimmed)) {
        correctOption = trimmed.charCodeAt(0) - 65;
      } else if (!isNaN(Number(trimmed))) {
        correctOption = parseInt(trimmed, 10);
      }
    }

    if (
      typeof correctOption !== 'number' ||
      !Number.isInteger(correctOption) ||
      correctOption < 0 ||
      correctOption >= sanitizedOptions.length
    ) {
      errors.push(`Question ${qNum} must have exactly one valid correct answer selected.`);
    }

    const explanation = sanitizeString(q.explanation, MAX_EXPLANATION_LENGTH);
    if (!explanation) {
      errors.push(`Question ${qNum} must have a non-empty explanation.`);
    }

    let timeLimit = DEFAULT_TIME_LIMIT_SECONDS;
    if (q.timeLimitSeconds !== undefined && q.timeLimitSeconds !== null) {
      const parsedTime = Number(q.timeLimitSeconds);
      if (
        !isNaN(parsedTime) &&
        parsedTime >= MIN_TIME_LIMIT_SECONDS &&
        parsedTime <= MAX_TIME_LIMIT_SECONDS
      ) {
        timeLimit = Math.round(parsedTime);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: {
        question: questionText,
        options: sanitizedOptions,
        correctOption: Number(correctOption),
        explanation: explanation || 'No explanation provided.',
        timeLimitSeconds: timeLimit,
        category: sanitizeString(q.category, 50) || undefined,
        difficulty: sanitizeString(q.difficulty, 50) || undefined
      }
    };
  }

  function validateQuiz(quiz, desiredCount = null) {
    const errors = [];
    if (!quiz || typeof quiz !== 'object') {
      return { valid: false, errors: ['Quiz payload must be an object.'] };
    }

    const title = sanitizeString(quiz.title, MAX_QUIZ_TITLE_LENGTH);
    if (!title) {
      errors.push('Quiz must have a non-empty title.');
    }

    if (!Array.isArray(quiz.questions) || quiz.questions.length < MIN_QUESTIONS_PER_QUIZ) {
      errors.push(`Quiz must contain at least ${MIN_QUESTIONS_PER_QUIZ} question.`);
    } else if (quiz.questions.length > MAX_QUESTIONS_PER_QUIZ) {
      errors.push(`Quiz cannot contain more than ${MAX_QUESTIONS_PER_QUIZ} questions.`);
    }

    if (
      desiredCount !== null &&
      desiredCount !== undefined &&
      Number.isInteger(Number(desiredCount))
    ) {
      const expected = Number(desiredCount);
      const actual = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
      if (actual !== expected) {
        errors.push(`Completed question count (${actual}) must match selected count (${expected}).`);
      }
    }

    const sanitizedQuestions = [];
    if (Array.isArray(quiz.questions)) {
      quiz.questions.forEach((q, idx) => {
        const qValidation = validateQuestion(q, idx);
        if (!qValidation.valid) {
          errors.push(...qValidation.errors);
        }
        if (qValidation.sanitized) {
          sanitizedQuestions.push(qValidation.sanitized);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      summary: errors.length > 0 ? errors[0] : 'Validation passed',
      sanitized: {
        id: quiz.id || undefined,
        title: title,
        questionCount: sanitizedQuestions.length,
        questions: sanitizedQuestions,
        createdAt: quiz.createdAt || Date.now(),
        updatedAt: Date.now()
      }
    };
  }

  return {
    validateQuestion,
    validateQuiz,
    MAX_QUIZ_TITLE_LENGTH,
    MAX_QUESTIONS_PER_QUIZ,
    MIN_QUESTIONS_PER_QUIZ,
    MAX_QUESTION_TEXT_LENGTH,
    MIN_OPTIONS_PER_QUESTION,
    MAX_OPTIONS_PER_QUESTION,
    MAX_OPTION_TEXT_LENGTH,
    MAX_EXPLANATION_LENGTH,
    DEFAULT_TIME_LIMIT_SECONDS,
    MIN_TIME_LIMIT_SECONDS,
    MAX_TIME_LIMIT_SECONDS
  };
});
