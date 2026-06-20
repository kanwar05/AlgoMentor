const today = new Date();
const iso = (offset) => new Date(today.getTime() - offset * 86_400_000).toISOString().slice(0, 10);

export const demoUser = {
  id: "demo", name: "Alex Morgan", email: "demo@algomentor.dev",
  codingGoal: "Crack a top product-company interview in 90 days",
  targetCompany: "Google", weeklyGoal: 12
};

export const demoProblems = [
  ["Two Sum", "LeetCode", "Easy", ["Array", "Hash Map"], "Solved", 0],
  ["Longest Substring Without Repeating", "LeetCode", "Medium", ["String", "Sliding Window"], "Revision", 1],
  ["Number of Islands", "LeetCode", "Medium", ["Graph", "BFS/DFS"], "Weak", 2],
  ["Reverse Linked List", "LeetCode", "Easy", ["Linked List"], "Solved", 4],
  ["Validate Binary Search Tree", "LeetCode", "Medium", ["Tree", "BST"], "Solved", 5],
  ["Coin Change", "LeetCode", "Medium", ["Dynamic Programming"], "Weak", 7],
  ["Container With Most Water", "LeetCode", "Medium", ["Array", "Two Pointers"], "Solved", 8],
  ["Daily Temperatures", "LeetCode", "Medium", ["Stack", "Array"], "Revision", 10],
  ["Maximum Depth of Binary Tree", "LeetCode", "Easy", ["Tree", "BFS/DFS"], "Solved", 12],
  ["Search in Rotated Sorted Array", "LeetCode", "Medium", ["Binary Search", "Array"], "Solved", 15],
  ["Subsets", "LeetCode", "Medium", ["Recursion", "Backtracking"], "Revision", 18],
  ["Trapping Rain Water", "LeetCode", "Hard", ["Array", "Two Pointers"], "Solved", 22]
].map(([title, platform, difficulty, topics, status, offset], index) => ({
  _id: `demo-${index}`, title, platform, difficulty, topics, status,
  solvedDate: iso(offset), link: `https://leetcode.com/problemset/`
}));

const activity = Array.from({ length: 120 }, (_, i) => ({
  date: iso(119 - i),
  count: [0, 0, 1, 0, 2, 1, 0, 3, 0, 1][i % 10]
}));

const demoStrongTopics = [
  { topic: "Array", total: 16, totalSolved: 16, solved: 13, revision: 2, weak: 1, revisionCount: 2, weakCount: 1, revisionRatio: .125, weakRatio: .0625, status: "strong" },
  { topic: "Hash Map", total: 11, totalSolved: 11, solved: 9, revision: 2, weak: 0, revisionCount: 2, weakCount: 0, revisionRatio: .18, weakRatio: 0, status: "strong" },
  { topic: "Tree", total: 9, totalSolved: 9, solved: 7, revision: 1, weak: 1, revisionCount: 1, weakCount: 1, revisionRatio: .11, weakRatio: .11, status: "strong" }
];
const demoWeakTopics = [
  { topic: "Dynamic Programming", total: 8, totalSolved: 8, solved: 2, revision: 2, weak: 4, revisionCount: 2, weakCount: 4, revisionRatio: .25, weakRatio: .5, status: "weak", severity: 50, reasons: ["50% marked weak"] },
  { topic: "Graph", total: 7, totalSolved: 7, solved: 3, revision: 1, weak: 3, revisionCount: 1, weakCount: 3, revisionRatio: .14, weakRatio: .43, status: "weak", severity: 43, reasons: ["43% marked weak"] }
];
const demoPracticingTopics = [
  { topic: "Sliding Window", total: 4, totalSolved: 4, solved: 3, revision: 1, weak: 0, revisionCount: 1, weakCount: 0, revisionRatio: .25, weakRatio: 0, status: "practicing" },
  { topic: "Backtracking", total: 3, totalSolved: 3, solved: 2, revision: 1, weak: 0, revisionCount: 1, weakCount: 0, revisionRatio: .33, weakRatio: 0, status: "practicing" }
];
const demoUntouchedTopics = ["Heap", "Trie", "MST", "Bit Manipulation"].map((topic) => ({
  topic, total: 0, totalSolved: 0, solved: 0, revision: 0, weak: 0,
  revisionCount: 0, weakCount: 0, revisionRatio: 0, weakRatio: 0, status: "untouched"
}));

