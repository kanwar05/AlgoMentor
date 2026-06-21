import { Router } from "express";
import {
  completeRevisionPlanTask,
  getAnalytics,
  getRecommendations,
  getRevisionPlan,
  getRoadmap,
  saveRecommendationFeedback
} from "../controllers/insightController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/analytics", getAnalytics);
router.get("/roadmap", getRoadmap);
router.get("/revision-plan", getRevisionPlan);
router.patch("/revision-plan/:taskId/complete", completeRevisionPlanTask);
router.get("/recommendations", getRecommendations);
router.put("/recommendations/:problemId/feedback", saveRecommendationFeedback);
export default router;
