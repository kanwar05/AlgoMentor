import mongoose from "mongoose";
import { normalizeTopics } from "../utils/topicNormalizer.js";

export const TOPICS = [
  "Array", "String", "Hash Map", "Two Pointers", "Sliding Window",
  "Binary Search", "Linked List", "Stack", "Queue", "Recursion",
  "Backtracking", "Tree", "BST", "Heap", "Graph", "BFS/DFS",
  "Dijkstra", "MST", "Dynamic Programming", "Greedy", "Bit Manipulation",
  "Basic Programming", "Data Structures", "Trie"
];

const problemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    platform: { type: String, required: true, trim: true, maxlength: 50 },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    topics: { type: [{ type: String, trim: true }], set: normalizeTopics },
    status: { type: String, enum: ["Solved", "Revision", "Weak"], default: "Solved" },
    link: { type: String, trim: true, default: "" },
    solvedDate: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true, maxlength: 1000, default: "" }
  },
  { timestamps: true }
);

problemSchema.index({ user: 1, solvedDate: -1 });
problemSchema.index({ user: 1, topics: 1 });

export default mongoose.model("Problem", problemSchema);
