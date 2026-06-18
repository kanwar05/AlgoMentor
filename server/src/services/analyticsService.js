import { TOPICS } from "../models/Problem.js";

const DAY = 86_400_000;
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const dateKey = (date) => new Date(date).toISOString().slice(0, 10);

// Hash Maps provide O(n) counting by difficulty, topic, status, and day.
export function buildTopicStats(problems) {
  const map = new Map(TOPICS.map((topic) => [topic, { topic, total: 0, solved: 0, revision: 0, weak: 0 }]));
  for (const problem of problems) {
    for (const topic of problem.topics) {
      if (!map.has(topic)) map.set(topic, { topic, total: 0, solved: 0, revision: 0, weak: 0 });
      const entry = map.get(topic);
      entry.total += 1;
      entry[problem.status.toLowerCase()] += 1;
    }
  }
  return [...map.values()];
}

export function detectWeakTopics(topicStats) {
  return topicStats
    .map((stat) => {
      const flagged = stat.revision + stat.weak;
      const flaggedRatio = stat.total ? flagged / stat.total : 0;
      const reasons = [];
      if (stat.total < 5) reasons.push(`Only ${stat.total}/5 foundation problems completed`);
      if (flagged >= 2 || flaggedRatio >= 0.4) reasons.push(`${flagged} problem${flagged === 1 ? "" : "s"} need attention`);
      return {
        ...stat,
        severity: clamp(Math.round((5 - Math.min(stat.total, 5)) * 12 + flaggedRatio * 50)),
        reasons
      };
    })
    .filter((stat) => stat.reasons.length > 0)
    .sort((a, b) => b.severity - a.severity || a.topic.localeCompare(b.topic));
}

function buildActivity(problems, days = 120) {
  const counts = new Map();
  problems.forEach((problem) => {
    const key = dateKey(problem.solvedDate);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today.getTime() - (days - index - 1) * DAY);
    const key = dateKey(date);
    return { date: key, count: counts.get(key) || 0 };
  });
}

function calculateStreak(activity) {
  const active = new Set(activity.filter((day) => day.count > 0).map((day) => day.date));
  let current = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!active.has(dateKey(cursor))) cursor.setTime(cursor.getTime() - DAY);
  while (active.has(dateKey(cursor))) {
    current += 1;
    cursor.setTime(cursor.getTime() - DAY);
  }

  let longest = 0;
  let running = 0;
  for (const day of activity) {
    running = day.count > 0 ? running + 1 : 0;
    longest = Math.max(longest, running);
  }
  return { current, longest };
}

// Dynamic scoring combines normalized readiness signals into a transparent 0–100 score.
export function calculateReadiness(problems, topicStats, weakTopics, activity) {
  const total = problems.length;
  const attemptedTopics = topicStats.filter((item) => item.total > 0).length;
  const mediumHard = problems.filter((item) => item.difficulty !== "Easy").length;
  const recentActiveDays = activity.slice(-28).filter((day) => day.count > 0).length;

  const breakdown = {
    topicCoverage: clamp((attemptedTopics / TOPICS.length) * 100 - weakTopics.length * 1.5),
    difficultyBalance: total ? clamp((mediumHard / total) * 125) : 0,
    consistency: clamp((recentActiveDays / 16) * 100),
    totalSolvedScore: clamp((total / 100) * 100)
  };

  const score = Math.round(
    breakdown.topicCoverage * 0.35 +
    breakdown.difficultyBalance * 0.25 +
    breakdown.consistency * 0.2 +
    breakdown.totalSolvedScore * 0.2
  );
  return { score, breakdown: Object.fromEntries(Object.entries(breakdown).map(([key, value]) => [key, Math.round(value)])) };
}

export function generateAnalytics(problems, weeklyGoal = 10) {
  const topicStats = buildTopicStats(problems);
  const weakTopics = detectWeakTopics(topicStats);
  const activity = buildActivity(problems);
  const streak = calculateStreak(activity);
  const difficulty = { Easy: 0, Medium: 0, Hard: 0 };
  problems.forEach((problem) => { difficulty[problem.difficulty] += 1; });
  const last7 = activity.slice(-7);
  const solvedThisWeek = last7.reduce((sum, day) => sum + day.count, 0);
  const readiness = calculateReadiness(problems, topicStats, weakTopics, activity);

  return {
    summary: {
      totalSolved: problems.length,
      difficulty,
      streak,
      solvedThisWeek,
      weeklyGoal,
      weeklyProgress: clamp(Math.round((solvedThisWeek / weeklyGoal) * 100)),
      readinessScore: readiness.score
    },
    readiness,
    topicStats: topicStats.filter((item) => item.total > 0).sort((a, b) => b.total - a.total),
    weakTopics: weakTopics.slice(0, 8),
    activity,
    weeklyActivity: last7
  };
}
