// ─────────────────────────────────────────────
// Gallery layout helpers — 扑克牌展开布局计算
// ─────────────────────────────────────────────

export function getBaseAngle(count: number, i: number): number {
  if (count === 1) return 0
  const spread = count <= 2 ? 30 : count <= 3 ? 48 : 60
  return -spread / 2 + i * (spread / (count - 1))
}

export function getBaseX(count: number, i: number): number {
  if (count === 1) return 0
  const totalSpread = count <= 2 ? 40 : count <= 3 ? 60 : 80
  return -totalSpread / 2 + i * (totalSpread / (count - 1))
}

export function getCardTransform(
  count: number,
  i: number,
  hovered: number | null,
  isActive: boolean,
): string {
  const angle = getBaseAngle(count, i)
  const tx = getBaseX(count, i)

  if (hovered === i && isActive) {
    return `translateX(${tx}px) rotate(0deg) translateY(-60px) scale(1.1)`
  }
  if (hovered !== null && isActive) {
    const shift = i < hovered ? -12 : 12
    return `translateX(${tx + shift}px) rotate(${angle}deg) translateY(6px) scale(0.94)`
  }
  return `translateX(${tx}px) rotate(${angle}deg) translateY(0px) scale(1)`
}
