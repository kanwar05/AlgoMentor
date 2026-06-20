import SyncHistory from "../models/SyncHistory.js";
import SyncedProblem from "../models/SyncedProblem.js";
import { syncCodeforcesProblems } from "../services/codeforcesSync.service.js";
import { syncLeetCodeProblems } from "../services/leetcodeSync.service.js";
import { mapLeetCodeTopics, normalizeDifficulty, slugify } from "../services/platformTopicMapping.js";
import { upsertSyncedProblems } from "../services/syncPersistence.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { normalizeTopics } from "../utils/topicNormalizer.js";

async function recordHistory(userId, platform, status, result = {}, message = "") {
  return SyncHistory.create({
    userId,
    platform,
    status,
    imported: result.imported || 0,
    skipped: result.skipped || 0,
    totalAccepted: result.totalAccepted || 0,
    complete: result.complete !== false,
    missing: result.missing || 0,
    message
  });
}

async function runSync(user, platform) {
  if (platform === "LeetCode") {
    const result = await syncLeetCodeProblems(user._id, user.leetcodeUsername);
    user.lastLeetCodeSync = new Date();
    await user.save();
    return result;
  }
  const result = await syncCodeforcesProblems(user._id, user.codeforcesHandle);
  user.lastCodeforcesSync = new Date();
  await user.save();
  return result;
}

function syncAction(platform) {
  return asyncHandler(async (req, res) => {
    try {
      const result = await runSync(req.user, platform);
      await recordHistory(req.user._id, platform, result.complete === false ? "partial" : "success", result, result.message || `${platform} sync completed`);
      res.json({ platform, ...result, syncedAt: new Date().toISOString() });
    } catch (error) {
      await recordHistory(req.user._id, platform, "failed", {}, error.message);
      throw error;
    }
  });
}

export const syncLeetCode = syncAction("LeetCode");
export const syncCodeforces = syncAction("Codeforces");

export const syncAll = asyncHandler(async (req, res) => {
  const platforms = [
    ["LeetCode", req.user.leetcodeUsername],
    ["Codeforces", req.user.codeforcesHandle]
  ].filter(([, handle]) => handle);

  if (!platforms.length) throw new HttpError(400, "Connect at least one platform before syncing");

  const results = [];
  for (const [platform] of platforms) {
    try {
      const result = await runSync(req.user, platform);
      results.push({ platform, success: true, ...result });
      await recordHistory(req.user._id, platform, result.complete === false ? "partial" : "success", result, result.message || `${platform} sync completed`);
    } catch (error) {
      results.push({ platform, success: false, error: error.message });
      await recordHistory(req.user._id, platform, "failed", {}, error.message);
    }
  }

  const successCount = results.filter((item) => item.success).length;
  const summary = {
    imported: results.reduce((sum, item) => sum + (item.imported || 0), 0),
    skipped: results.reduce((sum, item) => sum + (item.skipped || 0), 0),
    totalAccepted: results.reduce((sum, item) => sum + (item.totalAccepted || 0), 0),
    complete: results.every((item) => item.success && item.complete !== false),
    missing: results.reduce((sum, item) => sum + (item.missing || 0), 0)
  };
  await recordHistory(
    req.user._id,
    "All",
    successCount === results.length && summary.complete ? "success" : successCount ? "partial" : "failed",
    summary,
    `${successCount}/${results.length} platform syncs completed`
  );

  res.status(successCount === results.length ? 200 : 207).json({ ...summary, results, syncedAt: new Date().toISOString() });
});

