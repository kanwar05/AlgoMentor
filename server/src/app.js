import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import problemRoutes from "./routes/problemRoutes.js";
import insightRoutes from "./routes/insightRoutes.js";
import syncRoutes from "./routes/syncRoutes.js";
import { errorHandler, notFound } from "./middleware/error.js";

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "20kb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: "draft-7" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api", insightRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
