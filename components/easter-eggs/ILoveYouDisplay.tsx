import { useMemo } from 'react'

const HEART_EMOJIS = ['❤️', '💕', '💗', '💖', '💘'] as const

// Pre-seeded random using a simple LCG so positions are stable per render lifecycle
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

export default function ILoveYouDisplay() {
  const bgHearts = useMemo(() =>
    Array.from({ length: 25 }, (_, i) => ({
      left: seededRandom(i * 3) * 100,
      delay: seededRandom(i * 3 + 1) * 6,
      duration: 6 + seededRandom(i * 3 + 2) * 4,
      size: 12 + seededRandom(i * 3 + 0.5) * 18,
      emoji: HEART_EMOJIS[Math.floor(seededRandom(i * 3 + 1.5) * HEART_EMOJIS.length)],
    })),
  [])

  const sparkles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      left: seededRandom(i * 7 + 100) * 100,
      top: seededRandom(i * 7 + 200) * 100,
      delay: seededRandom(i * 7 + 300) * 3,
      duration: 3 + seededRandom(i * 7 + 400) * 2,
    })),
  [])

  return (
    <div className="ilove-you-display">
      {/* 背景飘动小爱心 */}
      <div className="love-bg-hearts" aria-hidden="true">
        {bgHearts.map((h, i) => (
          <span
            key={i}
            className="bg-heart"
            style={{
              left: `${h.left}%`,
              animationDelay: `${h.delay}s`,
              animationDuration: `${h.duration}s`,
              fontSize: `${h.size}px`,
            }}
          >
            {h.emoji}
          </span>
        ))}
      </div>

      <div className="love-heart-big">💖</div>
      <h1 className="love-text">我爱你</h1>

      <div className="love-sparkles">
        {sparkles.map((s, i) => (
          <span
            key={i}
            className="sparkle"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          >
            ✨
          </span>
        ))}
      </div>
    </div>
  )
}
