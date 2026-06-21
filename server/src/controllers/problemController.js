import Problem from "../models/Problem.js";
import SyncedProblem from "../models/SyncedProblem.js";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { normalizeTopic, normalizeTopics } from "../utils/topicNormalizer.js";

const sanitizeProblem = (body) => ({
  title: body.title,
  platform: body.platform,
  difficulty: body.difficulty,
  topics: normalizeTopics(Array.isArray(body.topics) ? body.topics : body.topic),
  status: body.status,
  confidence: body.confidence === "" || body.confidence === undefined ? null : body.confidence,
  link: body.link,
  solvedDate: body.solvedDate,
  notes: body.notes
});

export const listProblems = asyncHandler(async (req, res) => {
  const { search = "", difficulty, status, topic, platform, page = 1, limit = 50 } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const commonMatch = {};
  if (search) commonMatch.title = { $regex: search, $options: "i" };
  if (difficulty) commonMatch.difficulty = difficulty;
  if (status) commonMatch.status = status;
  if (topic) commonMatch.topics = normalizeTopic(topic);
  if (platform) commonMatch.platform = platform;

  const manualPipeline = [
    { $match: { user: req.user._id, ...commonMatch } },
    {
      $project: {
        _id: 1,
        title: 1,
        platform: 1,
        difficulty: 1,
        topics: 1,
        status: 1,
        confidence: 1,
        link: 1,
        solvedDate: 1,
        notes: 1,
        source: { $literal: "manual" },
        editable: { $literal: true }
      }
    },
    {
      $unionWith: {
        coll: SyncedProblem.collection.name,
        pipeline: [
          { $match: { userId: req.user._id, ...commonMatch } },
          {
            $project: {
              _id: 1,
              title: 1,
              platform: 1,
              difficulty: 1,
              topics: 1,
              status: 1,
              link: "$problemUrl",
              solvedDate: "$solvedAt",
              language: 1,
              verdict: 1,
              rating: 1,
              source: { $literal: "synced" },
              editable: { $literal: false }
            }
          }
        ]
      }
    },
    { $sort: { solvedDate: -1, _id: -1 } },
    {
      $facet: {
        problems: [{ $skip: (safePage - 1) * safeLimit }, { $limit: safeLimit }],
        metadata: [{ $count: "total" }]
      }
    }
  ];

  const [result] = await Problem.aggregate(manualPipeline);
  const problems = result?.problems || [];
  const total = result?.metadata?.[0]?.total || 0;
  res.json({
    problems,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit)
    }
  });
});

export const createProblem = asyncHandler(async (req, res) => {
  const payload = sanitizeProblem(req.body);
  if (!payload.title || !payload.platform || !payload.difficulty || !payload.topics.length) {
    throw new HttpError(400, "Title, platform, difficulty, and at least one topic are required");
  }
  const problem = await Problem.create({ ...payload, user: req.user._id });
  res.status(201).json({ problem });
});

export const getProblem = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new HttpError(404, "Problem not found");
  }

  const problem = await Problem.findOne({
    _id: req.params.id,
    user: req.user._id
  }).lean();

  if (!problem) throw new HttpError(404, "Problem not found");
  res.json(problem);
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
