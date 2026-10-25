const mongoose = require("mongoose");

const questionItemSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctOption: { type: Number, required: true },
    explanation: { type: String, default: "" },
    timeLimitSeconds: { type: Number, default: 15 }
  },
  { _id: false }
);

const quizTemplateSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    ownerId: {
      type: String,
      index: true,
      default: null
    },
    category: {
      type: String,
      default: "General"
    },
    questions: [questionItemSchema],
    sourceType: {
      type: String,
      enum: ["default", "manual", "imported"],
      default: "manual"
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.QuizTemplate || mongoose.model("QuizTemplate", quizTemplateSchema);
