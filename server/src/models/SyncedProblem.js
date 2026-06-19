import mongoose from "mongoose";

const syncedProblemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    platform: { type: String, enum: ["LeetCode", "Codeforces"], required: true },
    platformProblemId: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, trim: true, default: "" },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
    topics: [{ type: String, trim: true }],
    status: { type: String, enum: ["Solved", "Revision", "Weak"], default: "Solved" },
    solvedAt: { type: Date, default: null },
    submissionId: { type: String, trim: true, default: "" },
    problemUrl: { type: String, trim: true, default: "" },
    language: { type: String, trim: true, default: "" },
    verdict: { type: String, trim: true, default: "OK" },
    rating: { type: Number, default: null }
  },
  { timestamps: true }
);

// Deduplication is enforced at the database layer as well as in sync services.
syncedProblemSchema.index(
  { userId: 1, platform: 1, platformProblemId: 1 },
  { unique: true }
);
syncedProblemSchema.index({ userId: 1, solvedAt: -1 });
syncedProblemSchema.index({ userId: 1, platform: 1 });

export default mongoose.model("SyncedProblem", syncedProblemSchema);
