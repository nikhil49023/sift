export const mockCandidates = [
  {
    id: "cand-1",
    username: "alex_systems",
    name: "Alex Rivera",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    repoName: "distributed-raft-kv",
    repoUrl: "https://github.com/alex_systems/distributed-raft-kv",
    overallScore: 94,
    percentile: "Top 2%",
    verdict: "STRONG ADVANCE",
    riskLevel: "CLEAN",
    summary: "Exceptional first-principles systems engineering. Implemented custom Raft consensus in Rust with 42 deterministic integration tests and chaos monkey network partitioning tests.",
    metrics: {
      systemsRigor: 96,
      algorithmicDepth: 92,
      testingVerification: 95,
      collaborationHygiene: 91
    },
    antiCheat: {
      timelineStatus: "PASS",
      timelineDetail: "Commits spread iteratively across 4 days (36 atomic commits).",
      diffVelocityStatus: "PASS",
      diffVelocityDetail: "Average diff size: 140 lines/commit. Zero bulk zip dumps.",
      contributorStatus: "PASS",
      contributorDetail: "Sole author (100% verified original code).",
      codeAuthenticityStatus: "PASS",
      codeAuthenticityDetail: "High AST cyclomatic complexity (v=14.2). Zero placeholder TODOs.",
      plagiarismStatus: "PASS",
      plagiarismDetail: "0% match against public crate templates."
    },
    citations: [
      { file: "src/raft/consensus.rs#L84", desc: "Custom leader election RPC state machine with jittered election timer." },
      { file: "tests/chaos_test.rs#L32", desc: "Simulated 3-node network partition with split-brain recovery assertions." },
      { file: ".github/workflows/ci.yml#L12", desc: "Automated Miri memory safety and thread sanitizer checks." }
    ],
    primaryLanguages: ["Rust", "Python"],
    totalCommits: 36,
    codeVolume: "4,120 LOC"
  },
  {
    id: "cand-2",
    username: "template_copier",
    name: "Devon Vance",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    repoName: "ai-smart-crm",
    repoUrl: "https://github.com/template_copier/ai-smart-crm",
    overallScore: 41,
    percentile: "Bottom 30%",
    verdict: "SUSPICIOUS",
    riskLevel: "SUSPICIOUS",
    summary: "Repo is primarily an unmodified fork of a popular Next.js dashboard template with 1 bulk commit of 18,000 LOC. Custom business logic is limited to 2 files.",
    metrics: {
      systemsRigor: 38,
      algorithmicDepth: 35,
      testingVerification: 22,
      collaborationHygiene: 68
    },
    antiCheat: {
      timelineStatus: "WARN",
      timelineDetail: "All 18,240 LOC committed in 1 initial commit titled 'initial commit'.",
      diffVelocityStatus: "FAIL",
      diffVelocityDetail: "Extreme diff velocity (18k lines in 12 seconds). Typical starter kit dump.",
      contributorStatus: "WARN",
      contributorDetail: "Secondary contributor has 1 commit modifying README only.",
      codeAuthenticityStatus: "WARN",
      codeAuthenticityDetail: "78% boilerplate components matching shadcn/starter template.",
      plagiarismStatus: "WARN",
      plagiarismDetail: "92% AST similarity with public 'nextjs-saas-starter' template."
    },
    citations: [
      { file: "package.json#L4", desc: "Left template author metadata unmodified." },
      { file: "src/app/api/chat/route.ts#L18", desc: "Standard 6-line OpenAI API call without error handling or streaming." }
    ],
    primaryLanguages: ["TypeScript", "CSS"],
    totalCommits: 3,
    codeVolume: "18,450 LOC (94% Boilerplate)"
  },
  {
    id: "cand-3",
    username: "ghost_passenger",
    name: "Jordan Lee",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    repoName: "fintech-edge-pipeline",
    repoUrl: "https://github.com/ghost_passenger/fintech-edge-pipeline",
    overallScore: 19,
    percentile: "Bottom 10%",
    verdict: "RED FLAG",
    riskLevel: "RED FLAG",
    summary: "Severe authenticity red flags. Functions contain hardcoded JSON mocks, empty try-catch blocks, and 0 unit tests. Claimed 'Deep Learning' model is a mock random generator.",
    metrics: {
      systemsRigor: 15,
      algorithmicDepth: 18,
      testingVerification: 10,
      collaborationHygiene: 32
    },
    antiCheat: {
      timelineStatus: "FAIL",
      timelineDetail: "Pre-built repository cloned and pushed 1 hour before submission.",
      diffVelocityStatus: "FAIL",
      diffVelocityDetail: "Single commit dump without incremental test logs.",
      contributorStatus: "FAIL",
      contributorDetail: "Ghost author anomaly: 0 PR reviews, single commit.",
      codeAuthenticityStatus: "FAIL",
      codeAuthenticityDetail: "Multiple empty functions with 'TODO: implement in production' comment.",
      plagiarismStatus: "FAIL",
      plagiarismDetail: "Exact duplicate of Medium tutorial repo from 2022."
    },
    citations: [
      { file: "model/predict.py#L22", desc: "def predict(): return random.choice([0.89, 0.94])  # Hollow mock" },
      { file: "services/db.js#L14", desc: "try {} catch(e) {}  # Silenced exception" }
    ],
    primaryLanguages: ["Python", "JavaScript"],
    totalCommits: 2,
    codeVolume: "820 LOC"
  }
];
