import mongoose from "mongoose";

const syncHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    platform: { type: String, enum: ["LeetCode", "Codeforces", "Manual", "All"], required: true },
    status: { type: String, enum: ["success", "partial", "failed"], required: true },
    imported: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    totalAccepted: { type: Number, default: 0 },
    message: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

syncHistorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("SyncHistory", syncHistorySchema);
