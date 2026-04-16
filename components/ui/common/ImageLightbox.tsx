import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageLightboxProps {
  images: string[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onJump: (i: number) => void
}

export function ImageLightbox({ images, index, onClose, onPrev, onNext, onJump }: ImageLightboxProps) {
  const total = images.length

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    },
    [onClose, onPrev, onNext],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [handleKey])

  return createPortal(
    <div
      className="lightbox-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
    >
      {/* 关闭 */}
      <button className="lightbox-close" onClick={onClose} aria-label="关闭预览">
        <X size={20} strokeWidth={1.5} />
      </button>

      {/* 计数 */}
      {total > 1 && (
        <div className="lightbox-counter" aria-live="polite">
          {index + 1} / {total}
        </div>
      )}

      {/* 图片舞台：包裹主图 + 左右箭头，使箭头相对图片居中 */}
      <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
        {/* 上一张 */}
        {total > 1 && (
          <button
            className="lightbox-arrow lightbox-arrow-left"
            onClick={(e) => { e.stopPropagation(); onPrev() }}
            aria-label="上一张"
          >
            <ChevronLeft size={28} strokeWidth={1.5} />
          </button>
        )}

        {/* 主图 */}
        <div className="lightbox-img-wrap">
          <img
            src={images[index]}
            alt={`预览图片 ${index + 1}`}
            className="lightbox-img"
            draggable={false}
          />
        </div>

        {/* 下一张 */}
        {total > 1 && (
          <button
            className="lightbox-arrow lightbox-arrow-right"
            onClick={(e) => { e.stopPropagation(); onNext() }}
            aria-label="下一张"
          >
            <ChevronRight size={28} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* 缩略图条 */}
      {total > 1 && (
        <div className="lightbox-thumbs" onClick={(e) => e.stopPropagation()}>
          {images.map((src, i) => (
            <button
              key={i}
              className={`lightbox-thumb ${i === index ? 'active' : ''}`}
              onClick={() => onJump(i)}
              aria-label={`切换到第 ${i + 1} 张`}
              aria-current={i === index}
            >
              <img src={src} alt={`缩略图 ${i + 1}`} draggable={false} loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  )
}
