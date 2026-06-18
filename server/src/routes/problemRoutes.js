import { Router } from "express";
import { createProblem, deleteProblem, listProblems, updateProblem } from "../controllers/problemController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.route("/").get(listProblems).post(createProblem);
router.route("/:id").put(updateProblem).delete(deleteProblem);
export default router;
