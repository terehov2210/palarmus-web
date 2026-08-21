"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Stagger within one semantic group. ~100ms reads as sequence, not lag. */
  delay?: number;
  className?: string;
  as?: ElementType;
  /** Anchor target, so a deep link can address the revealed block itself. */
  id?: string;
};

/**
 * Staggered entrance for infrequent, scroll-triggered content.
 *
 * Content is rendered visible. The hidden state is only ever applied by this
 * effect, and only to elements still below the fold, so nothing can be hidden
 * by a failed script, and nothing above the fold animates on first paint.
 * The crossfade fallback under `prefers-reduced-motion` lives in globals.css.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
  id,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"idle" | "pending" | "shown">("idle");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Already on screen at mount: leave it be, no entrance on page load.
    //
    // The boundary is the viewport edge, not a fraction of it. The observer's
    // root stops 12% short of the bottom, so hiding anything past 90% opened a
    // gap: an element starting inside that band was hidden, yet sat above the
    // observer's root bottom and could only be recovered by scrolling. When
    // the page already fits the viewport there is nothing to scroll and it
    // stayed hidden for good. Hiding only what is genuinely below the fold
    // keeps that gap closed, since anything below the fold can always be
    // scrolled to.
    if (node.getBoundingClientRect().top < window.innerHeight) return;

    setState("pending");

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setState("shown");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      id={id}
      className={className}
      data-reveal={state === "idle" ? undefined : state}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
