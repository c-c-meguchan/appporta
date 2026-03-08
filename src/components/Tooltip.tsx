'use client';

import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

type TooltipProps = {
  content: string;
  children: React.ReactElement;
  /** 表示位置（デフォルトは上） */
  placement?: 'top' | 'bottom';
};

const HOVER_DELAY_MS = 500;

export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [fadedIn, setFadedIn] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeInRafRef = useRef<{ outer: number; inner?: number } | null>(null);

  const clearShowTimeout = () => {
    if (showTimeoutRef.current != null) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
  };

  const scheduleShow = () => {
    clearShowTimeout();
    setExiting(false);
    showTimeoutRef.current = setTimeout(() => setVisible(true), HOVER_DELAY_MS);
  };

  const handleHide = () => {
    clearShowTimeout();
    if (visible) {
      setExiting(true);
      setVisible(false);
    }
  };

  useLayoutEffect(() => {
    return clearShowTimeout;
  }, []);

  useLayoutEffect(() => {
    if (visible) {
      setFadedIn(false);
      const outerId = requestAnimationFrame(() => {
        const innerId = requestAnimationFrame(() => setFadedIn(true));
        fadeInRafRef.current = { outer: outerId, inner: innerId };
      });
      fadeInRafRef.current = { outer: outerId };
      return () => {
        const rafs = fadeInRafRef.current;
        if (rafs) {
          cancelAnimationFrame(rafs.outer);
          if (rafs.inner != null) cancelAnimationFrame(rafs.inner);
          fadeInRafRef.current = null;
        }
      };
    } else {
      setFadedIn(false);
    }
  }, [visible]);

  useLayoutEffect(() => {
    if (!visible || !triggerRef.current || typeof document === 'undefined') return;
    const el = triggerRef.current;
    const rect = el.getBoundingClientRect();
    const gap = 6;
    setPosition({
      top:
        placement === 'top'
          ? rect.top - gap
          : rect.bottom + gap,
      left: rect.left + rect.width / 2,
    });
  }, [visible, placement]);

  const handleTransitionEnd = () => {
    if (exiting) setExiting(false);
  };

  const showTooltip = (visible || exiting) && content && typeof document !== 'undefined';
  const opacityClass = visible && !exiting && fadedIn ? 'opacity-100' : 'opacity-0';

  const tooltipEl =
    showTooltip
      ? createPortal(
          <span
            role="tooltip"
            onTransitionEnd={handleTransitionEnd}
            className={`fixed z-[100] whitespace-nowrap rounded px-2 py-1.5 text-xs font-medium text-white bg-zinc-800 shadow-lg transition-opacity duration-150 dark:bg-zinc-700 ${opacityClass}`}
            style={{
              top: position.top,
              left: position.left,
              transform: placement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            }}
          >
            {content}
          </span>,
          document.body
        )
      : null;

  return (
    <>
      <span
        ref={triggerRef}
        className="relative inline-flex"
        onMouseEnter={scheduleShow}
        onMouseLeave={handleHide}
        onFocusCapture={scheduleShow}
        onBlurCapture={handleHide}
      >
        {children}
      </span>
      {tooltipEl}
    </>
  );
}
