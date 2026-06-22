import OpenAI from "openai";
import RecommendationFeedback from "../models/RecommendationFeedback.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { problemBank } from "../data/problemBank.js";
import { generateAnalyticsFromSnapshot } from "../services/analyticsService.js";
import {
  loadAnalyticsSnapshot,
  loadRevisionCandidates,
  loadSolvedRecommendationProblems
} from "../services/insightDataService.js";
import { recommendProblems } from "../services/recommendationService.js";
import { completeRevisionTask, generateRevisionPlan } from "../services/revisionService.js";
import { generateRoadmap } from "../services/roadmapService.js";
import { HttpError } from "../utils/httpError.js";

const recommendationFeedbackTypes = new Set([
  "too_easy",
  "too_hard",
  "already_solved",
  "not_relevant",
  "save_for_later"
]);

async function loadAnalytics(user) {
  const snapshot = await loadAnalyticsSnapshot(user._id);
  return generateAnalyticsFromSnapshot(snapshot, user.weeklyGoal);
}

export async function addRoadmapExplanation(
  roadmap,
  {
    apiKey = process.env.OPENAI_API_KEY,
    model = process.env.OPENAI_MODEL || "gpt-4o-mini",
    client = apiKey ? new OpenAI({ apiKey, timeout: 10_000, maxRetries: 1 }) : null
  } = {}
) {
  if (!client) return roadmap;

  try {
    const response = await client.responses.create({
      model,
      input: `In 120 words or less, coach a DSA student whose priority topics are ${roadmap.focusTopics.join(", ")}. Explain why this learning sequence works: ${roadmap.path.map((step) => step.topic).join(" -> ")}. Be practical and encouraging.`
    });
    roadmap.aiExplanation = response.output_text || null;
  } catch {
    roadmap.aiExplanation = null;
  }
  return roadmap;
}

export const getAnalytics = asyncHandler(async (req, res) => {
  res.json(await loadAnalytics(req.user));
});

export const getRoadmap = asyncHandler(async (req, res) => {
  const analytics = await loadAnalytics(req.user);
  const roadmap = generateRoadmap(analytics.allTopicStats);

  if (req.query.explain === "true" && process.env.OPENAI_API_KEY) {
    await addRoadmapExplanation(roadmap);
  }
  res.json(roadmap);
});

export const getRevisionPlan = asyncHandler(async (req, res) => {
  const analytics = await loadAnalytics(req.user);
  const candidates = await loadRevisionCandidates(req.user._id, analytics.weakTopics);
  res.json(await generateRevisionPlan(req.user._id, candidates, analytics.weakTopics));
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
  const [analytics, feedback, solvedProblems] = await Promise.all([
    loadAnalytics(req.user),
    RecommendationFeedback.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean(),
    loadSolvedRecommendationProblems(req.user._id, problemBank.map((problem) => problem.title))
  ]);
  res.json({
    targetCompany: req.user.targetCompany,
    recommendations: recommendProblems(solvedProblems, analytics.weakTopics, req.user.targetCompany, feedback)
  });
});

export const saveRecommendationFeedback = asyncHandler(async (req, res) => {
  const feedback = req.body.feedback;
  if (!recommendationFeedbackTypes.has(feedback)) {
    throw new HttpError(400, "Invalid recommendation feedback");
  }
  const problemId = String(req.params.problemId || "").trim();
  if (!problemId) throw new HttpError(400, "Problem ID is required");

  const record = await RecommendationFeedback.findOneAndUpdate(
    { userId: req.user._id, problemId },
    { $set: { feedback }, $setOnInsert: { userId: req.user._id, problemId } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();
  res.json({ feedback: record });
});
