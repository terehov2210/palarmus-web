"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Stagger within one semantic group. ~100ms reads as sequence, not lag. */
  delay?: number;
  className?: string;
  as?: ElementType;
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
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"idle" | "pending" | "shown">("idle");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Already on screen at mount: leave it be, no entrance on page load.
    if (node.getBoundingClientRect().top < window.innerHeight * 0.9) return;

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
      className={className}
      data-reveal={state === "idle" ? undefined : state}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
