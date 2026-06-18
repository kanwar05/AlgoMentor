// Directed adjacency list: a compact graph representation of DSA prerequisites.
export const topicGraph = {
  Array: ["Hashing", "Two Pointers", "Binary Search"],
  Hashing: ["Sliding Window"],
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
  String: ["Hashing"],
  "Linked List": ["Stack", "Queue"],
  Stack: [],
  Queue: ["BFS/DFS"],
  Greedy: ["Heap"],
  "Bit Manipulation": []
};

export const topicDescriptions = {
  Array: "Build fluency with traversal, prefix sums, and in-place transformations.",
  Hashing: "Learn constant-time lookup patterns, frequency maps, and deduplication.",
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
  Greedy: "Prove when locally optimal choices produce a global optimum."
};
