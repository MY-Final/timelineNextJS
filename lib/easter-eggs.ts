import { useState, useEffect, useRef, useCallback } from 'react'

// ─────────────────────────────────────────────
// 爱心飘散效果 Hook
// ─────────────────────────────────────────────
export function useFloatingHearts(count = 12) {
  const [hearts, setHearts] = useState<{ id: number, x: number, delay: number }[]>([])
  const heartId = useRef(0)

  const spawn = useCallback(() => {
    const newHearts = Array.from({ length: count }, () => ({
      id: heartId.current++,
      x: Math.random() * 100,
      delay: Math.random() * 0.5
    }))
    setHearts(prev => [...prev, ...newHearts])
    setTimeout(() => {
      setHearts(prev => prev.filter(h => !newHearts.find(n => n.id === h.id)))
    }, 2500)
  }, [count])

  return { hearts, spawn }
}

// ─────────────────────────────────────────────
// 秘密点击计数 Hook
// ─────────────────────────────────────────────
export function useSecretClick(threshold = 7, windowMs = 500) {
  const [active, setActive] = useState(false)
  const clicks = useRef(0)
  const lastClick = useRef(0)

  const click = useCallback(() => {
    const now = Date.now()
    if (now - lastClick.current < windowMs) {
      clicks.current++
      if (clicks.current >= threshold) {
        setActive(v => !v)
        clicks.current = 0
      }
    } else {
      clicks.current = 1
    }
    lastClick.current = now
  }, [threshold, windowMs])

  return { active, click }
}

// ─────────────────────────────────────────────
// Konami 代码 Hook
// ─────────────────────────────────────────────
const KONAMI_SEQUENCE = [
  'ArrowUp', 'ArrowUp', 
  'ArrowDown', 'ArrowDown', 
  'ArrowLeft', 'ArrowRight', 
  'ArrowLeft', 'ArrowRight', 
  'b', 'a'
]

export function useKonamiCode() {
  const [active, setActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const index = useRef(0)

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      // 忽略输入框里的按键
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      const key = e.key.toLowerCase()
      const expected = KONAMI_SEQUENCE[index.current].toLowerCase()
      
      if (key === expected || e.code.toLowerCase() === expected) {
        index.current++
        setProgress(index.current)
        if (index.current === KONAMI_SEQUENCE.length) {
          setActive(v => !v)
          index.current = 0
          setProgress(0)
        }
      } else if (e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Meta') {
        index.current = 0
        setProgress(0)
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  return { active, progress, sequence: KONAMI_SEQUENCE }
}

// ─────────────────────────────────────────────
// 长按填充 Hook
// ─────────────────────────────────────────────
export function useLongPress(durationMs = 2000) {
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState(false)
  const timer = useRef<number | null>(null)
  const steps = durationMs / 50

  const start = useCallback(() => {
    setProgress(0)
    timer.current = window.setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timer.current!)
          setActive(v => !v)
          return 0
        }
        return p + (100 / steps)
      })
    }, 50)
  }, [steps])

  const end = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
    setProgress(0)
  }, [])

  return { progress, active, start, end }
}

// ─────────────────────────────────────────────
// 纪念日检测
// ─────────────────────────────────────────────
export function isAnniversary(date: Date): boolean {
  const today = new Date()
  return today.getDate() === date.getDate() && 
         today.getMonth() === date.getMonth()
}

// ─────────────────────────────────────────────
// 鼠标轨迹效果（rAF 节流，每帧最多创建一个 dot）
// ─────────────────────────────────────────────
export function useMouseTrail() {
  useEffect(() => {
    let rafId: number | null = null
    let pendingX = 0
    let pendingY = 0

    function spawnDot() {
      const dot = document.createElement('div')
      dot.className = 'mouse-trail'
      dot.style.left = `${pendingX}px`
      dot.style.top = `${pendingY}px`
      document.body.appendChild(dot)
      setTimeout(() => dot.remove(), 800)
      rafId = null
    }

    function handleMouseMove(e: MouseEvent) {
      pendingX = e.clientX
      pendingY = e.clientY
      if (rafId === null) {
        rafId = requestAnimationFrame(spawnDot)
      }
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])
}

// ─────────────────────────────────────────────
// I Love You 彩蛋 Hook
// ─────────────────────────────────────────────
const I_LOVE_YOU_TARGET = 'i love you'

export function useILoveYou() {
  const [active, setActive] = useState(false)
  const [stage, setStage] = useState(0) // 0: idle, 1: avatars jumping, 2: page flip, 3: explosion, 4: love display
  const [inputProgress, setInputProgress] = useState(0)
  const inputBuffer = useRef('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startAnimation = useCallback(() => {
    setActive(true)
    setStage(1)
    setInputProgress(0)

    // 阶段1: 头像跳跃 (1.5秒)
    setTimeout(() => setStage(2), 1500)

    // 阶段2: 页面翻转 (1秒)
    setTimeout(() => setStage(3), 2500)

    // 阶段3: 爆炸效果 (1秒)
    setTimeout(() => setStage(4), 3500)

    // 阶段4: 显示爱心 (保持3秒)
    setTimeout(() => {
      setActive(false)
      setStage(0)
    }, 6500)
  }, [])

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (active) return // 动画进行中不处理输入

      // 忽略输入框
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const char = e.key.toLowerCase()

      // 只接受字母和空格字符
      if (!/[a-z ]/.test(char)) return

      inputBuffer.current += char

      // 更新进度显示 - 检查当前输入是否匹配目标字符串的开头
      const currentInput = inputBuffer.current.toLowerCase()
      const targetLower = I_LOVE_YOU_TARGET.toLowerCase()

      let matchLength = 0
      for (let i = 0; i < Math.min(currentInput.length, targetLower.length); i++) {
        if (currentInput[i] === targetLower[i]) {
          matchLength++
        } else {
          break
        }
      }

      setInputProgress(matchLength)

      // 检查是否匹配完整"i love you"
      if (currentInput === targetLower) {
        startAnimation()
        inputBuffer.current = ''
        // setInputProgress(0) 已经在startAnimation中设置了
      }

      // 限制缓冲区长度
      if (inputBuffer.current.length > 50) {
        inputBuffer.current = inputBuffer.current.slice(-50)
      }

      // 设置超时重置
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        inputBuffer.current = ''
        setInputProgress(0)
      }, 3000)
    }

    window.addEventListener('keydown', handleKeydown)
    return () => {
      window.removeEventListener('keydown', handleKeydown)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [active, startAnimation])

  return { active, stage, inputProgress, target: I_LOVE_YOU_TARGET }
}
