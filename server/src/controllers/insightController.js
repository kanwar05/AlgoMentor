import OpenAI from "openai";
import Problem from "../models/Problem.js";
import SyncedProblem from "../models/SyncedProblem.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateAnalytics } from "../services/analyticsService.js";
import { recommendProblems } from "../services/recommendationService.js";
import { completeRevisionTask, generateRevisionPlan } from "../services/revisionService.js";
import { generateRoadmap } from "../services/roadmapService.js";

async function loadContext(user) {
  const [manualProblems, syncedProblems] = await Promise.all([
    Problem.find({ user: user._id }).sort({ solvedDate: -1 }).lean(),
    SyncedProblem.find({ userId: user._id }).sort({ solvedAt: -1 }).lean()
  ]);
  const normalizedSynced = syncedProblems.map((problem) => ({
    _id: problem._id,
    title: problem.title,
    platform: problem.platform,
    difficulty: problem.difficulty,
    topics: problem.topics,
    status: problem.status,
    confidence: problem.confidence,
    notes: problem.notes,
    lastReviewedAt: problem.lastReviewedAt,
    link: problem.problemUrl,
    solvedDate: problem.solvedAt,
    synced: true
  }));

  // Deduplication across manual and synced sources prevents inflated analytics.
  const seen = new Set();
  const problems = [...manualProblems, ...normalizedSynced].filter((problem) => {
    const key = `${String(problem.platform).toLowerCase()}:${String(problem.title).toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => {
    if (!a.solvedDate) return 1;
    if (!b.solvedDate) return -1;
    return new Date(b.solvedDate) - new Date(a.solvedDate);
  });
  const analytics = generateAnalytics(problems, user.weeklyGoal);
  return { problems, analytics };
}

export const getAnalytics = asyncHandler(async (req, res) => {
  const { analytics } = await loadContext(req.user);
  res.json(analytics);
});

export const getRoadmap = asyncHandler(async (req, res) => {
  const { analytics } = await loadContext(req.user);
  const roadmap = generateRoadmap(analytics.allTopicStats);

  if (req.query.explain === "true" && process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: `In 120 words or less, coach a DSA student whose priority topics are ${roadmap.focusTopics.join(", ")}. Explain why this learning sequence works: ${roadmap.path.map((step) => step.topic).join(" -> ")}. Be practical and encouraging.`
    });
    roadmap.aiExplanation = response.output_text;
  }
  res.json(roadmap);
});

export const getRevisionPlan = asyncHandler(async (req, res) => {
  const { problems, analytics } = await loadContext(req.user);
  res.json(await generateRevisionPlan(req.user._id, problems, analytics.weakTopics));
});

export const completeRevisionPlanTask = asyncHandler(async (req, res) => {
  const completed = await completeRevisionTask({
    taskId: req.params.taskId,
    userId: req.user._id,
    result: req.body.result || "solved",
    timeTaken: req.body.timeTaken,
    confidence: req.body.confidence
  });
  res.json({ task: completed, attempt: completed.attempt });
});

export const getRecommendations = asyncHandler(async (req, res) => {
  const { problems, analytics } = await loadContext(req.user);
  res.json({
    targetCompany: req.user.targetCompany,
    recommendations: recommendProblems(problems, analytics.weakTopics, req.user.targetCompany)
  });
});
