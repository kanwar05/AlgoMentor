import { Router } from "express";
import { getAnalytics, getRecommendations, getRevisionPlan, getRoadmap } from "../controllers/insightController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/analytics", getAnalytics);
router.get("/roadmap", getRoadmap);
router.get("/revision-plan", getRevisionPlan);
router.get("/recommendations", getRecommendations);
export default router;
