import "dotenv/config";
import { connectDatabase } from "./config/db.js";
import Problem from "./models/Problem.js";
import User from "./models/User.js";
import { problemBank } from "./data/problemBank.js";

await connectDatabase();
const email = "demo@algomentor.dev";
await User.deleteOne({ email });
const user = await User.create({
  name: "Alex Morgan",
  email,
  password: "DemoPass123!",
  codingGoal: "Crack a top product-company interview in 90 days",
  targetCompany: "Google",
  weeklyGoal: 12
});

const statuses = ["Solved", "Solved", "Solved", "Revision", "Weak"];
const samples = problemBank.slice(0, 15).map((item, index) => ({
  user: user._id,
  title: item.title,
  platform: item.platform,
  difficulty: item.difficulty,
  topics: item.topics,
  status: statuses[index % statuses.length],
  link: item.link,
  solvedDate: new Date(Date.now() - index * 2 * 86_400_000)
}));
await Problem.insertMany(samples);
console.log("Seed complete — demo@algomentor.dev / DemoPass123!");
process.exit(0);
