import { problemBank } from "../data/problemBank.js";
import { normalizeTopics } from "../utils/topicNormalizer.js";

export function recommendProblems(problems, weakTopics, targetCompany) {
  const solved = new Set(problems.map((item) => item.title.toLowerCase()));
  const weak = new Set(normalizeTopics(weakTopics.map((item) => item.topic)));

  return problemBank
    .filter((item) => !solved.has(item.title.toLowerCase()))
    .map((item) => {
      const topics = normalizeTopics(item.topics);
      const matchingTopics = topics.filter((topic) => weak.has(topic));
      const topicMatch = matchingTopics.length;
      const companyMatch = item.companies.includes(targetCompany);
      const mediumBoost = item.difficulty === "Medium" ? 3 : item.difficulty === "Easy" ? 1.5 : 1;
      const score = topicMatch * 5 + (companyMatch ? 4 : 0) + mediumBoost;
      return {
        ...item,
        topics,
        score,
        reason: topicMatch
          ? `Targets ${matchingTopics.join(", ")}`
          : companyMatch
            ? `Frequently aligned with ${targetCompany} interview patterns`
            : "Balances your current difficulty mix"
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}
