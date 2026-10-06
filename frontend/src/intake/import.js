export const MAX_ROWS = 20;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const normalizeHeader = (value) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");
const aliases = {
  candidateName: [
    "name",
    "fullname",
    "candidatename",
    "teamname",
    "submissionname",
  ],
  repositories: [
    "repository",
    "repositories",
    "repositoryurl",
    "githubrepository",
    "githubrepositoryurl",
    "githublink",
    "githuburl",
    "projectrepository",
  ],
  githubUsername: ["githubusername", "githubhandle", "username"],
  team: ["team", "members", "teammembers", "declaredteam"],
};

export function parseDelimited(text, delimiter = ",") {
  const rows = [];
  let row = [],
    field = "",
    quoted = false,
    closed = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else field += char;
      continue;
    }
    if (char === '"' && field === "" && !closed) {
      quoted = true;
      continue;
    }
    if (char === delimiter) {
      row.push(field);
      field = "";
      closed = false;
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index++;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
      closed = false;
      continue;
    }
    if (closed && !/\s/.test(char))
      throw new Error(
        "A quoted value contains unexpected text after its closing quote.",
      );
    if (char === '"')
      throw new Error(
        "Quotes inside a value must be escaped using two quotes.",
      );
    if (!closed) field += char;
  }
  if (quoted)
    throw new Error("The file contains a quoted value that was not closed.");
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

export function parseImport(
  text,
  fileName,
  size = new TextEncoder().encode(text).length,
) {
  if (size > MAX_FILE_BYTES)
    throw new Error("Choose a file smaller than 5 MB.");
  const extension = fileName.split(".").pop().toLowerCase();
  let rows, headers;
  if (extension === "json") {
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      throw new Error(
        "This JSON is not valid. Check its brackets, commas, and quotes.",
      );
    }
    rows = Array.isArray(value)
      ? value
      : value?.candidates || value?.submissions || value?.responses;
    if (
      !Array.isArray(rows) ||
      rows.some((row) => !row || typeof row !== "object" || Array.isArray(row))
    )
      throw new Error(
        "Use an array of objects, or an object with a candidates, submissions, or responses array.",
      );
    headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  } else if (extension === "csv" || extension === "tsv") {
    const parsed = parseDelimited(text, extension === "tsv" ? "\t" : ",");
    headers = (parsed.shift() || []).map((header) => header.trim());
    if (
      headers.some((header) => !header) ||
      new Set(headers.map(normalizeHeader)).size !== headers.length
    )
      throw new Error("Every column needs a unique, non-empty header.");
    if (parsed.some((row) => row.length !== headers.length))
      throw new Error(
        "Some rows have a different number of columns. Check delimiters and quote values containing commas.",
      );
    rows = parsed.map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index]])),
    );
  } else
    throw new Error(
      "Choose a CSV, JSON, or TSV file. Forms responses can be exported as CSV.",
    );
  if (!rows.length)
    throw new Error("The file has no submissions. Add at least one row.");
  if (rows.length > MAX_ROWS)
    throw new Error("Import up to 20 submissions at a time.");
  if (!headers.length || headers.length > 60)
    throw new Error("Use between 1 and 60 named columns.");
  const mapping = Object.fromEntries(
    Object.entries(aliases).map(([field, names]) => [
      field,
      headers.find((header) => names.includes(normalizeHeader(header))) || "",
    ]),
  );
  return { rows, headers, mapping, fileName };
}

export function repositoryName(value) {
  const name = String(value)
    .trim()
    .replace(/^https:\/\/github\.com\//i, "")
    .replace(/\/$/, "")
    .replace(/\.git$/, "");
  if (
    !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/.test(name) ||
    /\/\.\.?$/.test(name)
  )
    throw new Error("Use a GitHub repository URL or owner/repository.");
  return name;
}
const stringValue = (value, label) => {
  if (value == null) return "";
  if (typeof value !== "string") throw new Error(label + " must be text.");
  return value.trim();
};

export function normalizeSubmission(row, workflow) {
  const candidateName = stringValue(row.candidateName, "Name");
  if (!candidateName || candidateName.length > 200)
    throw new Error("A name of 1–200 characters is required.");
  const repositoryValues = Array.isArray(row.repositories)
    ? row.repositories
    : stringValue(row.repositories, "Repositories")
        .split(/[\n,;]+/)
        .filter((value) => value.trim());
  const repositories = repositoryValues.map(repositoryName);
  if (
    !repositories.length ||
    repositories.length > (workflow === "hackathon" ? 1 : 5)
  )
    throw new Error(
      workflow === "hackathon"
        ? "Each team needs exactly one repository."
        : "Choose between one and five repositories.",
    );
  if (
    new Set(repositories.map((repo) => repo.toLowerCase())).size !==
    repositories.length
  )
    throw new Error("Remove duplicate repositories from this submission.");
  const githubUsername = stringValue(row.githubUsername, "GitHub username");
  if (githubUsername && !/^[A-Za-z0-9-]{1,39}$/.test(githubUsername))
    throw new Error("Use a GitHub username, without a URL or @.");
  const team =
    workflow === "hackathon"
      ? (Array.isArray(row.team)
          ? row.team
          : stringValue(row.team, "Team").split(",")
        )
          .map((member) => stringValue(member, "Team member"))
          .filter(Boolean)
      : [];
  if (team.length > 30 || team.some((member) => member.length > 100))
    throw new Error(
      "Use up to 30 team members, each no longer than 100 characters.",
    );
  return {
    candidateName,
    repositories,
    team,
    ...(githubUsername ? { githubUsername } : {}),
  };
}

export function mapImport(parsed, mapping, workflow) {
  if (!mapping.candidateName || !mapping.repositories)
    throw new Error("Map both the name and repository columns.");
  const seen = new Set();
  return parsed.rows.map((row, index) => {
    try {
      const input = normalizeSubmission(
        Object.fromEntries(
          Object.entries(mapping).map(([key, column]) => [
            key,
            column ? row[column] : "",
          ]),
        ),
        workflow,
      );
      const key =
        input.candidateName.toLowerCase() +
        ":" +
        [...input.repositories].sort().join(",").toLowerCase();
      if (seen.has(key)) throw new Error("Duplicate submission in this file.");
      seen.add(key);
      return { row: index + 1, input, error: null };
    } catch (error) {
      return { row: index + 1, input: null, error: error.message };
    }
  });
}

export function validateBrief(brief, workflow) {
  if (!brief.title.trim() || brief.title.trim().length > 120)
    throw new Error("Give this evaluation a name of 1–120 characters.");
  if (workflow === "hackathon") {
    if (!!brief.sprintStart !== !!brief.sprintEnd)
      throw new Error("Enter both sprint dates, or leave both empty.");
    if (
      brief.sprintStart &&
      (!Number.isFinite(Date.parse(brief.sprintStart)) ||
        !Number.isFinite(Date.parse(brief.sprintEnd)) ||
        Date.parse(brief.sprintStart) >= Date.parse(brief.sprintEnd))
    )
      throw new Error("The sprint end must come after the start.");
  }
}

export function safeCsvCell(value) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function downloadText(fileName, text, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
