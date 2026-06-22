import Problem, { TOPICS } from "../models/Problem.js";
import SyncedProblem from "../models/SyncedProblem.js";

export const REVISION_CANDIDATE_LIMIT = 200;

function unifiedProblemsStages(userId) {
  return [
    {
      $match: { user: userId }
    },
    {
      $project: {
        _id: 1,
        title: 1,
        platform: 1,
        difficulty: 1,
        topics: 1,
        status: 1,
        confidence: 1,
        lastReviewedAt: { $literal: null },
        link: 1,
        solvedDate: 1,
        sourcePriority: { $literal: 1 }
      }
    },
    {
      $unionWith: {
        coll: SyncedProblem.collection.name,
        pipeline: [
          { $match: { userId } },
          {
            $project: {
              _id: 1,
              title: 1,
              platform: 1,
              difficulty: 1,
              topics: 1,
              status: 1,
              confidence: 1,
              lastReviewedAt: 1,
              link: "$problemUrl",
              solvedDate: "$solvedAt",
              sourcePriority: { $literal: 0 }
            }
          }
        ]
      }
    },
    {
      $set: {
        dedupeKey: {
          $concat: [
            { $toLower: { $ifNull: ["$platform", ""] } },
            ":",
            { $toLower: { $trim: { input: { $ifNull: ["$title", ""] } } } }
          ]
        }
      }
    },
    { $sort: { sourcePriority: -1, solvedDate: -1, _id: -1 } },
    { $group: { _id: "$dedupeKey", problem: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$problem" } }
  ];
}

export function buildAnalyticsSnapshotPipeline(userId, now = new Date()) {
  const activityStart = new Date(now);
  activityStart.setUTCHours(0, 0, 0, 0);
  activityStart.setUTCDate(activityStart.getUTCDate() - 119);

  return [
    ...unifiedProblemsStages(userId),
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalSolved: { $sum: 1 },
              mediumHard: { $sum: { $cond: [{ $ne: ["$difficulty", "Easy"] }, 1, 0] } },
              easy: { $sum: { $cond: [{ $eq: ["$difficulty", "Easy"] }, 1, 0] } },
              medium: { $sum: { $cond: [{ $eq: ["$difficulty", "Medium"] }, 1, 0] } },
              hard: { $sum: { $cond: [{ $eq: ["$difficulty", "Hard"] }, 1, 0] } }
            }
          }
        ],
        platforms: [
          { $group: { _id: { $ifNull: ["$platform", "Other"] }, count: { $sum: 1 } } }
        ],
        topics: [
          { $unwind: "$topics" },
          {
            $group: {
              _id: "$topics",
              total: { $sum: 1 },
              easy: { $sum: { $cond: [{ $eq: ["$difficulty", "Easy"] }, 1, 0] } },
              medium: { $sum: { $cond: [{ $eq: ["$difficulty", "Medium"] }, 1, 0] } },
              hard: { $sum: { $cond: [{ $eq: ["$difficulty", "Hard"] }, 1, 0] } },
              weak: { $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "weak"] }, 1, 0] } },
              revision: { $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "revision"] }, 1, 0] } },
              confidenceTotal: {
                $sum: { $cond: [{ $ne: ["$confidence", null] }, "$confidence", 0] }
              },
              confidenceCount: {
                $sum: { $cond: [{ $ne: ["$confidence", null] }, 1, 0] }
              }
            }
          }
        ],
        activity: [
          { $match: { solvedDate: { $gte: activityStart } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$solvedDate", timezone: "UTC" } },
              count: { $sum: 1 }
            }
          }
        ]
      }
    }
  ];
}

export async function loadAnalyticsSnapshot(userId, now = new Date(), model = Problem) {
  const [snapshot = {}] = await model.aggregate(buildAnalyticsSnapshotPipeline(userId, now));
  return {
    totals: snapshot.totals?.[0] || {
      totalSolved: 0,
      mediumHard: 0,
      easy: 0,
      medium: 0,
      hard: 0
    },
    platforms: snapshot.platforms || [],
    topics: snapshot.topics || [],
    activity: snapshot.activity || []
  };
}

export function buildRevisionCandidatePipeline(userId, weakTopics, limit = REVISION_CANDIDATE_LIMIT) {
  return [
    ...unifiedProblemsStages(userId),
    {
      $set: {
        weakMatches: {
          $size: { $setIntersection: [{ $ifNull: ["$topics", []] }, weakTopics] }
        },
        difficultyPriority: {
          $switch: {
            branches: [
              { case: { $eq: ["$difficulty", "Medium"] }, then: 3 },
              { case: { $eq: ["$difficulty", "Hard"] }, then: 2.5 },
              { case: { $eq: ["$difficulty", "Easy"] }, then: 1 }
            ],
            default: 0
          }
        },
        statusPriority: {
          $switch: {
            branches: [
              { case: { $eq: ["$status", "Weak"] }, then: 5 },
              { case: { $eq: ["$status", "Revision"] }, then: 3 }
            ],
            default: 0.5
          }
        },
        lastPracticeDate: {
          $ifNull: ["$lastReviewedAt", { $ifNull: ["$solvedDate", "$$NOW"] }]
        }
      }
    },
    {
      $set: {
        priority: {
          $add: [
            { $multiply: ["$weakMatches", 4] },
            "$difficultyPriority",
            "$statusPriority",
            {
              $min: [
                {
                  $divide: [
                    { $dateDiff: { startDate: "$lastPracticeDate", endDate: "$$NOW", unit: "day" } },
                    14
                  ]
                },
                2
              ]
            }
          ]
        }
      }
    },
    { $sort: { priority: -1, solvedDate: 1, _id: 1 } },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        title: 1,
        difficulty: 1,
        topics: 1,
        status: 1,
        lastReviewedAt: 1,
        solvedDate: 1,
        link: 1
      }
    }
  ];
}

export async function loadRevisionCandidates(
  userId,
  weakTopics,
  model = Problem,
  limit = REVISION_CANDIDATE_LIMIT
) {
  const topicNames = weakTopics.map((item) => item.topic);
  return model.aggregate(buildRevisionCandidatePipeline(userId, topicNames, limit));
}

export function buildSolvedRecommendationPipeline(userId, titles) {
  const normalizedTitles = titles.map((title) => title.toLowerCase());
  return [
    ...unifiedProblemsStages(userId),
    { $set: { normalizedTitle: { $toLower: "$title" } } },
    { $match: { normalizedTitle: { $in: normalizedTitles } } },
    { $project: { _id: 1, title: 1 } },
    { $limit: titles.length }
  ];
}

export async function loadSolvedRecommendationProblems(userId, titles, model = Problem) {
  if (!titles.length) return [];
  return model.aggregate(buildSolvedRecommendationPipeline(userId, titles));
}

export function knownTopics() {
  return TOPICS;
}
