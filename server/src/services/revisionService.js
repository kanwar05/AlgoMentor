import RevisionTask from "../models/RevisionTask.js";
import { HttpError } from "../utils/httpError.js";
import { normalizeTopics } from "../utils/topicNormalizer.js";

const DAY = 86_400_000;
export const REVISION_COOLDOWN_DAYS = 7;
const allowedResults = new Set(["solved", "hint", "failed"]);
const difficultyWeight = { Easy: 1, Medium: 3, Hard: 2.5 };
const statusWeight = { Solved: 0.5, Revision: 3, Weak: 5 };

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
    async complete(taskId, userId, result, completedAt) {
      return model.findOneAndUpdate(
        { _id: taskId, userId, completed: false },
        { $set: { completed: true, completedAt, result } },
        { new: true, runValidators: true }
      ).lean();
    }
  };
}

export async function completeRevisionTask(
  { taskId, userId, result = "solved", completedAt = new Date() },
  store = createRevisionTaskStore()
) {
  if (!allowedResults.has(result)) {
    throw new HttpError(400, "Result must be solved, hint, or failed");
  }
  const task = await store.complete(taskId, userId, result, completedAt);
  if (!task) throw new HttpError(404, "Revision task not found");
  return task;
}

// A binary max-heap prioritizes weak/revision items and medium questions in O(log n).
export async function generateRevisionPlan(
  userId,
  problems,
  weakTopics,
  { store = createRevisionTaskStore(), now = new Date() } = {}
) {
  const weakSet = new Set(normalizeTopics(weakTopics.map((item) => item.topic)));
  const queue = new MaxPriorityQueue();
  problems.forEach((problem) => {
    const topics = normalizeTopics(problem.topics);
    const weakMatches = topics.filter((topic) => weakSet.has(topic)).length;
    const ageDays = problem.solvedDate
      ? Math.floor((now.getTime() - new Date(problem.solvedDate)) / DAY)
      : 0;
    const priority =
      weakMatches * 4 +
      difficultyWeight[problem.difficulty] +
      statusWeight[problem.status] +
      Math.min(ageDays / 14, 2);
    queue.push({ problem: { ...problem, topics }, priority });
  });

  const problemIds = problems.map((problem) => problem._id).filter(Boolean);
  const recentSince = new Date(now.getTime() - REVISION_COOLDOWN_DAYS * DAY);
  const existingTasks = problemIds.length
    ? await store.findRelevant(userId, problemIds, recentSince)
    : [];
  const recentCompleted = new Set(
    existingTasks.filter((task) => task.completed).map((task) => String(task.problemId))
  );
  const pendingByProblem = new Map(
    existingTasks
      .filter((task) => !task.completed)
      .map((task) => [String(task.problemId), task])
  );

  const selected = [];
  while (queue.heap.length && selected.length < 14) {
    const item = queue.pop();
    if (!recentCompleted.has(String(item.problem._id))) selected.push(item);
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
  persisted.forEach((item, index) => {
    days[index % 7].tasks.push({
      id: item.task._id,
      problemId: item.problem._id,
      title: item.problem.title,
      difficulty: item.problem.difficulty,
      topics: item.problem.topics,
      link: item.problem.link,
      priority: Number(item.priority.toFixed(1)),
      completed: false
    });
  });

  return {
    generatedAt: now.toISOString(),
    strategy: "Weak-topic weight + status urgency + medium-problem preference + spaced review age",
    days
  };
}
