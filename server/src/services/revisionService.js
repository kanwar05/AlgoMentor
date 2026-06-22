import mongoose from "mongoose";
import RevisionTask from "../models/RevisionTask.js";
import ReviewAttempt from "../models/ReviewAttempt.js";
import { HttpError } from "../utils/httpError.js";
import { normalizeTopics } from "../utils/topicNormalizer.js";

const DAY = 86_400_000;
export const REVISION_COOLDOWN_DAYS = 7;
export const DEFAULT_REVIEW_INTERVAL = 1;
export const DEFAULT_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;
const allowedResults = new Set(["solved", "hint", "failed"]);
const difficultyWeight = { Easy: 1, Medium: 3, Hard: 2.5 };
const statusWeight = { Solved: 0.5, Strong: 0.5, Revision: 3, Weak: 5 };

class MaxPriorityQueue {
  constructor() { this.heap = []; }
  push(item) {
    this.heap.push(item);
    let index = this.heap.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[parent].priority >= item.priority) break;
      this.heap[index] = this.heap[parent];
      index = parent;
    }
    this.heap[index] = item;
  }
  pop() {
    if (!this.heap.length) return null;
    const top = this.heap[0];
    const tail = this.heap.pop();
    if (this.heap.length) {
      let index = 0;
      while (true) {
        let child = index * 2 + 1;
        if (child >= this.heap.length) break;
        if (child + 1 < this.heap.length && this.heap[child + 1].priority > this.heap[child].priority) child += 1;
        if (this.heap[child].priority <= tail.priority) break;
        this.heap[index] = this.heap[child];
        index = child;
      }
      this.heap[index] = tail;
    }
    return top;
  }
}

export function createRevisionTaskStore(model = RevisionTask) {
  return {
    async findRelevant(userId, problemIds, recentSince) {
      return model.find({
        userId,
        problemId: { $in: problemIds },
        $or: [
          { completed: false },
          { completed: true, completedAt: { $gte: recentSince } }
        ]
      }).sort({ createdAt: -1 }).lean();
    },
    async ensurePending(userId, problemId) {
      try {
        return await model.findOneAndUpdate(
          { userId, problemId, completed: false },
          {
            $setOnInsert: {
              userId,
              problemId,
              completed: false,
              completedAt: null,
              result: null
            }
          },
          { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        ).lean();
      } catch (error) {
        if (error.code !== 11000) throw error;
        return model.findOne({ userId, problemId, completed: false }).lean();
      }
    },
    async complete(taskId, userId, result, completedAt, session) {
      return model.findOneAndUpdate(
        { _id: taskId, userId, completed: false },
        { $set: { completed: true, completedAt, result } },
        { new: true, runValidators: true, session }
      ).lean();
    }
  };
}

export function createReviewAttemptStore(model = ReviewAttempt) {
  return {
    async findLatest(userId, problemId, session) {
      return model.findOne({ userId, problemId }).sort({ reviewedAt: -1 }).session(session).lean();
    },
    async findLatestForProblems(userId, problemIds) {
      const attempts = await model.find({
        userId,
        problemId: { $in: problemIds }
      }).sort({ reviewedAt: -1 }).lean();
      const latest = new Map();
      attempts.forEach((attempt) => {
        const key = String(attempt.problemId);
        if (!latest.has(key)) latest.set(key, attempt);
      });
      return latest;
    },
    async create(attempt, session) {
      const [document] = await model.create([attempt], { session });
      return document.toObject();
    }
  };
}

const normalizeOptionalNumber = (value, field, { min = 0, max = Number.POSITIVE_INFINITY } = {}) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    const range = max === Number.POSITIVE_INFINITY ? `${min} or greater` : `between ${min} and ${max}`;
    throw new HttpError(400, `${field} must be ${range}`);
  }
  return number;
};

export function calculateReviewSchedule({
  result,
  previousInterval = DEFAULT_REVIEW_INTERVAL,
  previousEaseFactor = DEFAULT_EASE_FACTOR,
  reviewedAt = new Date()
}) {
  if (!allowedResults.has(result)) {
    throw new HttpError(400, "Result must be solved, hint, or failed");
  }

  const currentInterval = Math.max(DEFAULT_REVIEW_INTERVAL, Number(previousInterval) || DEFAULT_REVIEW_INTERVAL);
  const currentEase = Math.max(MIN_EASE_FACTOR, Number(previousEaseFactor) || DEFAULT_EASE_FACTOR);
  let interval;
  let easeFactor;

  if (result === "solved") {
    interval = Math.max(1, Number((currentInterval * currentEase).toFixed(2)));
    easeFactor = currentEase + 0.1;
  } else if (result === "hint") {
    interval = Math.max(1, currentInterval);
    easeFactor = currentEase - 0.1;
  } else {
    interval = 1;
    easeFactor = currentEase - 0.2;
  }

  easeFactor = Math.max(MIN_EASE_FACTOR, Number(easeFactor.toFixed(2)));
  const nextReviewAt = new Date(new Date(reviewedAt).getTime() + interval * DAY);
  return { interval, easeFactor, nextReviewAt };
}

