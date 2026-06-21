import mongoose from "mongoose";

const recommendationFeedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    problemId: { type: String, required: true, trim: true },
    feedback: {
      type: String,
      enum: ["too_easy", "too_hard", "already_solved", "not_relevant", "save_for_later"],
      required: true
    }
  },
  { timestamps: true }
);

recommendationFeedbackSchema.index({ userId: 1, problemId: 1 }, { unique: true });
recommendationFeedbackSchema.index({ userId: 1, feedback: 1, createdAt: -1 });

export default mongoose.model("RecommendationFeedback", recommendationFeedbackSchema);
