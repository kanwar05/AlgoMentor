import { topicDescriptions, topicGraph } from "../data/topicGraph.js";

function findPrerequisites(target) {
  const reverse = {};
  Object.entries(topicGraph).forEach(([from, destinations]) => {
    destinations.forEach((to) => {
      reverse[to] = [...(reverse[to] || []), from];
    });
  });

  const result = [];
  const visited = new Set([target]);
  const queue = [...(reverse[target] || [])];
  // BFS walks backward to include prerequisite concepts before a weak topic.
  while (queue.length) {
    const topic = queue.shift();
    if (visited.has(topic)) continue;
    visited.add(topic);
    result.unshift(topic);
    queue.push(...(reverse[topic] || []));
  }
  return result;
}

function traverseFrom(start, limit = 5) {
  const order = [];
  const visited = new Set();
  // DFS creates a focused progression through dependent topics.
  function dfs(topic) {
    if (visited.has(topic) || order.length >= limit) return;
    visited.add(topic);
    order.push(topic);
    (topicGraph[topic] || []).forEach(dfs);
  }
  dfs(start);
  return order;
}

export function generateRoadmap(topicStats = []) {
  const priority = { weak: 0, practicing: 1, untouched: 2, strong: 3 };
  const candidates = [...topicStats]
    .filter((item) => item.status !== "strong")
    .sort((a, b) =>
      priority[a.status] - priority[b.status] ||
      (b.severity || Math.max(b.weakRatio || 0, b.revisionRatio || 0) * 100) -
        (a.severity || Math.max(a.weakRatio || 0, a.revisionRatio || 0) * 100) ||
      b.total - a.total ||
      a.topic.localeCompare(b.topic)
    );
  const focusItems = candidates.slice(0, 4);
  const focus = focusItems.map((item) => item.topic);
  const focusStatus = Object.fromEntries(focusItems.map((item) => [item.topic, item.status]));
  const ordered = [];
  const seen = new Set();
  focus.forEach((topic) => {
    [...findPrerequisites(topic), ...traverseFrom(topic)].forEach((item) => {
      if (!seen.has(item)) {
        seen.add(item);
        ordered.push(item);
      }
    });
  });

  const fallback = ["Array", "Hash Map", "Sliding Window", "Tree", "Graph", "BFS/DFS", "Dynamic Programming"];
  (ordered.length ? [] : fallback).forEach((item) => ordered.push(item));

  return {
    focusTopics: focus,
    focusDetails: focusItems.map((item) => ({ topic: item.topic, status: item.status })),
    path: ordered.slice(0, 12).map((topic, index) => ({
      order: index + 1,
      topic,
      description: topicDescriptions[topic] || `Strengthen core patterns and problem-solving fluency in ${topic}.`,
      status: focus.includes(topic) ? "focus" : index === 0 ? "start" : "upcoming",
      topicStatus: focusStatus[topic] || null,
      estimatedHours: index < 3 ? 3 : 5
    })),
    graph: {
      nodes: Object.keys(topicGraph).map((id) => ({
        id,
        weak: focusStatus[id] === "weak",
        status: focusStatus[id] || null
      })),
      edges: Object.entries(topicGraph).flatMap(([source, targets]) => targets.map((target) => ({ source, target })))
    }
  };
}
