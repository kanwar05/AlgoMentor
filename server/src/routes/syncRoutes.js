import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  getSyncStatus,
  listSyncedProblems,
  manualImport,
  syncAll,
  syncCodeforces,
  syncLeetCode,
  updateSyncedProblemAnnotations
} from "../controllers/syncController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  message: { success: false, message: "Too many sync requests. Please wait before trying again." }
}));
router.post("/leetcode", syncLeetCode);
router.post("/codeforces", syncCodeforces);
router.post("/all", syncAll);
router.post("/manual-import", manualImport);
router.get("/status", getSyncStatus);
router.get("/problems", listSyncedProblems);
router.patch("/problems/:id/annotations", updateSyncedProblemAnnotations);
export default router;
