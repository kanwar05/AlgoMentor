import Problem from "../models/Problem.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";

const sanitizeProblem = (body) => ({
  title: body.title,
  platform: body.platform,
  difficulty: body.difficulty,
  topics: Array.isArray(body.topics) ? body.topics : [body.topic].filter(Boolean),
  status: body.status,
  link: body.link,
  solvedDate: body.solvedDate,
  notes: body.notes
});

export const listProblems = asyncHandler(async (req, res) => {
  const { search = "", difficulty, status, topic, page = 1, limit = 50 } = req.query;
  const filter = { user: req.user._id };
  if (search) filter.title = { $regex: search, $options: "i" };
  if (difficulty) filter.difficulty = difficulty;
  if (status) filter.status = status;
  if (topic) filter.topics = topic;

  const safeLimit = Math.min(Number(limit) || 50, 100);
  const skip = (Math.max(Number(page), 1) - 1) * safeLimit;
  const [problems, total] = await Promise.all([
    Problem.find(filter).sort({ solvedDate: -1 }).skip(skip).limit(safeLimit),
    Problem.countDocuments(filter)
  ]);
  res.json({ problems, pagination: { total, page: Number(page), limit: safeLimit, pages: Math.ceil(total / safeLimit) } });
});

export const createProblem = asyncHandler(async (req, res) => {
  const payload = sanitizeProblem(req.body);
  if (!payload.title || !payload.platform || !payload.difficulty || !payload.topics.length) {
    throw new HttpError(400, "Title, platform, difficulty, and at least one topic are required");
  }
  const problem = await Problem.create({ ...payload, user: req.user._id });
  res.status(201).json({ problem });
});

export const updateProblem = asyncHandler(async (req, res) => {
  const problem = await Problem.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    sanitizeProblem(req.body),
    { new: true, runValidators: true }
  );
  if (!problem) throw new HttpError(404, "Problem not found");
  res.json({ problem });
});

export const deleteProblem = asyncHandler(async (req, res) => {
  const problem = await Problem.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!problem) throw new HttpError(404, "Problem not found");
  res.status(204).send();
});
