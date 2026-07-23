import { execFileSync } from "node:child_process";

const base = process.env.BASE_SHA;
const head = process.env.HEAD_SHA;

if (!base || !head) {
  console.error("BASE_SHA et HEAD_SHA sont requis.");
  process.exit(1);
}

const records = execFileSync(
  "git",
  ["log", "--format=%H%x00%an%x00%ae%x00%B%x1e", `${base}..${head}`],
  { encoding: "utf8" },
)
  .split("\x1e")
  .map((record) => record.trim())
  .filter(Boolean);

const unsigned = [];

for (const record of records) {
  const [sha, authorName, authorEmail, body = ""] = record.split("\x00");
  const isGitHubBot =
    authorName.endsWith("[bot]") &&
    authorEmail.endsWith("@users.noreply.github.com");

  if (isGitHubBot) {
    continue;
  }

  const escapedName = authorName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEmail = authorEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const signoff = new RegExp(
    `^Signed-off-by:\\s*${escapedName}\\s*<${escapedEmail}>\\s*$`,
    "im",
  );

  if (!signoff.test(body)) {
    unsigned.push(sha);
  }
}

if (unsigned.length > 0) {
  console.error(
    `Commits sans signature DCO conforme :\n${unsigned.join("\n")}\n` +
      "Utilisez git commit -s.",
  );
  process.exit(1);
}

console.log(`DCO : ${records.length} commit(s) conforme(s).`);
