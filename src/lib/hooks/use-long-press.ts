"use client";

import { useCallback, useRef } from "react";

interface UseLongPressOptions {
  onLongPress: () => void;
  delay?: number;
  disabled?: boolean;
}

export function useLongPress({ onLongPress, delay = 500, disabled = false }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      // Only start long-press on left mouse button (or touch)
      if ("button" in e && e.button !== 0) return;
      isLongPressRef.current = false;
      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        onLongPress();
      }, delay);
    },
    [onLongPress, delay, disabled]
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      // If long press was triggered, prevent the click
      if (isLongPressRef.current) {
        e.preventDefault();
        e.stopPropagation();
        isLongPressRef.current = false;
      }
    },
    []
  );

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
    onClickCapture: onClick,
  };
}
