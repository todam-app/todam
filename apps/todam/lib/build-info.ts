const REPOSITORY_URL = "https://github.com/todam-app/todam";

export interface BuildInfo {
  commitUrl: string | null;
  label: string;
  version: string;
}

export function resolveBuildInfo(
  version: string | null | undefined,
  buildSha: string | null | undefined,
): BuildInfo {
  const normalizedSha = buildSha?.trim() ?? "";
  const commitSha = /^[0-9a-f]{7,40}$/i.test(normalizedSha)
    ? normalizedSha.toLowerCase()
    : null;

  return {
    version: version?.trim() || "0.1.0",
    label: commitSha ? `build ${commitSha.slice(0, 7)}` : "build local",
    commitUrl: commitSha ? `${REPOSITORY_URL}/commit/${commitSha}` : null,
  };
}
