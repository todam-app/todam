import type { CompanyDetail } from "@todam/contracts";
import { describe, expect, it } from "vitest";

import { groupCompanyTouringDates } from "../lib/company-touring-dates";

type TouringPerformance = CompanyDetail["touringDates"][number];

const production = {
  id: "100234d9-6224-4372-bca3-5d430ac5d9f0",
  slug: "spectacle-test",
  title: "Spectacle test",
  discipline: "theatre" as const,
};
const venue = {
  id: "200234d9-6224-4372-bca3-5d430ac5d9f0",
  slug: "lieu-test",
  name: "Lieu test",
  locality: "Grenoble",
  countryCode: "FR",
  timezone: "Europe/Paris",
  officialUrl: null,
};

function performance(id: string, startsAt: string): TouringPerformance {
  return {
    id,
    startsAt,
    endsAt: null,
    status: "scheduled",
    officialUrl: null,
    production,
    venue,
  };
}

describe("groupCompanyTouringDates", () => {
  it("regroupe et trie les représentations d'une même production et d'un même lieu", () => {
    const result = groupCompanyTouringDates([
      performance("300234d9-6224-4372-bca3-5d430ac5d9f1", "2026-12-10T19:00:00.000Z"),
      performance("300234d9-6224-4372-bca3-5d430ac5d9f0", "2026-12-09T13:15:00.000Z"),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.venues).toHaveLength(1);
    expect(result[0]?.venues[0]?.performances.map((item) => item.startsAt)).toEqual([
      "2026-12-09T13:15:00.000Z",
      "2026-12-10T19:00:00.000Z",
    ]);
  });
});
