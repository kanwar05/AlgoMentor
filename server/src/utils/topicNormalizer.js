export const TOPIC_ALIASES = Object.freeze({
  array: "Array",
  arrays: "Array",
  string: "String",
  strings: "String",
  "hash-table": "Hash Map",
  "hash table": "Hash Map",
  hashmap: "Hash Map",
  "hash-map": "Hash Map",
  "hash map": "Hash Map",
  hashing: "Hash Map",
  graph: "Graph",
  graphs: "Graph",
  tree: "Tree",
  trees: "Tree",
  "dynamic-programming": "Dynamic Programming",
  "dynamic programming": "Dynamic Programming",
  dp: "Dynamic Programming",
  "binary-search": "Binary Search",
  "binary search": "Binary Search",
  "linked-list": "Linked List",
  "linked list": "Linked List",
  "two-pointers": "Two Pointers",
  "two pointers": "Two Pointers",
  "sliding-window": "Sliding Window",
  "sliding window": "Sliding Window",
  stack: "Stack",
  stacks: "Stack",
  queue: "Queue",
  queues: "Queue",
  heap: "Heap",
  heaps: "Heap",
  "priority-queue": "Heap",
  "priority queue": "Heap",
  "heap-priority-queue": "Heap",
  "heap / priority queue": "Heap",
  recursion: "Recursion",
  backtracking: "Backtracking",
  bst: "BST",
  "bfs/dfs": "BFS/DFS",
  bfs: "BFS/DFS",
  dfs: "BFS/DFS",
  dijkstra: "Dijkstra",
  mst: "MST",
  greedy: "Greedy",
  "bit-manipulation": "Bit Manipulation",
  "bit manipulation": "Bit Manipulation",
  "basic-programming": "Basic Programming",
  "basic programming": "Basic Programming",
  "data-structures": "Data Structures",
  "data structures": "Data Structures",
  trie: "Trie"
});

export function normalizeTopic(topic) {
  if (topic === null || topic === undefined) return "";
  const trimmed = String(topic).trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return TOPIC_ALIASES[trimmed.toLowerCase()] || trimmed;
}

export function normalizeTopics(topics) {
  const values = Array.isArray(topics) ? topics : [topics];
  return [...new Set(values.map(normalizeTopic).filter(Boolean))];
}
