import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const expectations = new Map([
  ["apps/todam/package.json", "Apache-2.0"],
  ["apps/api/package.json", "AGPL-3.0-only"],
  ["apps/jobs/package.json", "AGPL-3.0-only"],
  ["packages/contracts/package.json", "Apache-2.0"],
  ["packages/design-system/package.json", "Apache-2.0"],
  ["packages/domain/package.json", "AGPL-3.0-only"],
  ["packages/database/package.json", "AGPL-3.0-only"],
]);

const errors = [];

for (const [manifestPath, expectedLicense] of expectations) {
  if (!existsSync(manifestPath)) {
    errors.push(`Manifeste absent : ${manifestPath}`);
    continue;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.license !== expectedLicense) {
    errors.push(
      `${manifestPath} doit déclarer ${expectedLicense}, pas ${manifest.license}.`,
    );
  }
}

for (const licensePath of [
  "LICENSES/Apache-2.0.txt",
  "LICENSES/AGPL-3.0.txt",
]) {
  if (!existsSync(licensePath)) {
    errors.push(`Texte de licence absent : ${licensePath}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const pnpmCommand =
  process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "pnpm";
const pnpmArguments =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "pnpm licenses list --json"]
    : ["licenses", "list", "--json"];
const dependencyLicenses = JSON.parse(
  execFileSync(pnpmCommand, pnpmArguments, {
    encoding: "utf8",
  }),
);
const rejectedLicenses = Object.keys(dependencyLicenses).filter((license) =>
  /UNKNOWN|UNLICENSED|PROPRIETARY/i.test(license),
);

if (rejectedLicenses.length > 0) {
  console.error(
    `Licences de dépendances à examiner : ${rejectedLicenses.join(", ")}`,
  );
  process.exit(1);
}

console.log(
  "Licences : attribution des packages et dépendances actuelles cohérentes.",
);
