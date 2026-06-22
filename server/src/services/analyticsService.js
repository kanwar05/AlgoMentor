import { TOPICS } from "../models/Problem.js";
import { classifyTopic } from "../utils/topicClassifier.js";
import { normalizeTopics } from "../utils/topicNormalizer.js";

const DAY = 86_400_000;
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const dateKey = (date) => new Date(date).toISOString().slice(0, 10);
const statusKey = (status) => String(status || "Solved").toLowerCase();

export function calculateTopicStrength({
  solved = 0,
  revision = 0,
  weak = 0,
  averageConfidence = null
} = {}) {
  const total = Math.max(Number(solved) || 0, 0);
  if (!total) return 0;

  const revisionCount = Math.max(Number(revision) || 0, 0);
  const weakCount = Math.max(Number(weak) || 0, 0);
  const strongCount = Math.max(total - revisionCount - weakCount, 0);
  const outcomeScore = ((strongCount * 100) + (revisionCount * 55) + (weakCount * 20)) / total;
  const hasConfidence = averageConfidence !== null && averageConfidence !== undefined && averageConfidence !== "";
  const confidence = Number(averageConfidence);

  return clamp(Math.round(
    hasConfidence && Number.isFinite(confidence)
      ? (outcomeScore * 0.8) + (clamp(confidence) * 0.2)
      : outcomeScore
  ));
}

export function buildTopicMasteryStats(problems) {
  const map = new Map();

  for (const problem of problems) {
    for (const name of normalizeTopics(problem.topics)) {
      if (!map.has(name)) {
        map.set(name, {
          name,
          solved: 0,
          easy: 0,
          medium: 0,
          hard: 0,
          weak: 0,
          revision: 0,
          strong: 0,
          confidenceTotal: 0,
          confidenceCount: 0
        });
      }

      const entry = map.get(name);
      entry.solved += 1;
      const difficulty = String(problem.difficulty || "").toLowerCase();
      if (difficulty in entry) entry[difficulty] += 1;

      const status = statusKey(problem.status);
      if (status === "weak") entry.weak += 1;
      else if (status === "revision") entry.revision += 1;
      else entry.strong += 1;

      const hasConfidence = problem.confidence !== null &&
        problem.confidence !== undefined &&
        problem.confidence !== "";
      const confidence = Number(problem.confidence);
      if (hasConfidence && Number.isFinite(confidence)) {
        entry.confidenceTotal += clamp(confidence);
        entry.confidenceCount += 1;
      }
    }
  }

  return [...map.values()]
    .map(({ confidenceTotal, confidenceCount, ...topic }) => {
      const averageConfidence = confidenceCount
        ? Math.round(confidenceTotal / confidenceCount)
        : null;
      return {
        ...topic,
        averageConfidence,
        strengthScore: calculateTopicStrength({
          solved: topic.solved,
          revision: topic.revision,
          weak: topic.weak,
          averageConfidence
        })
      };
    })
    .sort((a, b) => b.solved - a.solved || a.name.localeCompare(b.name));
}

// Hash Maps provide O(n) counting by difficulty, topic, status, and day.
export function buildTopicStats(problems) {
  const map = new Map(TOPICS.map((topic) => [topic, { topic, total: 0, solved: 0, revision: 0, weak: 0 }]));
  for (const problem of problems) {
    for (const topic of normalizeTopics(problem.topics)) {
      if (!map.has(topic)) map.set(topic, { topic, total: 0, solved: 0, revision: 0, weak: 0 });
      const entry = map.get(topic);
      entry.total += 1;
      const key = statusKey(problem.status);
      if (key in entry) entry[key] += 1;
      else entry.solved += 1;
    }
  }
  return [...map.values()].map((stat) => {
    const weakRatio = stat.total ? stat.weak / stat.total : 0;
    const revisionRatio = stat.total ? stat.revision / stat.total : 0;
    return {
      ...stat,
      totalSolved: stat.total,
      weakCount: stat.weak,
      revisionCount: stat.revision,
      weakRatio,
      revisionRatio,
      status: classifyTopic({
        totalSolved: stat.total,
        weakCount: stat.weak,
        revisionCount: stat.revision
      })
    };
  });
}

export function detectWeakTopics(topicStats) {
  return topicStats
    .filter((stat) => stat.status === "weak")
    .map((stat) => ({
      ...stat,
      severity: clamp(Math.round(Math.max(stat.weakRatio, stat.revisionRatio) * 100)),
      reasons: [
        stat.weakRatio >= 0.4
          ? `${Math.round(stat.weakRatio * 100)}% marked weak`
          : `${Math.round(stat.revisionRatio * 100)}% marked for revision`
      ]
    }))
    .sort((a, b) => b.severity - a.severity || a.topic.localeCompare(b.topic));
}

function topicsByStatus(topicStats, status) {
  return topicStats
    .filter((item) => item.status === status)
    .sort((a, b) => {
      if (status === "weak") {
        return Math.max(b.weakRatio, b.revisionRatio) - Math.max(a.weakRatio, a.revisionRatio);
      }
      if (status === "practicing") return b.total - a.total || a.topic.localeCompare(b.topic);
      if (status === "strong") return b.total - a.total || a.topic.localeCompare(b.topic);
      return a.topic.localeCompare(b.topic);
    });
}

