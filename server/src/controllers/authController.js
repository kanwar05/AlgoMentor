import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { createToken } from "../utils/token.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_PASSWORD_LENGTH = 72;

function validateCredentials(email, password) {
  if (typeof email !== "string") {
    throw new HttpError(400, "Email must be a valid email address");
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
    throw new HttpError(400, "Email must be a valid email address");
  }
  if (typeof password !== "string") {
    throw new HttpError(400, "Password must be a string");
  }
  if (password.length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters");
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`);
  }
  return { email: normalizedEmail, password };
}

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  codingGoal: user.codingGoal,
  targetCompany: user.targetCompany,
  weeklyGoal: user.weeklyGoal,
  leetcodeUsername: user.leetcodeUsername,
  codeforcesHandle: user.codeforcesHandle,
  lastLeetCodeSync: user.lastLeetCodeSync,
  lastCodeforcesSync: user.lastCodeforcesSync
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, codingGoal, targetCompany } = req.body || {};
  if (!name) throw new HttpError(400, "Name, email, and password are required");
  const credentials = validateCredentials(email, password);

  const exists = await User.exists({ email: credentials.email });
  if (exists) throw new HttpError(409, "An account with that email already exists");
  const user = await User.create({
    name,
    email: credentials.email,
    password: credentials.password,
    codingGoal,
    targetCompany
  });
  res.status(201).json({ token: createToken(user._id), user: publicUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const credentials = validateCredentials(email, password);
  const user = await User.findOne({ email: credentials.email }).select("+password");
  if (!user || !(await user.comparePassword(credentials.password))) {
    throw new HttpError(401, "Invalid email or password");
  }
  res.json({ token: createToken(user._id), user: publicUser(user) });
});

export const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ["name", "codingGoal", "targetCompany", "weeklyGoal"];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) req.user[field] = req.body[field];
  });
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});
