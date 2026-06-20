import mongoose from "mongoose";

const revisionTaskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    problemId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    completed: { type: Boolean, default: false, index: true },
    completedAt: { type: Date, default: null },
    result: { type: String, enum: ["solved", "hint", "failed"], default: null }
  },
  { timestamps: true }
);

revisionTaskSchema.index(
  { userId: 1, problemId: 1 },
  { unique: true, partialFilterExpression: { completed: false } }
);
revisionTaskSchema.index({ userId: 1, completedAt: -1 });

export default mongoose.model("RevisionTask", revisionTaskSchema);
