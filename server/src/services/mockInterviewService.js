import { problemBank } from "../data/problemBank.js";
import { recommendationProblemId } from "./recommendationService.js";
import { normalizeTopics } from "../utils/topicNormalizer.js";
import { HttpError } from "../utils/httpError.js";

const MINUTE = 60_000;
const resultScore = { solved: 100, hint: 60, failed: 0, skipped: 0 };
const validResults = new Set(Object.keys(resultScore));

const toMockProblem = (problem) => ({
  problemId: recommendationProblemId(problem),
  title: problem.title,
  platform: problem.platform,
  difficulty: problem.difficulty,
  topics: normalizeTopics(problem.topics),
  companies: problem.companies || [],
  link: problem.link || "",
  result: "skipped"
});

export function generateMockInterviewProblems({
  company,
  difficulty,
  duration,
  solvedTitles = [],
  feedbackItems = []
}) {
  const count = Number(duration) >= 60 ? 3 : 2;
  const solved = new Set(solvedTitles.map((title) => String(title).toLowerCase()));
  const excluded = new Set(
    feedbackItems
      .filter((item) => ["already_solved", "not_relevant"].includes(item.feedback))
      .map((item) => item.problemId)
  );
  const candidates = problemBank
    .filter((problem) =>
      problem.difficulty === difficulty &&
      !solved.has(problem.title.toLowerCase()) &&
      !excluded.has(recommendationProblemId(problem))
    )
    .sort((a, b) => {
      const aCompany = company !== "Other" && a.companies.includes(company) ? 1 : 0;
      const bCompany = company !== "Other" && b.companies.includes(company) ? 1 : 0;
      return bCompany - aCompany || a.title.localeCompare(b.title);
    });

  if (candidates.length < 2) {
    throw new HttpError(400, `Not enough unsolved ${difficulty.toLowerCase()} problems are available for this mock interview`);
  }
  return candidates.slice(0, Math.min(count, candidates.length)).map(toMockProblem);
}

export function scoreMockInterview(problems, attempts = []) {
  const attemptsByProblem = new Map(attempts.map((attempt) => [attempt.problemId, attempt.result]));
  const scoredProblems = problems.map((problem) => {
    const result = attemptsByProblem.get(problem.problemId) || "skipped";
    if (!validResults.has(result)) throw new HttpError(400, "Invalid mock interview result");
    return { ...problem, result };
  });
  const score = Math.round(
    scoredProblems.reduce((sum, problem) => sum + resultScore[problem.result], 0) /
    Math.max(scoredProblems.length, 1)
  );
  const weakCounts = new Map();
  scoredProblems
    .filter((problem) => problem.result !== "solved")
    .forEach((problem) => problem.topics.forEach((topic) => {
      weakCounts.set(topic, (weakCounts.get(topic) || 0) + (problem.result === "failed" || problem.result === "skipped" ? 2 : 1));
    }));
  const weakTopics = [...weakCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([topic]) => topic)
    .slice(0, 5);

  return { problems: scoredProblems, score, weakTopics };
}

export function buildNextPracticePlan({ weakTopics, completedProblemIds, difficulty }) {
  const weak = new Set(normalizeTopics(weakTopics));
  const completed = new Set(completedProblemIds);
  return problemBank
    .map((problem) => {
      const topics = normalizeTopics(problem.topics);
      const overlap = topics.filter((topic) => weak.has(topic)).length;
      return { problem, topics, overlap };
    })
    .filter(({ problem, overlap }) =>
      overlap > 0 &&
      !completed.has(recommendationProblemId(problem)) &&
      (difficulty !== "Hard" || problem.difficulty !== "Hard")
    )
    .sort((a, b) => b.overlap - a.overlap || a.problem.difficulty.localeCompare(b.problem.difficulty))
    .slice(0, 5)
    .map(({ problem }) => toMockProblem(problem));
}

export function mockInterviewExpiry(startedAt, duration) {
  return new Date(new Date(startedAt).getTime() + Number(duration) * MINUTE);
}