export async function completeRevisionTask(
  {
    taskId,
    userId,
    result = "solved",
    timeTaken = null,
    confidence = null,
    completedAt = new Date()
  },
  store = createRevisionTaskStore(),
  attemptStore = createReviewAttemptStore(),
  { startSession = () => mongoose.startSession() } = {}
) {
  if (!allowedResults.has(result)) {
    throw new HttpError(400, "Result must be solved, hint, or failed");
  }
  const normalizedTimeTaken = normalizeOptionalNumber(timeTaken, "timeTaken", { min: 0 });
  const normalizedConfidence = normalizeOptionalNumber(confidence, "confidence", { min: 0, max: 100 });
  const session = await startSession();
  let completed;

  try {
    await session.withTransaction(async () => {
      const task = await store.complete(taskId, userId, result, completedAt, session);
      if (!task) throw new HttpError(404, "Revision task not found");

      const previous = await attemptStore.findLatest(userId, task.problemId, session);
      const schedule = calculateReviewSchedule({
        result,
        previousInterval: previous?.interval,
        previousEaseFactor: previous?.easeFactor,
        reviewedAt: completedAt
      });
      const attempt = await attemptStore.create({
        userId,
        problemId: task.problemId,
        result,
        timeTaken: normalizedTimeTaken,
        confidence: normalizedConfidence,
        reviewedAt: completedAt,
        ...schedule
      }, session);
      completed = { ...task, attempt };
    });
    return completed;
  } finally {
    await session.endSession();
  }
}

// A binary max-heap prioritizes weak/revision items and medium questions in O(log n).
export async function generateRevisionPlan(
  userId,
  problems,
  weakTopics,
  {
    store = createRevisionTaskStore(),
    attemptStore = createReviewAttemptStore(),
    now = new Date()
  } = {}
) {
  const weakSet = new Set(normalizeTopics(weakTopics.map((item) => item.topic)));
  const queue = new MaxPriorityQueue();
  problems.forEach((problem) => {
    const topics = normalizeTopics(problem.topics);
    const weakMatches = topics.filter((topic) => weakSet.has(topic)).length;
    const lastPracticeDate = problem.lastReviewedAt || problem.solvedDate;
    const ageDays = lastPracticeDate
      ? Math.floor((now.getTime() - new Date(lastPracticeDate)) / DAY)
      : 0;
    const priority =
      weakMatches * 4 +
      difficultyWeight[problem.difficulty] +
      (statusWeight[problem.status] ?? statusWeight.Solved) +
      Math.min(ageDays / 14, 2);
    queue.push({ problem: { ...problem, topics }, priority });
  });

  const problemIds = problems.map((problem) => problem._id).filter(Boolean);
  const recentSince = new Date(now.getTime() - REVISION_COOLDOWN_DAYS * DAY);
  const existingTasks = problemIds.length
    ? await store.findRelevant(userId, problemIds, recentSince)
    : [];
  const latestAttempts = problemIds.length
    ? await attemptStore.findLatestForProblems(userId, problemIds)
    : new Map();
  const recentCompleted = new Set(
    existingTasks
      .filter((task) => task.completed && !latestAttempts.has(String(task.problemId)))
      .map((task) => String(task.problemId))
  );
  const pendingByProblem = new Map(
    existingTasks
      .filter((task) => !task.completed)
      .map((task) => [String(task.problemId), task])
  );

  const selected = [];
  const planEnd = new Date(now.getTime() + 6 * DAY);
  while (queue.heap.length && selected.length < 14) {
    const item = queue.pop();
    const problemId = String(item.problem._id);
    const latestAttempt = latestAttempts.get(problemId);
    if (recentCompleted.has(problemId)) continue;
    if (latestAttempt?.nextReviewAt && new Date(latestAttempt.nextReviewAt) > planEnd) continue;

    const dueAt = latestAttempt?.nextReviewAt ? new Date(latestAttempt.nextReviewAt) : now;
    const dueDay = Math.min(6, Math.max(0, Math.ceil((dueAt.getTime() - now.getTime()) / DAY)));
    const overdueDays = Math.max(0, Math.floor((now.getTime() - dueAt.getTime()) / DAY));
    selected.push({
      ...item,
      dueDay,
      nextReviewAt: latestAttempt?.nextReviewAt || null,
      priority: item.priority + Math.min(overdueDays / 3, 3)
    });
  }
  const persisted = await Promise.all(selected.map(async (item) => {
    const problemId = String(item.problem._id);
    const task = pendingByProblem.get(problemId) || await store.ensurePending(userId, item.problem._id);
    return { ...item, task };
  }));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getTime() + index * DAY);
    return {
      day: index + 1,
      date: date.toISOString().slice(0, 10),
      theme: weakTopics[index % Math.max(weakTopics.length, 1)]?.topic || "Mixed Practice",
      tasks: []
    };
  });
  const dayLoad = Array(7).fill(0);
  persisted.forEach((item) => {
    let dayIndex = item.dueDay;
    while (dayIndex < 6 && dayLoad[dayIndex] >= 2) dayIndex += 1;
    dayLoad[dayIndex] += 1;
    days[dayIndex].tasks.push({
      id: item.task._id,
      problemId: item.problem._id,
      title: item.problem.title,
      difficulty: item.problem.difficulty,
      topics: item.problem.topics,
      link: item.problem.link,
      priority: Number(item.priority.toFixed(1)),
      nextReviewAt: item.nextReviewAt,
      completed: false
    });
  });

  return {
    generatedAt: now.toISOString(),
    strategy: "Adaptive spaced repetition + weak-topic urgency + difficulty balance",
    days
  };
}