function buildActivity(problems, days = 120) {
  const counts = new Map();
  problems.forEach((problem) => {
    if (!problem.solvedDate) return;
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

function analyticsFromStats({
  topicStats,
  topics,
  activity,
  totals,
  platformCounts,
  weeklyGoal
}) {
  const weakTopics = detectWeakTopics(topicStats);
  const strongTopics = topicsByStatus(topicStats, "strong");
  const practicingTopics = topicsByStatus(topicStats, "practicing");
  const untouchedTopics = topicsByStatus(topicStats, "untouched");
  const streak = calculateStreak(activity);
  const last7 = activity.slice(-7);
  const solvedThisWeek = last7.reduce((sum, day) => sum + day.count, 0);
  const readiness = calculateReadinessFromCounts({
    total: totals.totalSolved,
    mediumHard: totals.mediumHard,
    topicStats,
    activity
  });
  const topicDistribution = {
    strong: strongTopics.length,
    weak: weakTopics.length,
    practicing: practicingTopics.length,
    untouched: untouchedTopics.length
  };

  return {
    topics,
    summary: {
      totalSolved: totals.totalSolved,
      platformCounts,
      leetcodeSolved: platformCounts.LeetCode || 0,
      codeforcesSolved: platformCounts.Codeforces || 0,
      difficulty: {
        Easy: totals.easy,
        Medium: totals.medium,
        Hard: totals.hard
      },
      streak,
      solvedThisWeek,
      weeklyGoal,
      weeklyProgress: clamp(Math.round((solvedThisWeek / weeklyGoal) * 100)),
      readinessScore: readiness.score,
      topicDistribution
    },
    readiness,
    topicStats: topicStats
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total || a.topic.localeCompare(b.topic)),
    allTopicStats: [...topicStats].sort((a, b) => b.total - a.total || a.topic.localeCompare(b.topic)),
    weakTopics: weakTopics.slice(0, 8),
    practicingTopics,
    untouchedTopics,
    strongTopics,
    topicDistribution,
    activity,
    weeklyActivity: last7
  };
}

// Dynamic scoring combines normalized readiness signals into a transparent 0–100 score.
export function calculateReadiness(problems, topicStats, _weakTopics, activity) {
  return calculateReadinessFromCounts({
    total: problems.length,
    mediumHard: problems.filter((item) => item.difficulty !== "Easy").length,
    topicStats,
    activity
  });
}

export function calculateReadinessFromCounts({ total, mediumHard, topicStats, activity }) {
  const recentActiveDays = activity.slice(-28).filter((day) => day.count > 0).length;
  const topicStateWeight = { strong: 100, practicing: 65, weak: 15, untouched: 0 };
  const topicCoverage = topicStats.length
    ? topicStats.reduce((sum, item) => sum + topicStateWeight[item.status], 0) / topicStats.length
    : 0;

  const breakdown = {
    topicCoverage: clamp(topicCoverage),
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
  const topics = buildTopicMasteryStats(problems);
  const activity = buildActivity(problems);
  const difficulty = { Easy: 0, Medium: 0, Hard: 0 };
  problems.forEach((problem) => { difficulty[problem.difficulty] += 1; });
  const platformCounts = problems.reduce((counts, problem) => {
    const platform = problem.platform || "Other";
    counts[platform] = (counts[platform] || 0) + 1;
    return counts;
  }, {});

  return analyticsFromStats({
    topicStats,
    topics,
    activity,
    totals: {
      totalSolved: problems.length,
      mediumHard: difficulty.Medium + difficulty.Hard,
      easy: difficulty.Easy,
      medium: difficulty.Medium,
      hard: difficulty.Hard
    },
    platformCounts,
    weeklyGoal
  });
}

export function generateAnalyticsFromSnapshot(snapshot, weeklyGoal = 10, now = new Date()) {
  const aggregatedByTopic = new Map(snapshot.topics.map((item) => [item._id, item]));
  const topicNames = [...new Set([...TOPICS, ...snapshot.topics.map((item) => item._id)])];
  const topicStats = topicNames.map((topic) => {
    const item = aggregatedByTopic.get(topic) || {};
    const total = item.total || 0;
    const weak = item.weak || 0;
    const revision = item.revision || 0;
    const weakRatio = total ? weak / total : 0;
    const revisionRatio = total ? revision / total : 0;
    return {
      topic,
      total,
      solved: Math.max(total - weak - revision, 0),
      revision,
      weak,
      totalSolved: total,
      weakCount: weak,
      revisionCount: revision,
      weakRatio,
      revisionRatio,
      status: classifyTopic({ totalSolved: total, weakCount: weak, revisionCount: revision })
    };
  });
  const topics = snapshot.topics
    .map((item) => {
      const averageConfidence = item.confidenceCount
        ? Math.round(item.confidenceTotal / item.confidenceCount)
        : null;
      const strong = Math.max(item.total - item.weak - item.revision, 0);
      return {
        name: item._id,
        solved: item.total,
        easy: item.easy,
        medium: item.medium,
        hard: item.hard,
        weak: item.weak,
        revision: item.revision,
        strong,
        averageConfidence,
        strengthScore: calculateTopicStrength({
          solved: item.total,
          weak: item.weak,
          revision: item.revision,
          averageConfidence
        })
      };
    })
    .sort((a, b) => b.solved - a.solved || a.name.localeCompare(b.name));
  const activityCounts = new Map(snapshot.activity.map((item) => [item._id, item.count]));
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const activity = Array.from({ length: 120 }, (_, index) => {
    const date = new Date(today.getTime() - (119 - index) * DAY);
    const key = dateKey(date);
    return { date: key, count: activityCounts.get(key) || 0 };
  });
  const platformCounts = Object.fromEntries(snapshot.platforms.map((item) => [item._id, item.count]));

  return analyticsFromStats({
    topicStats,
    topics,
    activity,
    totals: snapshot.totals,
    platformCounts,
    weeklyGoal
  });
}
