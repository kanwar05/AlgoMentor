import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [EMAIL_PATTERN, "Email must be a valid email address"]
    },
    password: { type: String, required: true, minlength: 8, maxlength: 72, select: false },
    codingGoal: { type: String, default: "Crack product-based company interviews", trim: true },
    targetCompany: {
      type: String,
      enum: ["Google", "Amazon", "Microsoft", "Meta", "Other"],
      default: "Google"
    },
    weeklyGoal: { type: Number, min: 1, max: 50, default: 10 },
    leetcodeUsername: { type: String, trim: true, default: "" },
    codeforcesHandle: { type: String, trim: true, default: "" },
    lastLeetCodeSync: { type: Date, default: null },
    lastCodeforcesSync: { type: Date, default: null }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model("User", userSchema);
