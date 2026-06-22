import MockInterview from "../models/MockInterview.js";
import Problem from "../models/Problem.js";
import RecommendationFeedback from "../models/RecommendationFeedback.js";
import SyncedProblem from "../models/SyncedProblem.js";
import mongoose from "mongoose";
import {
  buildNextPracticePlan,
  generateMockInterviewProblems,
  mockInterviewExpiry,
  scoreMockInterview
} from "../services/mockInterviewService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";

const companies = new Set(["Google", "Amazon", "Microsoft", "Meta", "Other"]);
const difficulties = new Set(["Easy", "Medium", "Hard"]);

export const createMockInterview = asyncHandler(async (req, res) => {
  const company = req.body.company;
  const difficulty = req.body.difficulty;
  const duration = Number(req.body.duration);
  if (!companies.has(company)) throw new HttpError(400, "Select a valid company");
  if (!difficulties.has(difficulty)) throw new HttpError(400, "Select a valid difficulty");
  if (!Number.isFinite(duration) || duration < 15 || duration > 180) {
    throw new HttpError(400, "Duration must be between 15 and 180 minutes");
  }

  const [manual, synced, feedback] = await Promise.all([
    Problem.find({ user: req.user._id }).select("title").lean(),
    SyncedProblem.find({ userId: req.user._id }).select("title").lean(),
    RecommendationFeedback.find({ userId: req.user._id }).lean()
  ]);
  const startedAt = new Date();
  const problems = generateMockInterviewProblems({
    company,
    difficulty,
    duration,
    solvedTitles: [...manual, ...synced].map((problem) => problem.title),
    feedbackItems: feedback
  });
  const interview = await MockInterview.create({
    userId: req.user._id,
    company,
    difficulty,
    duration,
    problems,
    startedAt,
    expiresAt: mockInterviewExpiry(startedAt, duration)
  });
  res.status(201).json({ interview });
});

export const getMockInterview = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw new HttpError(404, "Mock interview not found");
  const interview = await MockInterview.findOne({ _id: req.params.id, userId: req.user._id }).lean();
  if (!interview) throw new HttpError(404, "Mock interview not found");
  res.json({ interview });
});

export const completeMockInterview = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw new HttpError(404, "Mock interview not found");
  const interview = await MockInterview.findOne({ _id: req.params.id, userId: req.user._id });
  if (!interview) throw new HttpError(404, "Mock interview not found");
  if (interview.status === "completed") return res.json({ interview });
  if (new Date(interview.expiresAt).getTime() <= Date.now()) {
    throw new HttpError(400, "This mock interview has expired and can no longer be submitted");
  }

  const result = scoreMockInterview(interview.problems.map((problem) => problem.toObject()), req.body.attempts || []);
  const completedAt = new Date();
  interview.problems = result.problems;
  interview.score = result.score;
  interview.weakTopics = result.weakTopics;
  interview.nextPracticePlan = buildNextPracticePlan({
    weakTopics: result.weakTopics,
    completedProblemIds: result.problems.map((problem) => problem.problemId),
    difficulty: interview.difficulty
  });
  interview.status = "completed";
  interview.completedAt = completedAt;
  await interview.save();
  res.json({ interview });
});
