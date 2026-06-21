import { HttpError } from "../utils/httpError.js";
import { mapLeetCodeTopics, normalizeDifficulty } from "./platformTopicMapping.js";
import { upsertSyncedProblems } from "./syncPersistence.js";

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

const recentQuery = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id
      title
      titleSlug
      timestamp
      lang
    }
    matchedUser(username: $username) {
      username
      submitStatsGlobal {
        acSubmissionNum { difficulty count submissions }
      }
    }
  }
`;

const detailQuery = `
  query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionFrontendId
      difficulty
      topicTags { name slug }
    }
  }
`;

async function graphqlRequest(query, variables, fetchImpl) {
  const response = await fetchImpl(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "AlgoMentor/1.0",
      Referer: "https://leetcode.com/"
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15_000)
  });

  if (response.status === 429 || response.status === 403) {
    throw new HttpError(
      response.status,
      "LeetCode blocked or rate-limited this request. Try again later or use manual import."
    );
  }
  if (!response.ok) throw new HttpError(502, "LeetCode sync is temporarily unavailable. Use manual import if this continues.");

  const payload = await response.json().catch(() => null);
  if (!payload || payload.errors?.length) {
    throw new HttpError(502, "LeetCode returned an invalid response. Try manual import.");
  }
  return payload.data;
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function fetchLeetCodeAccepted(username, fetchImpl = fetch) {
  let data;
  try {
    // LeetCode currently hard-caps this public query at 20 records.
    data = await graphqlRequest(recentQuery, { username, limit: 20 }, fetchImpl);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, "LeetCode is temporarily unreachable. Try again or use manual import.");
  }

  if (!data.matchedUser) throw new HttpError(404, "LeetCode username not found");
  const recent = data.recentAcSubmissionList || [];

  const details = await mapWithConcurrency(recent, 5, async (submission) => {
    try {
      return await graphqlRequest(detailQuery, { titleSlug: submission.titleSlug }, fetchImpl);
    } catch {
      // Submission history is still useful when optional metadata lookups are blocked.
      return { question: null };
    }
  });

  // Hash Map deduplication keeps only the newest accepted submission per problem slug.
  const seen = new Set();
  const records = recent.flatMap((submission, index) => {
    if (seen.has(submission.titleSlug)) return [];
    seen.add(submission.titleSlug);
    const question = details[index]?.question;
    return [{
      platformProblemId: question?.questionFrontendId || submission.titleSlug,
      title: submission.title,
      slug: submission.titleSlug,
      difficulty: normalizeDifficulty(question?.difficulty),
      topics: mapLeetCodeTopics(question?.topicTags || []),
      status: "Strong",
      solvedAt: new Date(Number(submission.timestamp) * 1000),
      submissionId: String(submission.id || ""),
      problemUrl: `https://leetcode.com/problems/${submission.titleSlug}/`,
      language: submission.lang || "",
      verdict: "Accepted",
      rating: null
    }];
  });

  const totalSolved = data.matchedUser.submitStatsGlobal?.acSubmissionNum
    ?.find((item) => item.difficulty === "All")?.count || records.length;
  return { records, totalSolved };
}

export async function syncLeetCodeProblems(userId, username, fetchImpl = fetch) {
  if (!username?.trim()) throw new HttpError(400, "Add a LeetCode username before syncing");
  const { records, totalSolved } = await fetchLeetCodeAccepted(username.trim(), fetchImpl);
  const result = await upsertSyncedProblems(userId, "LeetCode", records);
  const syncedCount = result.totalSynced;
  const complete = syncedCount >= totalSolved;
  return {
    ...result,
    totalAccepted: totalSolved,
    fetched: records.length,
    complete,
    missing: Math.max(totalSolved - syncedCount, 0),
    message: complete
      ? "Complete LeetCode history synced"
      : `LeetCode exposes only the latest ${records.length} accepted submissions publicly. Import the remaining ${Math.max(totalSolved - syncedCount, 0)} with manual import.`
  };
}
