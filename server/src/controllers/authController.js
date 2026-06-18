import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { createToken } from "../utils/token.js";

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  codingGoal: user.codingGoal,
  targetCompany: user.targetCompany,
  weeklyGoal: user.weeklyGoal
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, codingGoal, targetCompany } = req.body;
  if (!name || !email || !password) throw new HttpError(400, "Name, email, and password are required");
  if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters");

  const exists = await User.exists({ email: email.toLowerCase() });
  if (exists) throw new HttpError(409, "An account with that email already exists");
  const user = await User.create({ name, email, password, codingGoal, targetCompany });
  res.status(201).json({ token: createToken(user._id), user: publicUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new HttpError(400, "Email and password are required");
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.comparePassword(password))) throw new HttpError(401, "Invalid email or password");
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
