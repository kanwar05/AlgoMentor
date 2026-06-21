import { problemBank } from "../data/problemBank.js";
import { normalizeTopics } from "../utils/topicNormalizer.js";

const difficultyRank = { Easy: 1, Medium: 2, Hard: 3 };
const dismissedFeedback = new Set(["too_easy", "too_hard", "already_solved", "not_relevant"]);

export function recommendationProblemId(problem) {
  const match = String(problem.link || "").match(/\/problems\/([^/]+)/);
  return match?.[1] || String(problem.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function recommendProblems(problems, weakTopics, targetCompany, feedbackItems = []) {
  const solved = new Set(problems.map((item) => item.title.toLowerCase()));
  const weak = new Set(normalizeTopics(weakTopics.map((item) => item.topic)));
  const feedbackByProblem = new Map(feedbackItems.map((item) => [item.problemId, item.feedback]));
  const difficultySignal = feedbackItems.reduce((signal, item) => {
    if (item.feedback === "too_easy") return signal + 1;
    if (item.feedback === "too_hard") return signal - 1;
    return signal;
  }, 0);
  const rejectedTopicCounts = new Map();
  feedbackItems
    .filter((item) => item.feedback === "not_relevant")
    .forEach((item) => {
      const rejected = problemBank.find((problem) => recommendationProblemId(problem) === item.problemId);
      normalizeTopics(rejected?.topics || []).forEach((topic) => {
        rejectedTopicCounts.set(topic, (rejectedTopicCounts.get(topic) || 0) + 1);
      });
    });

  return problemBank
    .filter((item) => {
      const problemId = recommendationProblemId(item);
      return !solved.has(item.title.toLowerCase()) && !dismissedFeedback.has(feedbackByProblem.get(problemId));
    })
    .map((item) => {
      const problemId = recommendationProblemId(item);
      const topics = normalizeTopics(item.topics);
      const matchingTopics = topics.filter((topic) => weak.has(topic));
      const topicMatch = matchingTopics.length;
      const companyMatch = item.companies.includes(targetCompany);
      const mediumBoost = item.difficulty === "Medium" ? 3 : item.difficulty === "Easy" ? 1.5 : 1;
      const rank = difficultyRank[item.difficulty] || 2;
      const difficultyAdjustment = difficultySignal > 0
        ? (rank - 1) * Math.min(difficultySignal, 3) * 3
        : difficultySignal < 0
          ? (3 - rank) * Math.min(Math.abs(difficultySignal), 3) * 3
          : 0;
      const relevancePenalty = topics.reduce(
        (sum, topic) => sum + (rejectedTopicCounts.get(topic) || 0) * 3,
        0
      );
      const savedForLater = feedbackByProblem.get(problemId) === "save_for_later";
      const score = topicMatch * 5 +
        (companyMatch ? 4 : 0) +
        mediumBoost +
        difficultyAdjustment -
        relevancePenalty +
        (savedForLater ? 20 : 0);
      return {
        ...item,
        problemId,
        topics,
        score,
        savedForLater,
        reason: topicMatch
          ? `Targets ${matchingTopics.join(", ")}`
          : companyMatch
            ? `Frequently aligned with ${targetCompany} interview patterns`
            : "Balances your current difficulty mix"
      };
    })
    .sort((a, b) => Number(b.savedForLater) - Number(a.savedForLater) || b.score - a.score)
    .slice(0, 12);
}
