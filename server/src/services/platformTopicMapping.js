const codeforcesTopicMap = {
  implementation: ["Arrays", "Basic Programming"],
  dp: ["Dynamic Programming"],
  graphs: ["Graphs"],
  trees: ["Trees"],
  greedy: ["Greedy"],
  "binary search": ["Binary Search"],
  strings: ["Strings"],
  "data structures": ["Data Structures"],
  "shortest paths": ["Graphs"]
};

const leetcodeTopicMap = {
  array: ["Arrays"],
  "hash-table": ["Hashing"],
  "dynamic-programming": ["Dynamic Programming"],
  tree: ["Trees"],
  graph: ["Graphs"],
  "binary-search": ["Binary Search"],
  string: ["Strings"],
  trie: ["Trie"],
  "heap-priority-queue": ["Heap / Priority Queue"]
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function mapCodeforcesTopics(tags = []) {
  return unique(tags.flatMap((tag) => codeforcesTopicMap[String(tag).toLowerCase()] || [tag]));
}

export function mapLeetCodeTopics(tags = []) {
  return unique(tags.flatMap((tag) => {
    const slug = typeof tag === "string" ? tag : tag?.slug || tag?.name;
    return leetcodeTopicMap[String(slug).toLowerCase()] || [tag?.name || slug];
  }));
}

export function difficultyFromCodeforcesRating(rating) {
  if (!rating || rating < 1200) return "Easy";
  if (rating < 1900) return "Medium";
  return "Hard";
}

export function normalizeDifficulty(value, fallback = "Medium") {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "easy") return "Easy";
  if (normalized === "medium") return "Medium";
  if (normalized === "hard") return "Hard";
  return fallback;
}

export function slugify(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
