"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A closed set of tags rather than `ElementType`.
 *
 * `@react-three/fiber` augments the global JSX namespace with every three.js
 * element, and against that union a generic tag resolves its spread props to
 * `never`. These are the tags this component is actually rendered as.
 */
type RevealTag = "div" | "span" | "section" | "ul" | "ol" | "li" | "dl";

type RevealProps = {
  children: ReactNode;
  /** Stagger within one semantic group. ~100ms reads as sequence, not lag. */
  delay?: number;
  className?: string;
  as?: RevealTag;
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
  as = "div",
  id,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
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

  // Narrowed to one concrete tag for typing only. A union of HTML tags
  // intersects their ref types into something nothing can satisfy, and React
  // renders whichever tag string it is handed.
  const Tag = as as "div";

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
