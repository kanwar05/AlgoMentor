import mongoose from "mongoose";

const mockProblemSchema = new mongoose.Schema(
  {
    problemId: { type: String, required: true },
    title: { type: String, required: true },
    platform: { type: String, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    topics: [{ type: String }],
    companies: [{ type: String }],
    link: { type: String, default: "" },
    result: { type: String, enum: ["solved", "hint", "failed", "skipped"], default: "skipped" }
  },
  { _id: false }
);

const mockInterviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    company: { type: String, required: true, trim: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    duration: { type: Number, min: 15, max: 180, required: true },
    problems: { type: [mockProblemSchema], validate: [(items) => items.length >= 2 && items.length <= 3, "Mock interviews require 2–3 problems"] },
    score: { type: Number, min: 0, max: 100, default: null },
    weakTopics: { type: [String], default: [] },
    nextPracticePlan: { type: [mockProblemSchema], default: [] },
    status: { type: String, enum: ["active", "completed"], default: "active", index: true },
    startedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

mockInterviewSchema.index({ userId: 1, createdAt: -1 });
mockInterviewSchema.index({ userId: 1, status: 1, expiresAt: -1 });

export default mongoose.model("MockInterview", mockInterviewSchema);
