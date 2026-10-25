const mongoose = require("mongoose");

const quizParticipantSchema = new mongoose.Schema(
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
    userId: {
      type: String,
      default: null,
      index: true
    },
    socketId: {
      type: String,
      required: true
    },
    playerName: {
      type: String,
      required: true,
      trim: true
    },
    score: {
      type: Number,
      default: 0
    },
    rank: {
      type: Number,
      default: null
    },
    correctCount: {
      type: Number,
      default: 0
    },
    incorrectCount: {
      type: Number,
      default: 0
    },
    unansweredCount: {
      type: Number,
      default: 0
    },
    totalResponseTimeMs: {
      type: Number,
      default: 0
    },
    avgResponseTimeMs: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound index for querying a session's participants
quizParticipantSchema.index({ quizSessionId: 1, score: -1, playerName: 1 });

quizParticipantSchema.virtual("quiz_session_id").get(function () {
  return this.quizSessionId;
});

module.exports = mongoose.models.QuizParticipant || mongoose.model("QuizParticipant", quizParticipantSchema);
