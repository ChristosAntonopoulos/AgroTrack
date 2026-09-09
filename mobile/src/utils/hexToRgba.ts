/** Convert #RRGGBB (or #RGB) to rgba() for soft layered card fades. */
export const hexToRgba = (hex: string, alpha: number): string => {
  const raw = hex.replace('#', '').trim();
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  if (full.length !== 6) return `rgba(90, 106, 92, ${alpha})`;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(90, 106, 92, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
