import { normalizeTopics } from "../utils/topicNormalizer.js";

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

// A binary max-heap prioritizes weak/revision items and medium questions in O(log n).
export function generateRevisionPlan(problems, weakTopics) {
  const weakSet = new Set(normalizeTopics(weakTopics.map((item) => item.topic)));
  const queue = new MaxPriorityQueue();
  problems.forEach((problem) => {
    const topics = normalizeTopics(problem.topics);
    const weakMatches = topics.filter((topic) => weakSet.has(topic)).length;
    const ageDays = problem.solvedDate
      ? Math.floor((Date.now() - new Date(problem.solvedDate)) / 86_400_000)
      : 0;
    const priority =
      weakMatches * 4 +
      difficultyWeight[problem.difficulty] +
      statusWeight[problem.status] +
      Math.min(ageDays / 14, 2);
    queue.push({ problem: { ...problem, topics }, priority });
  });

  const selected = [];
  while (queue.heap.length && selected.length < 14) selected.push(queue.pop());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.now() + index * 86_400_000);
    return {
      day: index + 1,
      date: date.toISOString().slice(0, 10),
      theme: weakTopics[index % Math.max(weakTopics.length, 1)]?.topic || "Mixed Practice",
      tasks: []
    };
  });
  selected.forEach((item, index) => {
    days[index % 7].tasks.push({
      id: item.problem._id,
      title: item.problem.title,
      difficulty: item.problem.difficulty,
      topics: item.problem.topics,
      link: item.problem.link,
      priority: Number(item.priority.toFixed(1))
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    strategy: "Weak-topic weight + status urgency + medium-problem preference + spaced review age",
    days
  };
}
