import { Router } from "express";
import { updatePlatforms } from "../controllers/profileController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.put("/platforms", updatePlatforms);
export default router;
