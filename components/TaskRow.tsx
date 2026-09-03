"use client";

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import type { DerivedTask } from "@/lib/tasks";

type Size = "regular" | "compact";
type SwipeDirection = "pending" | "horizontal" | "vertical";

type SwipeGesture = {
  direction: SwipeDirection;
  pointerId: number;
  startOffset: number;
  startX: number;
  startY: number;
  width: number;
};

const SIZES = {
  regular: { gap: 17, padY: 15, padX: 8, icon: 25, iconBox: 32, name: 18.5, meta: 15, action: 38 },
  compact: { gap: 15, padY: 13, padX: 6, icon: 22, iconBox: 28, name: 17, meta: 14, action: 34 },
} as const;

const SWIPE_ACTION_WIDTH = 96;
const SWIPE_DIRECTION_THRESHOLD = 8;

/** A row's primary control always opens its timer; secondary controls never share that tap target. */
export function TaskRow({
  task,
  onDelete,
  onEdit,
  onOpen,
  onSwipeOpenChange,
  onToggle,
  size = "regular",
  swipeOpen = false,
}: {
  task: DerivedTask;
  onDelete?: (task: DerivedTask) => void;
  onEdit?: (task: DerivedTask) => void;
  /** タップの行き先を差し替える（明日タブはタイマーではなく編集を開く）。無指定なら従来どおりタイマーへ。 */
  onOpen?: (task: DerivedTask) => void;
  onSwipeOpenChange?: (open: boolean) => void;
  onToggle?: (id: string) => void;
  size?: Size;
  swipeOpen?: boolean;
}) {
  const router = useRouter();
  const rowRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<SwipeGesture | null>(null);
  const suppressClickRef = useRef(false);
  const swipeOffsetRef = useRef(swipeOpen ? -SWIPE_ACTION_WIDTH : 0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(swipeOpen ? -SWIPE_ACTION_WIDTH : 0);
  const s = SIZES[size];
  const swipeEnabled = onDelete !== undefined && onSwipeOpenChange !== undefined;

  useEffect(() => {
    if (gestureRef.current) return;

    const nextOffset = swipeOpen ? -SWIPE_ACTION_WIDTH : 0;
    swipeOffsetRef.current = nextOffset;
    setSwipeOffset(nextOffset);
  }, [swipeOpen]);

  function setOffset(nextOffset: number) {
    swipeOffsetRef.current = nextOffset;
    setSwipeOffset(nextOffset);
  }

  function openTask() {
    if (task.done) {
      onToggle?.(task.id);
      return;
    }

    if (onOpen) {
      onOpen(task);
      return;
    }

    router.push(`/screen-2?taskId=${encodeURIComponent(task.id)}`);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!swipeEnabled || event.button !== 0) return;

    const width = rowRef.current?.getBoundingClientRect().width ?? 0;
    gestureRef.current = {
      direction: "pending",
      pointerId: event.pointerId,
      startOffset: swipeOffsetRef.current,
      startX: event.clientX,
      startY: event.clientY,
      width,
    };
    suppressClickRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const horizontalDistance = event.clientX - gesture.startX;
    const verticalDistance = event.clientY - gesture.startY;

    if (gesture.direction === "pending") {
      const horizontalMagnitude = Math.abs(horizontalDistance);
      const verticalMagnitude = Math.abs(verticalDistance);
      if (horizontalMagnitude < SWIPE_DIRECTION_THRESHOLD && verticalMagnitude < SWIPE_DIRECTION_THRESHOLD) return;

      if (verticalMagnitude > horizontalMagnitude) {
        gesture.direction = "vertical";
        gestureRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        return;
      }

      gesture.direction = "horizontal";
      setIsDragging(true);
    }

    if (gesture.direction !== "horizontal") return;

    suppressClickRef.current = true;
    event.preventDefault();
    setOffset(Math.max(-gesture.width, Math.min(0, gesture.startOffset + horizontalDistance)));
  }

  function finishSwipe(event: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    gestureRef.current = null;
    setIsDragging(false);

    if (gesture.direction !== "horizontal") return;

    const openThreshold = Math.min(gesture.width * 0.4, 88);
    const shouldOpen = !cancelled && swipeOffsetRef.current <= -openThreshold;
    setOffset(shouldOpen ? -SWIPE_ACTION_WIDTH : 0);
    onSwipeOpenChange?.(shouldOpen);
  }

  function suppressDraggedClick(event: MouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }

  return (
    <div
      ref={rowRef}
      data-task-row
      style={{ borderRadius: 16, minWidth: 0, overflow: "hidden", position: "relative" }}
    >
      {swipeEnabled && (
        <button
          type="button"
          aria-hidden={!swipeOpen}
          aria-label={`${task.name}を削除`}
          onClick={() => {
            onSwipeOpenChange?.(false);
            onDelete?.(task);
          }}
          tabIndex={swipeOpen ? 0 : -1}
          style={{
            alignItems: "center",
            background: "#c0392b",
            border: "none",
            borderRadius: 16,
            color: "var(--bg)",
            cursor: "pointer",
            display: "flex",
            font: "inherit",
            fontSize: 14,
            fontWeight: 650,
            inset: 0,
            justifyContent: "flex-end",
            padding: `0 ${(SWIPE_ACTION_WIDTH - 32) / 2}px 0 0`,
            position: "absolute",
            textAlign: "center",
            width: "100%",
          }}
        >
          削除
        </button>
      )}

      <div
        data-swipe-surface
        onClickCapture={suppressDraggedClick}
        onPointerCancel={(event) => finishSwipe(event, true)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => finishSwipe(event, false)}
        style={{
          background: "var(--bg)",
          borderRadius: 16,
          position: "relative",
          touchAction: swipeEnabled ? "pan-y" : undefined,
          transform: `translateX(${swipeOffset}px)`,
          transition: isDragging ? "none" : "transform 220ms cubic-bezier(.22, 1, .36, 1)",
        }}
      >
        <div style={{ alignItems: "center", display: "flex", gap: 4, minWidth: 0, opacity: task.done ? 0.3 : 1 }}>
          <button
            type="button"
            onClick={openTask}
            style={{
              alignItems: "center",
              background: "transparent",
              border: "none",
              borderRadius: 16,
              color: "inherit",
              cursor: "pointer",
              display: "flex",
              flex: 1,
              font: "inherit",
              gap: s.gap,
              minWidth: 0,
              padding: `${s.padY}px ${s.padX}px`,
              textAlign: "left",
              transition: "background 160ms ease",
            }}
            onMouseEnter={(event) => {
              if (!task.done) event.currentTarget.style.background = "var(--hover)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "transparent";
            }}
          >
            <span
              style={{
                color: "var(--fg)",
                display: "flex",
                justifyContent: "center",
                width: s.iconBox,
              }}
            >
              <Icon name={task.icon} size={s.icon} fill={task.done ? 1 : 0} />
            </span>

            <span
              style={{
                flex: 1,
                fontSize: s.name,
                letterSpacing: ".01em",
                minWidth: 0,
                overflow: "hidden",
                textDecoration: task.done ? "line-through" : "none",
                textDecorationThickness: 1,
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {task.name}
            </span>

            <span
              style={{
                color: task.done ? "inherit" : "var(--accent)",
                fontSize: s.meta,
                opacity: task.done ? 1 : 0.85,
                whiteSpace: "nowrap",
              }}
            >
              {task.done ? "Fin" : task.minLabel}
            </span>
          </button>

          {onEdit && !task.done && (
            <button
              type="button"
              onClick={() => onEdit(task)}
              aria-label={`${task.name}を編集`}
              title="編集"
              style={{
                alignItems: "center",
                background: "transparent",
                border: "1px solid var(--fg-14)",
                borderRadius: "50%",
                color: "var(--fg-60)",
                cursor: "pointer",
                display: "flex",
                flex: "0 0 auto",
                height: s.action,
                justifyContent: "center",
                padding: 0,
                width: s.action,
              }}
            >
              <Icon name="edit" size={size === "regular" ? 19 : 17} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
