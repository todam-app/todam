export function getHomeGreeting(pseudonym: string): string {
  return `Bonjour, ${pseudonym}`;
}

export function getHomeProgressPercentage(current: number, target: number): number {
  if (target <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}
