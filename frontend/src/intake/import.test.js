import { describe, it, expect } from "vitest";
import {
  parseImport,
  mapImport,
  normalizeSubmission,
  repositoryName,
  validateBrief,
  safeCsvCell,
  MAX_FILE_BYTES,
} from "./import";

describe("submission import boundary", () => {
  it("reads quoted Forms CSV values, escaped quotes, BOM, and CRLF", () => {
    const parsed = parseImport(
      '\uFEFFFull Name,GitHub Repository,Team Members\r\n"Team ""Orbit""",https://github.com/sift/demo.git,"Alex, Noor"\r\n',
      "forms.csv",
    );
    const [row] = mapImport(parsed, parsed.mapping, "hackathon");
    expect(row.error).toBeNull();
    expect(row.input).toEqual({
      candidateName: 'Team "Orbit"',
      repositories: ["sift/demo"],
      team: ["Alex", "Noor"],
    });
  });
  it("keeps quoted newlines and multiple recruiting repositories", () => {
    const parsed = parseImport(
      'name,repositories\nAlex,"sift/ui\nsift/api"\n',
      "entries.csv",
    );
    expect(
      mapImport(parsed, parsed.mapping, "recruiting")[0].input.repositories,
    ).toEqual(["sift/ui", "sift/api"]);
  });
  it("supports TSV and JSON envelopes with array fields", () => {
    const tsv = parseImport(
      "Team Name\tProject Repository\nOrbit\tsift/orbit",
      "entries.TSV",
    );
    expect(mapImport(tsv, tsv.mapping, "hackathon")[0].error).toBeNull();
    const json = parseImport(
      JSON.stringify({
        responses: [
          {
            candidateName: "Orbit",
            repositories: ["sift/orbit"],
            team: ["Alex"],
            overallScore: 100,
            decision: "award",
          },
        ],
      }),
      "entries.json",
    );
    expect(mapImport(json, json.mapping, "hackathon")[0].input).toEqual({
      candidateName: "Orbit",
      repositories: ["sift/orbit"],
      team: ["Alex"],
    });
  });
  it.each([
    ["name,Name\nAlex,Alex", "csv", /unique/],
    ["name,repositories\nAlex,sift/ui,extra", "csv", /number of columns/],
    ['name,repositories\n"Alex,sift/ui', "csv", /not closed/],
    ['name,repositories\n"Alex"bad,sift/ui', "csv", /unexpected/],
    ["{", "json", /not valid/],
    ['{"responses":[42]}', "json", /array of objects/],
    ["[]", "json", /no submissions/],
    ["anything", "xlsx", /CSV, JSON, or TSV/],
  ])(
    "rejects malformed or unsupported input (%s)",
    (text, extension, error) => {
      expect(() => parseImport(text, "entries." + extension)).toThrow(error);
    },
  );
  it("enforces file and row limits before submission", () => {
    expect(() => parseImport("[]", "entries.json", MAX_FILE_BYTES + 1)).toThrow(
      /5 MB/,
    );
    expect(() =>
      parseImport(
        JSON.stringify(
          Array.from({ length: 21 }, () => ({
            name: "Alex",
            repository: "sift/ui",
          })),
        ),
        "entries.json",
      ),
    ).toThrow(/20 submissions/);
  });
  it("reports row errors and case-insensitive duplicate entries without admitting invalid rows", () => {
    const parsed = parseImport(
      "name,repositories\nAlex,sift/ui\nAlex,SIFT/UI\nNoor,https://example.com/repo",
      "entries.csv",
    );
    const rows = mapImport(parsed, parsed.mapping, "recruiting");
    expect(rows[0].error).toBeNull();
    expect(rows[1].error).toMatch(/Duplicate/);
    expect(rows[2].error).toMatch(/GitHub repository/);
    expect(rows[2].input).toBeNull();
  });
  it("requires a single repository for hackathons and limits recruiting to five", () => {
    expect(() =>
      normalizeSubmission(
        { candidateName: "Alex", repositories: "sift/ui,sift/api" },
        "hackathon",
      ),
    ).toThrow(/exactly one/);
    expect(() =>
      normalizeSubmission(
        {
          candidateName: "Alex",
          repositories: Array.from({ length: 6 }, (_, n) => "sift/repo" + n),
        },
        "recruiting",
      ),
    ).toThrow(/five/);
    expect(() => repositoryName("sift/..")).toThrow();
    expect(() =>
      repositoryName("https://github.com/sift/ui/tree/main"),
    ).toThrow();
  });
  it("validates sprint context and neutralizes spreadsheet formulas on export", () => {
    expect(() =>
      validateBrief(
        { title: "Round one", sprintStart: "2026-10-05T10:00", sprintEnd: "" },
        "hackathon",
      ),
    ).toThrow(/both/);
    expect(() =>
      validateBrief(
        {
          title: "Round one",
          sprintStart: "2026-10-06T10:00",
          sprintEnd: "2026-10-05T10:00",
        },
        "hackathon",
      ),
    ).toThrow(/after/);
    expect(safeCsvCell('=HYPERLINK("example")')).toBe(
      '"\'=HYPERLINK(""example"")"',
    );
    expect(safeCsvCell("Alex, Noor")).toBe('"Alex, Noor"');
  });
});
