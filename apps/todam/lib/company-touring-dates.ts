import type { CompanyDetail } from "@todam/contracts";

type TouringPerformance = CompanyDetail["touringDates"][number];

export type CompanyTouringVenueGroup = {
  performances: TouringPerformance[];
  venue: TouringPerformance["venue"];
};

export type CompanyTouringProductionGroup = {
  production: TouringPerformance["production"];
  venues: CompanyTouringVenueGroup[];
};

export function groupCompanyTouringDates(
  touringDates: CompanyDetail["touringDates"],
): CompanyTouringProductionGroup[] {
  const productions = new Map<string, CompanyTouringProductionGroup>();
  const orderedDates = [...touringDates].sort(
    (left, right) =>
      new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
  );

  for (const performance of orderedDates) {
    const productionGroup = productions.get(performance.production.id) ?? {
      production: performance.production,
      venues: [],
    };
    let venueGroup = productionGroup.venues.find(
      (candidate) => candidate.venue.id === performance.venue.id,
    );

    if (!venueGroup) {
      venueGroup = { performances: [], venue: performance.venue };
      productionGroup.venues.push(venueGroup);
    }

    venueGroup.performances.push(performance);
    productions.set(performance.production.id, productionGroup);
  }

  return Array.from(productions.values());
}
