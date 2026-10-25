const mongoose = require("mongoose");

const quizSessionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    pin: {
      type: String,
      required: true,
      index: true
    },
    hostUserId: {
      type: String,
      default: null,
      index: true
    },
    hostName: {
      type: String,
      default: "Host"
    },
    quizTitle: {
      type: String,
      required: true
    },
    category: {
      type: String,
      default: "Mixed"
    },
    totalQuestions: {
      type: Number,
      required: true
    },
    questionsJson: {
      type: String,
      required: true // Immutable snapshot of questions serialized as JSON string
    },
    status: {
      type: String,
      enum: ["active", "completed", "interrupted"],
      default: "active",
      index: true
    },
    startTime: {
      type: Date,
      default: Date.now
    },
    endTime: {
      type: Date,
      default: null
    },
    durationSeconds: {
      type: Number,
      default: 0
    },
    participantsCount: {
      type: Number,
      default: 0
    },
    winnerName: {
      type: String,
      default: null
    },
    winnerScore: {
      type: Number,
      default: null
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

quizSessionSchema.virtual("start_time").get(function () {
  return this.startTime ? this.startTime.getTime() : null;
});

quizSessionSchema.virtual("end_time").get(function () {
  return this.endTime ? this.endTime.getTime() : null;
});

module.exports = mongoose.models.QuizSession || mongoose.model("QuizSession", quizSessionSchema);
