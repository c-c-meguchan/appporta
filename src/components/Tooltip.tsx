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
const GAP = 6;
const PADDING = 8;

export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [fadedIn, setFadedIn] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeInRafRef = useRef<{ outer: number; inner?: number } | null>(null);
  const positionRafRef = useRef<number | null>(null);

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
    if (positionRafRef.current != null) {
      cancelAnimationFrame(positionRafRef.current);
      positionRafRef.current = null;
    }
    if (visible) {
      setExiting(true);
      setVisible(false);
      setPosition(null);
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

  const updatePosition = useRef(() => {
    const trigger = triggerRef.current;
    const tooltipEl = tooltipRef.current;
    if (!trigger || typeof document === 'undefined') return;

    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = placement === 'top' ? rect.top - GAP : rect.bottom + GAP;
    let left = rect.left + rect.width / 2;

    if (placement === 'top' && top < PADDING) {
      top = rect.bottom + GAP;
    } else if (placement === 'bottom' && top > vh - PADDING) {
      top = rect.top - GAP;
    }
    top = Math.max(PADDING, Math.min(vh - PADDING, top));
    left = Math.max(PADDING, Math.min(vw - PADDING, left));

    if (tooltipEl) {
      const tr = tooltipEl.getBoundingClientRect();
      const tw = tr.width;
      const th = tr.height;
      left = Math.max(PADDING + tw / 2, Math.min(vw - PADDING - tw / 2, left));
      if (placement === 'top') {
        top = Math.max(PADDING + th, Math.min(vh - PADDING, top));
      } else {
        top = Math.max(PADDING, Math.min(vh - PADDING - th, top));
      }
    }

    setPosition({ top, left });
  });

  useLayoutEffect(() => {
    if (!visible) return;
    const trigger = triggerRef.current;
    if (!trigger || typeof document === 'undefined') return;

    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = placement === 'top' ? rect.top - GAP : rect.bottom + GAP;
    let left = rect.left + rect.width / 2;
    if (placement === 'top' && top < PADDING) top = rect.bottom + GAP;
    else if (placement === 'bottom' && top > vh - PADDING) top = rect.top - GAP;
    top = Math.max(PADDING, Math.min(vh - PADDING, top));
    left = Math.max(PADDING, Math.min(vw - PADDING, left));

    setPosition({ top, left });

    positionRafRef.current = requestAnimationFrame(() => {
      positionRafRef.current = null;
      updatePosition.current();
    });
    return () => {
      if (positionRafRef.current != null) {
        cancelAnimationFrame(positionRafRef.current);
        positionRafRef.current = null;
      }
    };
  }, [visible, placement]);

  const handleTransitionEnd = () => {
    if (exiting) setExiting(false);
  };

  const showTooltip = (visible || exiting) && content && typeof document !== 'undefined' && position !== null;
  const opacityClass = visible && !exiting && fadedIn ? 'opacity-100' : 'opacity-0';

  const tooltipEl =
    showTooltip && position
      ? createPortal(
          <span
            ref={tooltipRef}
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
