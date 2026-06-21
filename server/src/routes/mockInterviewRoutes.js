import { Router } from "express";
import {
  completeMockInterview,
  createMockInterview,
  getMockInterview
} from "../controllers/mockInterviewController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.post("/", createMockInterview);
router.get("/:id", getMockInterview);
router.patch("/:id/complete", completeMockInterview);

export default router;
