export const leetcodeExporterScript = `(async () => {
  const query = \`
    query problemsetQuestionList(
      $categorySlug: String
      $limit: Int
      $skip: Int
      $filters: QuestionListFilterInput
    ) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        total: totalNum
        questions: data {
          questionFrontendId
          title
          titleSlug
          difficulty
          status
          topicTags { name slug }
        }
      }
    }
  \`;

  const limit = 100;
  let skip = 0;
  let total = Infinity;
  const solved = [];

  while (skip < total) {
    const response = await fetch("/graphql/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: { categorySlug: "", skip, limit, filters: {} }
      })
    });
    const payload = await response.json();
    if (!response.ok || payload.errors?.length) {
      throw new Error(payload.errors?.[0]?.message || "LeetCode export request failed");
    }

    const page = payload.data.problemsetQuestionList;
    total = page.total;
    solved.push(...page.questions
      .filter((problem) => String(problem.status).toLowerCase() === "ac")
      .map((problem) => ({
        platform: "LeetCode",
        platformProblemId: problem.questionFrontendId || problem.titleSlug,
        title: problem.title,
        slug: problem.titleSlug,
        difficulty: problem.difficulty,
        topics: problem.topicTags || [],
        problemUrl: \`https://leetcode.com/problems/\${problem.titleSlug}/\`
      })));

    skip += limit;
    console.log(\`AlgoMentor export: scanned \${Math.min(skip, total)} / \${total}\`);
  }

  const unique = [...new Map(solved.map((problem) => [problem.platformProblemId, problem])).values()];
  const blob = new Blob([JSON.stringify(unique, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "algomentor-leetcode-solved.json";
  link.click();
  URL.revokeObjectURL(link.href);
  console.log(\`AlgoMentor export complete: \${unique.length} solved problems downloaded.\`);
})().catch((error) => console.error("AlgoMentor export failed:", error));`;
