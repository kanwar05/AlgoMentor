import { HttpError } from "../utils/httpError.js";
import { difficultyFromCodeforcesRating, mapCodeforcesTopics, slugify } from "./platformTopicMapping.js";
import { upsertSyncedProblems } from "./syncPersistence.js";

const CODEFORCES_API = "https://codeforces.com/api/user.status";

export function normalizeAcceptedCodeforcesSubmissions(submissions = []) {
  const accepted = submissions.filter((submission) => submission.verdict === "OK" && submission.problem);
  const seen = new Set();
  const records = [];

  for (const submission of accepted) {
    const { problem } = submission;
    const platformProblemId = `${problem.contestId || "unknown"}-${problem.index}`;
    if (seen.has(platformProblemId)) continue;
    seen.add(platformProblemId);

    records.push({
      platformProblemId,
      title: problem.name,
      slug: slugify(problem.name),
      difficulty: difficultyFromCodeforcesRating(problem.rating),
      topics: mapCodeforcesTopics(problem.tags),
      status: "Solved",
      solvedAt: new Date(submission.creationTimeSeconds * 1000),
      submissionId: String(submission.id || ""),
      problemUrl: problem.contestId
        ? `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`
        : "",
      language: submission.programmingLanguage || "",
      verdict: submission.verdict,
      rating: problem.rating || null
    });
  }

  return { records, totalAccepted: records.length };
}

export async function syncCodeforcesProblems(userId, handle, fetchImpl = fetch) {
  if (!handle?.trim()) throw new HttpError(400, "Add a Codeforces handle before syncing");

  let response;
  try {
    response = await fetchImpl(`${CODEFORCES_API}?handle=${encodeURIComponent(handle.trim())}`, {
      headers: { "User-Agent": "AlgoMentor/1.0" },
      signal: AbortSignal.timeout(15_000)
    });
  } catch {
    throw new HttpError(503, "Codeforces is temporarily unreachable. Please try again shortly.");
  }

  if (response.status === 429) {
    throw new HttpError(429, "Codeforces rate limit reached. Wait a minute and try again.");
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.status !== "OK") {
    const invalidHandle = response.status === 400 || /not found/i.test(payload?.comment || "");
    throw new HttpError(
      invalidHandle ? 404 : 502,
      invalidHandle ? "Codeforces handle not found" : "Codeforces could not complete the sync"
    );
  }

  const { records, totalAccepted } = normalizeAcceptedCodeforcesSubmissions(payload.result);
  const result = await upsertSyncedProblems(userId, "Codeforces", records);
  return { ...result, totalAccepted };
}
