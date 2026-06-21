import mongoose from "mongoose";

const reviewAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    problemId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    result: { type: String, enum: ["solved", "hint", "failed"], required: true },
    timeTaken: { type: Number, min: 0, default: null },
    confidence: { type: Number, min: 0, max: 100, default: null },
    reviewedAt: { type: Date, required: true, default: Date.now, index: true },
    nextReviewAt: { type: Date, required: true, index: true },
    interval: { type: Number, min: 1, required: true },
    easeFactor: { type: Number, min: 1.3, required: true }
  },
  { timestamps: true }
);

reviewAttemptSchema.index({ userId: 1, problemId: 1, reviewedAt: -1 });
reviewAttemptSchema.index({ userId: 1, nextReviewAt: 1 });

export default mongoose.model("ReviewAttempt", reviewAttemptSchema);
