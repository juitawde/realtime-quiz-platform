const mongoose = require("mongoose");

const questionResultSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    quizSessionId: {
      type: String,
      required: true,
      index: true
    },
    participantId: {
      type: String,
      required: true,
      index: true
    },
    questionIndex: {
      type: Number,
      required: true
    },
    questionText: {
      type: String,
      required: true
    },
    selectedOption: {
      type: Number,
      default: null
    },
    selectedText: {
      type: String,
      default: null
    },
    correctOption: {
      type: Number,
      required: true
    },
    correctText: {
      type: String,
      required: true
    },
    isCorrect: {
      type: Number,
      enum: [0, 1],
      default: 0
    },
    isUnanswered: {
      type: Number,
      enum: [0, 1],
      default: 0
    },
    responseTimeMs: {
      type: Number,
      default: 0
    },
    pointsEarned: {
      type: Number,
      default: 0
    },
    explanation: {
      type: String,
      default: ""
    },
    answeredAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound uniqueness constraint to avoid duplicate submissions for the same participant & question
questionResultSchema.index(
  { quizSessionId: 1, participantId: 1, questionIndex: 1 },
  { unique: true }
);

questionResultSchema.virtual("quiz_session_id").get(function () {
  return this.quizSessionId;
});

questionResultSchema.virtual("is_unanswered").get(function () {
  return this.isUnanswered;
});

questionResultSchema.virtual("is_correct").get(function () {
  return this.isCorrect;
});

module.exports = mongoose.models.QuestionResult || mongoose.model("QuestionResult", questionResultSchema);
