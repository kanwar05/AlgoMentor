import { normalizeTopics } from "../utils/topicNormalizer.js";

const codeforcesTopicMap = {
  implementation: ["Array", "Basic Programming"],
  dp: ["Dynamic Programming"],
  graphs: ["Graph"],
  trees: ["Tree"],
  greedy: ["Greedy"],
  "binary search": ["Binary Search"],
  strings: ["String"],
  "data structures": ["Data Structures"],
  "shortest paths": ["Graph"]
};

const leetcodeTopicMap = {
  array: ["Array"],
  "hash-table": ["Hash Map"],
  "dynamic-programming": ["Dynamic Programming"],
  tree: ["Tree"],
  graph: ["Graph"],
  "binary-search": ["Binary Search"],
  string: ["String"],
  trie: ["Trie"],
  "heap-priority-queue": ["Heap"]
};

export function mapCodeforcesTopics(tags = []) {
  return normalizeTopics(tags.flatMap((tag) => codeforcesTopicMap[String(tag).trim().toLowerCase()] || [tag]));
}

export function mapLeetCodeTopics(tags = []) {
  return normalizeTopics(tags.flatMap((tag) => {
    const slug = typeof tag === "string" ? tag : tag?.slug || tag?.name;
    return leetcodeTopicMap[String(slug || "").trim().toLowerCase()] || [tag?.name || slug];
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
