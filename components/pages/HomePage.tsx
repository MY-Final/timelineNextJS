"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Heart, Settings, User } from "lucide-react";
import { isAdmin, isLoggedIn } from "@/lib/auth-role";
import ILoveYouDisplay from "@/components/easter-eggs/ILoveYouDisplay";
import {
  isAnniversary,
  useFloatingHearts,
  useILoveYou,
  useKonamiCode,
  useLongPress,
  useSecretClick,
} from "@/lib/easter-eggs";

const LOVE_START_DATE = new Date("2026-03-08T18:35:00");
const LOVE_START_DATE_LABEL = "2026年3月8日";
const PERSON_A = "阳阳";
const PERSON_B = "湘湘";

const avatarA = "https://q1.qlogo.cn/g?b=qq&nk=3486159271&s=640";
const avatarB = "https://q1.qlogo.cn/g?b=qq&nk=1789859045&s=640";

interface TimerValue {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function useLoveTimer(startDate: Date): TimerValue {
  const calc = useCallback((): TimerValue => {
    const diff = Math.max(0, Date.now() - startDate.getTime());
    const totalSeconds = Math.floor(diff / 1000);

    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };
  }, [startDate]);

  const [value, setValue] = useState<TimerValue>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    setValue(calc());
    const id = window.setInterval(() => setValue(calc()), 1000);
    return () => window.clearInterval(id);
  }, [calc]);

  return value;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  return (
    <div className="avatar-col">
      <div className="avatar-frame">
        <div className="avatar-img-wrap">
          {src ? (
            <img src={src} alt={`${name}的头像`} />
          ) : (
            <User className="avatar-placeholder-icon" size={44} strokeWidth={1.2} aria-hidden="true" />
          )}
        </div>
      </div>
      <span className="avatar-name-label">{name}</span>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { days, hours, minutes, seconds } = useLoveTimer(LOVE_START_DATE);
  const { hearts, spawn: spawnHearts } = useFloatingHearts(12);
  const { active: secretMode, click: handleSecretClick } = useSecretClick(10, 400);
  const { active: konamiMode, progress: konamiProgress, sequence: konamiSequence } = useKonamiCode();
  const {
    progress: holdProgress,
    active: loveMode,
    start: handleHeartHoldStart,
    end: handleHeartHoldEnd,
  } = useLongPress(2000);
  const { active: iLoveYouActive, stage: iLoveYouStage, inputProgress, target } = useILoveYou();
  const [anniversaryToday, setAnniversaryToday] = useState(false);
  const [showAdminEntry, setShowAdminEntry] = useState(false);

  useEffect(() => {
    setAnniversaryToday(isAnniversary(LOVE_START_DATE));
    setShowAdminEntry(isAdmin());
  }, []);

  function handleAdminClick() {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    if (isAdmin()) {
      router.push("/admin");
    }
    // 普通用户不跳转，按钮本身也不展示，此处为双重保险
  }

  return (
    <main
      className={`home-shell ${secretMode ? "secret-mode" : ""} ${
        anniversaryToday ? "anniversary" : ""
      } ${konamiMode ? "konami-mode" : ""} ${loveMode ? "love-mode" : ""} ${
        iLoveYouActive ? `ilove-you-stage-${iLoveYouStage}` : ""
      }`}
    >
      <div className="home-orb home-orb-1" aria-hidden="true" />
      <div className="home-orb home-orb-2" aria-hidden="true" />
      <div className="home-orb home-orb-3" aria-hidden="true" />

      <div className="home-top">
        <div className="date-badge">
          <div className="date-badge-line" />
          <p className="date-badge-text">Since {LOVE_START_DATE_LABEL}</p>
        </div>
      </div>

      <div className="home-center">
        <p className="home-title">our story</p>

        <div className="couple-section" role="img" aria-label="我们的头像">
          <Avatar src={avatarA} name={PERSON_A} />

          <div
            className="heart-bridge"
            aria-hidden="true"
            onClick={(e) => {
              e.stopPropagation();
              spawnHearts();
              handleSecretClick();
            }}
            onMouseDown={handleHeartHoldStart}
            onMouseUp={handleHeartHoldEnd}
            onMouseLeave={handleHeartHoldEnd}
            onTouchStart={handleHeartHoldStart}
            onTouchEnd={handleHeartHoldEnd}
          >
            <div className="bridge-line" />
            <Heart className="bridge-heart" size={30} fill="currentColor" strokeWidth={0} />
            <div className="bridge-line" />

            {holdProgress > 0 && (
              <div className="heart-hold-progress" style={{ width: `${holdProgress}%` }} />
            )}

            {hearts.map((heart) => (
              <span
                key={heart.id}
                className="floating-heart-fullscreen"
                style={{ left: `${heart.x}%`, animationDelay: `${heart.delay}s` }}
              >
                ❤
              </span>
            ))}
          </div>

          <Avatar src={avatarB} name={PERSON_B} />
        </div>

        <div className="days-display">
          <p className="days-eyebrow">在一起</p>
          <div className="days-num-row">
            <span className="days-num">{days}</span>
            <span className="days-unit">天</span>
          </div>
        </div>

        <div className="hms-row" aria-label={`${hours}小时${minutes}分钟${seconds}秒`}>
          <div className="hms-unit">
            <span className="hms-value">{pad(hours)}</span>
            <span className="hms-label">小时</span>
          </div>
          <span className="hms-sep" aria-hidden="true">
            :
          </span>
          <div className="hms-unit">
            <span className="hms-value">{pad(minutes)}</span>
            <span className="hms-label">分钟</span>
          </div>
          <span className="hms-sep" aria-hidden="true">
            :
          </span>
          <div className="hms-unit">
            <span className="hms-value">{pad(seconds)}</span>
            <span className="hms-label">秒</span>
          </div>
        </div>

        <Link href="/timeline" className="home-cta">
          <BookOpen size={15} strokeWidth={1.5} aria-hidden="true" />
          查看我们的故事
        </Link>
      </div>

      <div className="home-bottom">
        {konamiProgress > 0 && (
          <div className="konami-indicator">
            {konamiSequence.map((key, i) => (
              <span key={key + i} className={`konami-key ${i < konamiProgress ? "pressed" : ""}`}>
                {key.replace("Arrow", "")}
              </span>
            ))}
          </div>
        )}

        {inputProgress > 0 && (
          <div className="ilove-you-indicator">
            <span className="ilove-you-text">I Love You: </span>
            {target.split("").map((char, i) => {
              const targetChar = char === " " ? "\u00A0" : char;
              const isTyped = i < inputProgress;

              return (
                <span key={char + i} className={`ilove-you-char ${isTyped ? "typed" : ""}`}>
                  {targetChar}
                </span>
              );
            })}
          </div>
        )}

        <div className="bottom-tagline">
          <p className="bottom-tagline-text">每一天都值得被记住</p>
          <div className="bottom-tagline-line" />
        </div>
      </div>

      {iLoveYouStage === 4 && <ILoveYouDisplay />}

      {showAdminEntry && (
        <button className="home-admin-entry" title="控制台" onClick={handleAdminClick}>
          <Settings size={13} strokeWidth={1.8} aria-hidden="true" />
          控制台
        </button>
      )}
    </main>
  );
}
