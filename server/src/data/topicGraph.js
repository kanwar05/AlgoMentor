import { normalizeTopic, normalizeTopics } from "../utils/topicNormalizer.js";

// Directed adjacency list: a compact graph representation of DSA prerequisites.
const graphEntries = {
  Array: ["Hash Map", "Two Pointers", "Binary Search"],
  "Hash Map": ["Sliding Window"],
  "Two Pointers": ["Sliding Window"],
  "Binary Search": [],
  "Sliding Window": [],
  Recursion: ["Backtracking"],
  Backtracking: ["Dynamic Programming"],
  "Dynamic Programming": [],
  Tree: ["BST"],
  BST: ["Heap"],
  Heap: ["Graph"],
  Graph: ["BFS/DFS"],
  "BFS/DFS": ["Dijkstra"],
  Dijkstra: ["MST"],
  MST: [],
  String: ["Hash Map"],
  "Linked List": ["Stack", "Queue"],
  Stack: [],
  Queue: ["BFS/DFS"],
  Greedy: ["Heap"],
  "Bit Manipulation": [],
  "Basic Programming": ["Array"],
  "Data Structures": ["Heap", "Graph"],
  Trie: ["String"]
};

export const topicGraph = Object.fromEntries(
  Object.entries(graphEntries).map(([topic, dependencies]) => [
    normalizeTopic(topic),
    normalizeTopics(dependencies)
  ])
);

const descriptions = {
  Array: "Build fluency with traversal, prefix sums, and in-place transformations.",
  "Hash Map": "Learn constant-time lookup patterns, frequency maps, and deduplication.",
  "Two Pointers": "Master converging and same-direction pointer techniques.",
  "Sliding Window": "Turn contiguous range brute force into linear-time solutions.",
  "Binary Search": "Practice searching both sorted data and monotonic answer spaces.",
  Recursion: "Develop strong base-case and recursive-state intuition.",
  Backtracking: "Explore decision trees with choose, explore, and un-choose.",
  "Dynamic Programming": "Recognize overlapping subproblems and define reusable states.",
  Tree: "Practice recursive traversal and structural reasoning.",
  BST: "Use ordering invariants for efficient search and updates.",
  Heap: "Solve top-k and scheduling problems with priority-based access.",
  Graph: "Model relationships with adjacency lists and visited state.",
  "BFS/DFS": "Traverse graphs systematically for reachability and shortest paths.",
  Dijkstra: "Find shortest paths in non-negative weighted graphs.",
  MST: "Connect all nodes at minimum total edge cost.",
  Greedy: "Prove when locally optimal choices produce a global optimum.",
  "Basic Programming": "Strengthen implementation, control flow, and complexity fundamentals.",
  "Data Structures": "Choose and combine structures based on access and update costs.",
  Trie: "Use prefix trees for efficient prefix lookup and dictionary problems.",
  String: "Master indexing, frequency counting, parsing, and pattern matching."
};

export const topicDescriptions = Object.fromEntries(
  Object.entries(descriptions).map(([topic, description]) => [normalizeTopic(topic), description])
);
