import type { PublicStats } from "@todam/contracts";
import { performances, productions, user, type TodamDatabase } from "@todam/database";
import { and, count, eq, gte } from "drizzle-orm";

export function createPublicStatsService(database: TodamDatabase) {
  return {
    async getStats(): Promise<PublicStats> {
      const generatedAt = new Date();
      const [verifiedUsers, activeProductions, upcomingPerformances] =
        await Promise.all([
          database
            .select({ total: count() })
            .from(user)
            .where(eq(user.emailVerified, true)),
          database
            .select({ total: count() })
            .from(productions)
            .where(
              and(
                eq(productions.isActive, true),
                eq(productions.publicationStatus, "published"),
              ),
            ),
          database
            .select({ total: count() })
            .from(performances)
            .innerJoin(productions, eq(productions.id, performances.productionId))
            .where(
              and(
                eq(productions.isActive, true),
                eq(productions.publicationStatus, "published"),
                eq(performances.status, "scheduled"),
                gte(performances.startsAt, generatedAt),
              ),
            ),
        ]);

      return {
        verifiedUsers: Number(verifiedUsers[0]?.total ?? 0),
        activeProductions: Number(activeProductions[0]?.total ?? 0),
        upcomingPerformances: Number(upcomingPerformances[0]?.total ?? 0),
        generatedAt: generatedAt.toISOString(),
      };
    },
  };
}

export type PublicStatsService = ReturnType<typeof createPublicStatsService>;
