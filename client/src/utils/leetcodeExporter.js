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
  const solvedProblems = [];

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
    solvedProblems.push(...page.questions
      .filter((problem) => String(problem.status).toLowerCase() === "ac")
      .map((problem) => ({
        platform: "LeetCode",
        platformProblemId: problem.questionFrontendId || problem.titleSlug,
        title: problem.title,
        slug: problem.titleSlug,
        difficulty: problem.difficulty,
        topics: problem.topicTags || [],
        problemUrl: \`https://leetcode.com/problems/\${problem.titleSlug}/\`,
        solvedAt: null
      })));

    skip += limit;
    console.log(\`AlgoMentor export: scanned \${Math.min(skip, total)} / \${total}\`);
  }

  const firstAcceptedBySlug = new Map();
  let offset = 0;
  let lastKey = "";
  let hasNext = true;

  while (hasNext) {
    const url = \`/api/submissions/?offset=\${offset}&limit=100&lastkey=\${encodeURIComponent(lastKey)}\`;
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) break;
    const payload = await response.json();
    const submissions = payload.submissions_dump || [];

    for (const submission of submissions) {
      if (submission.status_display !== "Accepted" || !submission.title_slug) continue;
      const timestamp = Number(submission.timestamp) * 1000;
      const current = firstAcceptedBySlug.get(submission.title_slug);
      if (!current || timestamp < current.timestamp) {
        firstAcceptedBySlug.set(submission.title_slug, {
          timestamp,
          submissionId: String(submission.id || ""),
          language: submission.lang || ""
        });
      }
    }

    hasNext = Boolean(payload.has_next) && submissions.length > 0;
    lastKey = payload.last_key || "";
    offset += submissions.length;
    console.log(\`AlgoMentor export: scanned \${offset} submissions\`);
  }

  const unique = [...new Map(solvedProblems.map((problem) => {
    const acceptance = firstAcceptedBySlug.get(problem.slug);
    return [problem.platformProblemId, {
      ...problem,
      solvedAt: acceptance ? new Date(acceptance.timestamp).toISOString() : null,
      submissionId: acceptance?.submissionId || "",
      language: acceptance?.language || ""
    }];
  })).values()];
  const blob = new Blob([JSON.stringify(unique, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "algomentor-leetcode-solved.json";
  link.click();
  URL.revokeObjectURL(link.href);
  console.log(\`AlgoMentor export complete: \${unique.length} solved problems downloaded.\`);
})().catch((error) => console.error("AlgoMentor export failed:", error));`;
