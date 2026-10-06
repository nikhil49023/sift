// These fixtures are available only through the explicit interactive demo.
export const demoSubmissions = [
  {
    candidateName: "Avery Patel",
    repositories: ["sift-demo/atlas-ui"],
    githubUsername: "avery-demo",
    team: ["Avery"],
    score: 92,
    dimensions: [4, 3, 4, 4],
    summary:
      "A sample assessment showing clear architecture, useful test coverage, and a considered approach to collaboration.",
  },
  {
    candidateName: "Noor Williams",
    repositories: ["sift-demo/relay-api"],
    githubUsername: "noor-demo",
    team: ["Noor", "Ellis"],
    score: 86,
    dimensions: [4, 4, 3, 3],
    summary:
      "A sample assessment showing strong technical depth and a useful opportunity to explore verification practices.",
  },
  {
    candidateName: "Ellis Morgan",
    repositories: ["sift-demo/field-notes"],
    githubUsername: "ellis-demo",
    team: ["Ellis"],
    score: 78,
    dimensions: [3, 3, 3, 4],
    summary:
      "A sample assessment showing a thoughtful project and consistent contributions across the team.",
  },
  {
    candidateName: "Jules Chen",
    repositories: ["sift-demo/seed-kit"],
    githubUsername: "jules-demo",
    team: ["Jules"],
    score: null,
    dimensions: [null, 2, null, 3],
    summary:
      "This sample illustrates insufficient evidence. Missing dimensions stay unscored and never become zero.",
  },
];
export function demoAssessment(input) {
  const fixture = demoSubmissions.find(
    (row) =>
      row.candidateName === input.candidateName &&
      JSON.stringify(row.repositories) === JSON.stringify(input.repositories),
  );
  if (!fixture)
    return {
      overallScore: null,
      riskLevel: "INSUFFICIENT_EVIDENCE",
      summary:
        "This imported submission has not been audited. Connect Live mode to collect evidence and generate an assessment.",
      dimensions: {},
    };
  return {
    overallScore: fixture.score,
    riskLevel:
      fixture.score === null ? "INSUFFICIENT_EVIDENCE" : "NO_FLAGS_OBSERVED",
    summary: fixture.summary,
    dimensions: Object.fromEntries(
      [
        "systemsRigor",
        "algorithmicDepth",
        "testingVerification",
        "collaborationHygiene",
      ].map((key, index) => [
        key,
        {
          level: fixture.dimensions[index],
          rationale: "Illustrative demo signal.",
        },
      ]),
    ),
  };
}
