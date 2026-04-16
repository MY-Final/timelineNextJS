"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ImageLightbox } from "@/components/ui/common/ImageLightbox";
import eventsJson from "@/data/events.json";
import { getImagesByDate } from "@/lib/images";

interface TimelineEventData {
  id: number;
  date: string;
  title: string;
  description: string;
  location: string;
  images: string[];
  tags: string[];
}

const EVENTS: TimelineEventData[] = eventsJson.map((event) => ({
  ...event,
  images: getImagesByDate(event.date),
}));

const allTags = [...new Set(EVENTS.flatMap((event) => event.tags))];

function FloatingDots() {
  return (
    <div className="floating-dots" aria-hidden="true">
      <span className="dot dot-1" />
      <span className="dot dot-2" />
      <span className="dot dot-3" />
      <span className="dot dot-4" />
      <span className="dot dot-5" />
    </div>
  );
}

function PhotoCarousel({ images }: { images: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const count = images.length;

  useEffect(() => {
    if (count <= 1 || isHovered) return;

    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % count);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [count, isHovered]);

  if (count === 0) return null;

  return (
    <>
      <div
        className="tag-carousel"
        onClick={() => setLightboxIndex(currentIndex)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`照片 ${i + 1}`}
            className={`tag-carousel-image${i === currentIndex ? " active" : ""}`}
            loading="lazy"
            draggable={false}
            onError={(e) => e.currentTarget.classList.add("img-error")}
          />
        ))}
        {count > 1 && (
          <>
            <button
              className="tag-carousel-nav tag-carousel-prev"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((prev) => (prev - 1 + count) % count);
              }}
              aria-label="上一张"
            >
              ‹
            </button>
            <button
              className="tag-carousel-nav tag-carousel-next"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((prev) => (prev + 1) % count);
              }}
              aria-label="下一张"
            >
              ›
            </button>
            <div className="tag-carousel-indicators">
              {images.map((_, i) => (
                <button
                  key={i}
                  className={`tag-carousel-dot ${i === currentIndex ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(i);
                  }}
                  aria-label={`切换到照片 ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((lightboxIndex - 1 + count) % count)}
          onNext={() => setLightboxIndex((lightboxIndex + 1) % count)}
          onJump={(index) => setLightboxIndex(index)}
        />
      )}
    </>
  );
}

const TagChip = memo(function TagChip({
  tag,
  isSelected,
  onToggle,
}: {
  tag: string;
  isSelected: boolean;
  onToggle: (tag: string) => void;
}) {
  return (
    <motion.button
      className={`tag-chip ${isSelected ? "selected" : ""}`}
      onClick={() => onToggle(tag)}
      onTouchEnd={(e) => e.currentTarget.blur()}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.15 }}
    >
      {tag}
    </motion.button>
  );
});

const cardContainerVariants = {
  visible: {
    transition: { staggerChildren: 0.07 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

const EventCard = memo(function EventCard({ event }: { event: TimelineEventData }) {
  return (
    <motion.div
      className="tag-event-card"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      <div className="tag-event-photo">
        <PhotoCarousel images={event.images} />
      </div>

      <div className="tag-event-content">
        <div className="tag-event-date">
          <span>{event.date}</span>
        </div>

        <h3 className="tag-event-title font-serif-cn">{event.title}</h3>

        <p className="tag-event-description">{event.description}</p>

        <div className="tag-event-tags">
          {event.tags.map((tag) => (
            <span key={tag} className="tag-event-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
});

export default function TagPage() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filteredEvents = useMemo(() => {
    if (selectedTags.length === 0) return EVENTS;
    return EVENTS.filter((event) => selectedTags.some((tag) => event.tags.includes(tag)));
  }, [selectedTags]);

  return (
    <div className="tag-shell">
      <FloatingDots />

      <header className="tag-header">
        <Link href="/timeline" className="hero-nav-btn tag-back" aria-label="返回时间线">
          <ArrowLeft size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>TIMELINE</span>
        </Link>
      </header>

      <div className="tag-selection">
        <div className="tag-chips">
          {allTags.map((tag) => (
            <TagChip
              key={tag}
              tag={tag}
              isSelected={selectedTags.includes(tag)}
              onToggle={(nextTag) =>
                setSelectedTags((prev) =>
                  prev.includes(nextTag) ? prev.filter((tag) => tag !== nextTag) : [...prev, nextTag],
                )
              }
            />
          ))}
        </div>
      </div>

      <main className="tag-main">
        <AnimatePresence mode="popLayout">
          <motion.div
            className="tag-grid"
            layout
            variants={cardContainerVariants}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.3 }}
          >
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="tag-footer">
        <div className="tag-counter">
          <span>共 {filteredEvents.length} 个时刻</span>
        </div>
      </footer>
    </div>
  );
}
