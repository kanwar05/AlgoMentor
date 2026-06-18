import OpenAI from "openai";
import Problem from "../models/Problem.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateAnalytics } from "../services/analyticsService.js";
import { recommendProblems } from "../services/recommendationService.js";
import { generateRevisionPlan } from "../services/revisionService.js";
import { generateRoadmap } from "../services/roadmapService.js";

async function loadContext(user) {
  const problems = await Problem.find({ user: user._id }).sort({ solvedDate: -1 }).lean();
  const analytics = generateAnalytics(problems, user.weeklyGoal);
  return { problems, analytics };
}

export const getAnalytics = asyncHandler(async (req, res) => {
  const { analytics } = await loadContext(req.user);
  res.json(analytics);
});

export const getRoadmap = asyncHandler(async (req, res) => {
  const { analytics } = await loadContext(req.user);
  const roadmap = generateRoadmap(analytics.weakTopics);

  if (req.query.explain === "true" && process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: `In 120 words or less, coach a DSA student whose weak topics are ${roadmap.focusTopics.join(", ")}. Explain why this learning sequence works: ${roadmap.path.map((step) => step.topic).join(" -> ")}. Be practical and encouraging.`
    });
    roadmap.aiExplanation = response.output_text;
  }
  res.json(roadmap);
});

export const getRevisionPlan = asyncHandler(async (req, res) => {
  const { problems, analytics } = await loadContext(req.user);
  res.json(generateRevisionPlan(problems, analytics.weakTopics));
});

export const getRecommendations = asyncHandler(async (req, res) => {
  const { problems, analytics } = await loadContext(req.user);
  res.json({
    targetCompany: req.user.targetCompany,
    recommendations: recommendProblems(problems, analytics.weakTopics, req.user.targetCompany)
  });
});