export const demoAnalytics = {
  summary: {
    totalSolved: 64, difficulty: { Easy: 21, Medium: 36, Hard: 7 },
    streak: { current: 6, longest: 14 }, solvedThisWeek: 9, weeklyGoal: 12,
    weeklyProgress: 75, readinessScore: 72,
    topicDistribution: { strong: 3, weak: 2, practicing: 2, untouched: 4 }
  },
  readiness: { score: 72, breakdown: { topicCoverage: 76, difficultyBalance: 84, consistency: 69, totalSolvedScore: 64 } },
  topicStats: [...demoStrongTopics, ...demoWeakTopics, ...demoPracticingTopics],
  allTopicStats: [...demoStrongTopics, ...demoWeakTopics, ...demoPracticingTopics, ...demoUntouchedTopics],
  strongTopics: demoStrongTopics,
  weakTopics: demoWeakTopics,
  practicingTopics: demoPracticingTopics,
  untouchedTopics: demoUntouchedTopics,
  topicDistribution: { strong: 3, weak: 2, practicing: 2, untouched: 4 },
  activity,
  weeklyActivity: activity.slice(-7)
};

export const demoRoadmap = {
  focusTopics: ["Dynamic Programming", "Graph", "Sliding Window"],
  focusDetails: [
    { topic: "Dynamic Programming", status: "weak" },
    { topic: "Graph", status: "weak" },
    { topic: "Sliding Window", status: "practicing" }
  ],
  path: [
    ["Recursion", "Build the mental model for states, base cases, and repeated work."],
    ["Backtracking", "Learn to explore decision trees before optimizing repeated branches."],
    ["Dynamic Programming", "Convert repeated recursive states into memoized and tabulated solutions."],
    ["Tree", "Strengthen recursive traversal over hierarchical structures."],
    ["Graph", "Model connected systems using adjacency lists and visited sets."],
    ["BFS/DFS", "Master systematic traversal for components, cycles, and shortest paths."],
    ["Dijkstra", "Extend graph traversal to weighted shortest-path problems."]
  ].map(([topic, description], index) => ({ order: index + 1, topic, description, status: index === 2 || index === 4 ? "focus" : index < 2 ? "start" : "upcoming", estimatedHours: index < 3 ? 3 : 5 }))
};

export const demoRevisionPlan = {
  strategy: "Weak-topic weight + status urgency + medium-problem preference + spaced review age",
  days: ["Dynamic Programming", "Graph", "Sliding Window", "Trees", "Dynamic Programming", "Graph", "Mixed Mock"].map((theme, index) => ({
    day: index + 1, date: new Date(today.getTime() + index * 86_400_000).toISOString().slice(0, 10), theme,
    tasks: [
      { id: `${index}-a`, title: ["Coin Change", "Number of Islands", "Longest Substring", "Validate BST", "House Robber", "Course Schedule", "Mixed timed set"][index], difficulty: "Medium", topics: [theme], priority: 8.5 - index * .3 },
      { id: `${index}-b`, title: ["Climbing Stairs", "Flood Fill", "Minimum Window", "Level Order Traversal", "LIS", "Network Delay", "Error review"][index], difficulty: index === 6 ? "Easy" : "Medium", topics: [theme], priority: 6.5 - index * .2 }
    ]
  }))
};

export const demoRecommendations = [
  ["House Robber", "Medium", ["Dynamic Programming"], "Targets Dynamic Programming", ["Google", "Amazon"]],
  ["Course Schedule", "Medium", ["Graph", "BFS/DFS"], "Targets Graph, BFS/DFS", ["Google", "Amazon"]],
  ["Minimum Window Substring", "Hard", ["String", "Sliding Window"], "Targets Sliding Window", ["Google"]],
  ["Network Delay Time", "Medium", ["Graph", "Dijkstra"], "Builds your next graph dependency", ["Google"]],
  ["Longest Increasing Subsequence", "Medium", ["Dynamic Programming", "Binary Search"], "High-value Google pattern", ["Google", "Microsoft"]],
  ["Word Break", "Medium", ["Dynamic Programming", "String"], "Balances your DP pattern coverage", ["Google", "Amazon"]]
].map(([title, difficulty, topics, reason, companies], i) => ({ title, difficulty, topics, reason, companies, platform: "LeetCode", link: "https://leetcode.com/problemset/", score: 12 - i }));
