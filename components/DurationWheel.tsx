"use client";

import { useEffect, useRef, useState } from "react";

type DurationWheelProps = {
  valueMin: number;
  onChange: (min: number) => void;
};

const HOURS = Array.from({ length: 9 }, (_, i) => i); // 0..8
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0..59（1分刻み）
const ITEM_HEIGHT = 40;
const VISIBLE_ROWS = 5;
const PAD_ROWS = 2; // 上下2行分の余白で先頭・末尾も中央に来られるようにする

export function DurationWheel({ valueMin, onChange }: DurationWheelProps) {
  const initialMin = valueMin < 5 ? 5 : valueMin;
  const [hours, setHours] = useState(Math.floor(initialMin / 60));
  const [minutes, setMinutes] = useState(initialMin % 60);

  useEffect(() => {
    const m = valueMin < 5 ? 5 : valueMin;
    setHours(Math.floor(m / 60));
    setMinutes(m % 60);
  }, [valueMin]);

  return (
    <div style={{ alignItems: "center", display: "flex", gap: 6, justifyContent: "center" }}>
      <WheelColumn
        label="時間"
        values={HOURS}
        selected={hours}
        onSelect={(h) => {
          const clamped = h === 0 && minutes === 0 ? 5 : h * 60 + minutes;
          if (h === 0 && minutes === 0) {
            setHours(0);
            setMinutes(5);
          } else {
            setHours(h);
          }
          onChange(clamped);
        }}
        formatValue={(v) => String(v)}
      />
      <span style={unitLabelStyle}>{"時間"}</span>
      <WheelColumn
        label="分"
        values={MINUTES}
        selected={minutes}
        onSelect={(m) => {
          const clamped = hours === 0 && m === 0 ? 5 : hours * 60 + m;
          if (hours === 0 && m === 0) {
            setHours(0);
            setMinutes(5);
          } else {
            setMinutes(m);
          }
          onChange(clamped);
        }}
        formatValue={(v) => String(v)}
      />
      <span style={unitLabelStyle}>{"分"}</span>
    </div>
  );
}

// 単位は数字の直後に置く。列と列の間にまとめると「時間」「分」がどちらの
// 数字に掛かるのか読み取れない。中央の行と同じ高さに揃える。
const unitLabelStyle = {
  color: "var(--fg-50)",
  fontSize: 14,
  fontWeight: 600,
  marginLeft: -4,
} as const;

type WheelColumnProps = {
  label: string;
  values: number[];
  selected: number;
  onSelect: (value: number) => void;
  formatValue: (value: number) => string;
};

function WheelColumn({ label, values, selected, onSelect, formatValue }: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 追従スクロール中だけ値の読み取りを止める。列ごとに持たないと、片方の
  // 追従がもう片方の指の操作まで黙らせてしまう。
  const suppressRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const index = values.indexOf(selected);
    if (index < 0) return;
    const targetTop = index * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - targetTop) < 1) return;
    suppressRef.current = true;
    // scroll-behavior: smoothを有効にしたままscrollTopへ直接代入すると、
    // ブラウザがアニメーション扱いにしてしまい、コンポジット（描画合成）が
    // 走らない状況（バックグラウンドタブ等）では代入が一切反映されないまま
    // scrollTopが0に固定される。scroll-snap-typeも道連れで再計算を後回しに
    // することがあるため、両方を一時的に外して即座にジャンプさせ、
    // 描画が済んだ次フレームで元に戻す。
    const previousBehavior = el.style.scrollBehavior;
    const previousSnap = el.style.scrollSnapType;
    el.style.scrollBehavior = "auto";
    el.style.scrollSnapType = "none";
    el.scrollTop = targetTop;
    const restoreFrame = requestAnimationFrame(() => {
      el.style.scrollBehavior = previousBehavior;
      el.style.scrollSnapType = previousSnap;
    });
    // scrollイベントが発火し切るまでガードを維持する
    const release = setTimeout(() => {
      suppressRef.current = false;
    }, 150);
    // 解除前に再実行されると、タイマーだけ消えてフラグが立ちっぱなしになり、
    // 以降スクロールしても値が変わらなくなる。片付け時に必ず倒す。
    return () => {
      cancelAnimationFrame(restoreFrame);
      el.style.scrollBehavior = previousBehavior;
      el.style.scrollSnapType = previousSnap;
      clearTimeout(release);
      suppressRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, values]);

  const handleScroll = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (suppressRef.current) return;
      const el = containerRef.current;
      if (!el) return;
      const index = Math.round(el.scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(values.length - 1, index));
      const value = values[clampedIndex];
      if (value !== selected) {
        onSelect(value);
      }
    }, 120);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = values.indexOf(selected);
    if (event.key === "ArrowUp" && index > 0) {
      event.preventDefault();
      onSelect(values[index - 1]);
    } else if (event.key === "ArrowDown" && index < values.length - 1) {
      event.preventDefault();
      onSelect(values[index + 1]);
    }
  };

  return (
    <div style={{ height: ITEM_HEIGHT * VISIBLE_ROWS, position: "relative", width: 56 }}>
      {/*
        中央帯は「スクロールコンテナの中のsticky子要素」にすると、
        scroll-snap-type: y mandatoryと干渉してscrollTopの代入自体が
        無視される（＝スクロールが一切効かなくなる）ことがある。
        そのためスクロールコンテナの外の兄弟要素として絶対配置する。
      */}
      <div
        aria-hidden="true"
        style={{
          background: "var(--hover)",
          borderRadius: 8,
          height: ITEM_HEIGHT,
          left: 4,
          pointerEvents: "none",
          position: "absolute",
          right: 4,
          top: ITEM_HEIGHT * PAD_ROWS,
          zIndex: 0,
        }}
      />
      <div
        ref={containerRef}
        role="listbox"
        aria-label={label}
        tabIndex={0}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        style={{
          WebkitOverflowScrolling: "touch",
          height: "100%",
          overflowY: "auto",
          position: "relative",
          scrollBehavior: "smooth",
          scrollSnapType: "y mandatory",
          width: "100%",
        }}
        className="duration-wheel-column"
      >
        <style>{`
          .duration-wheel-column {
            scrollbar-width: none;
          }
          .duration-wheel-column::-webkit-scrollbar {
            display: none;
          }
          @media (prefers-reduced-motion: reduce) {
            .duration-wheel-column {
              scroll-behavior: auto;
            }
          }
        `}</style>
        <div style={{ height: ITEM_HEIGHT * PAD_ROWS }} />
        {values.map((value) => {
          const isSelected = value === selected;
          return (
            <div
              key={value}
              role="option"
              aria-selected={isSelected}
              style={{
                alignItems: "center",
                color: isSelected ? "var(--fg)" : "var(--fg-42)",
                display: "flex",
                fontSize: 18,
                fontWeight: isSelected ? 700 : 500,
                height: ITEM_HEIGHT,
                justifyContent: "center",
                position: "relative",
                scrollSnapAlign: "center",
                zIndex: 1,
              }}
            >
              {formatValue(value)}
            </div>
          );
        })}
        <div style={{ height: ITEM_HEIGHT * PAD_ROWS }} />
      </div>
    </div>
  );
}