export function validateManualImport(items) {
  if (!Array.isArray(items) || !items.length) {
    throw new HttpError(400, "Provide a non-empty array of solved problems");
  }
  if (items.length > 5000) throw new HttpError(400, "Manual import is limited to 5,000 problems at a time");

  return items.map((item, index) => {
    const platform = item.platform === "Codeforces" ? "Codeforces" : item.platform === "LeetCode" ? "LeetCode" : null;
    if (!platform || !String(item.title || "").trim()) {
      throw new HttpError(400, `Item ${index + 1} requires a valid platform and title`);
    }
    if (item.problemUrl && !/^https?:\/\/\S+$/i.test(item.problemUrl)) {
      throw new HttpError(400, `Item ${index + 1} has an invalid problemUrl`);
    }
    if (item.topics !== undefined && !Array.isArray(item.topics)) {
      throw new HttpError(400, `Item ${index + 1} topics must be an array`);
    }

    const slug = item.slug || item.titleSlug || slugify(item.title);
    const rawTopics = item.topics || item.topicTags || item.tags || [];
    const solvedAt = item.solvedAt ? new Date(item.solvedAt) : null;
    if (solvedAt && Number.isNaN(solvedAt.getTime())) {
      throw new HttpError(400, `Item ${index + 1} has an invalid solvedAt date`);
    }

    return {
      platform,
      platformProblemId: String(item.platformProblemId || item.frontendQuestionId || item.questionFrontendId || slug),
      title: String(item.title).trim(),
      slug,
      difficulty: normalizeDifficulty(item.difficulty),
      topics: platform === "LeetCode"
        ? mapLeetCodeTopics(rawTopics)
        : normalizeTopics(rawTopics.map((topic) => typeof topic === "string" ? topic : topic.name)),
      status: "Solved",
      solvedAt,
      submissionId: String(item.submissionId || ""),
      problemUrl: String(item.problemUrl || ""),
      language: String(item.language || ""),
      verdict: String(item.verdict || (platform === "LeetCode" ? "Accepted" : "OK")),
      rating: item.rating !== undefined && item.rating !== null && item.rating !== "" && Number.isFinite(Number(item.rating))
        ? Number(item.rating)
        : null
    };
  });
}

export const manualImport = asyncHandler(async (req, res) => {
  const records = validateManualImport(req.body);
  const groups = records.reduce((map, item) => {
    if (!map.has(item.platform)) map.set(item.platform, []);
    map.get(item.platform).push(item);
    return map;
  }, new Map());
  const results = [];

  for (const [platform, platformRecords] of groups) {
    const cleanRecords = platformRecords.map(({ platform: _platform, ...record }) => record);
    const result = await upsertSyncedProblems(req.user._id, platform, cleanRecords);
    results.push({ platform, ...result });
  }

  const summary = {
    imported: results.reduce((sum, item) => sum + item.imported, 0),
    skipped: results.reduce((sum, item) => sum + item.skipped, 0),
    totalAccepted: records.length
  };
  await recordHistory(req.user._id, "Manual", "success", summary, "Manual import completed");
  res.status(201).json({ ...summary, results });
});

export const getSyncStatus = asyncHandler(async (req, res) => {
  const [counts, history, latestLeetCodeSync] = await Promise.all([
    SyncedProblem.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: "$platform", count: { $sum: 1 } } }
    ]),
    SyncHistory.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(10).lean(),
    SyncHistory.findOne({ userId: req.user._id, platform: "LeetCode", totalAccepted: { $gt: 0 } }).sort({ createdAt: -1 }).lean()
  ]);
  const platformCounts = Object.fromEntries(counts.map((item) => [item._id, item.count]));
  const leetcodeSynced = platformCounts.LeetCode || 0;
  const leetcodeReported = latestLeetCodeSync?.totalAccepted || leetcodeSynced;

  res.json({
    platforms: {
      leetcodeUsername: req.user.leetcodeUsername,
      codeforcesHandle: req.user.codeforcesHandle,
      lastLeetCodeSync: req.user.lastLeetCodeSync,
      lastCodeforcesSync: req.user.lastCodeforcesSync
    },
    counts: {
      total: counts.reduce((sum, item) => sum + item.count, 0),
      LeetCode: platformCounts.LeetCode || 0,
      Codeforces: platformCounts.Codeforces || 0
    },
    coverage: {
      LeetCode: {
        synced: leetcodeSynced,
        reported: leetcodeReported,
        missing: Math.max(leetcodeReported - leetcodeSynced, 0),
        complete: leetcodeSynced >= leetcodeReported
      },
      Codeforces: {
        synced: platformCounts.Codeforces || 0,
        complete: true
      }
    },
    history
  });
});

export const listSyncedProblems = asyncHandler(async (req, res) => {
  const { platform, page = 1, limit = 50 } = req.query;
  const filter = { userId: req.user._id };
  if (platform) filter.platform = platform;
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const [problems, total] = await Promise.all([
    SyncedProblem.find(filter).sort({ solvedAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
    SyncedProblem.countDocuments(filter)
  ]);
  res.json({ problems, pagination: { total, page: safePage, limit: safeLimit, pages: Math.ceil(total / safeLimit) } });
});
