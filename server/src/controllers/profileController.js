import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";

const handlePattern = /^[a-zA-Z0-9_.-]{2,40}$/;

export const updatePlatforms = asyncHandler(async (req, res) => {
  const leetcodeUsername = String(req.body.leetcodeUsername || "").trim();
  const codeforcesHandle = String(req.body.codeforcesHandle || "").trim();

  if (leetcodeUsername && !handlePattern.test(leetcodeUsername)) {
    throw new HttpError(400, "LeetCode username contains unsupported characters");
  }
  if (codeforcesHandle && !handlePattern.test(codeforcesHandle)) {
    throw new HttpError(400, "Codeforces handle contains unsupported characters");
  }

  req.user.leetcodeUsername = leetcodeUsername;
  req.user.codeforcesHandle = codeforcesHandle;
  await req.user.save();

  res.json({
    platforms: {
      leetcodeUsername,
      codeforcesHandle,
      lastLeetCodeSync: req.user.lastLeetCodeSync,
      lastCodeforcesSync: req.user.lastCodeforcesSync
    }
  });
});
