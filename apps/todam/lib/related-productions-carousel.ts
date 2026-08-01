export function getRelatedProductionCardWidth(viewportWidth: number) {
  if (viewportWidth >= 1280) return 320;
  if (viewportWidth >= 1024) return 280;
  if (viewportWidth >= 768) return 260;

  return Math.min(340, Math.max(0, viewportWidth - 72));
}
