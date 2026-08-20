import { Quote } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { Section, SectionHeader } from "@/components/ui/section";
import { testimonials } from "@/content/trust";

export function Reviews() {
  return (
    <Section id="reviews" tone="surface" labelledBy="reviews-title">
      <SectionHeader
        eyebrow="Відгуки лікарів"
        titleId="reviews-title"
        title="Що кажуть хірурги, які оперують нашими системами"
        description="Відгуки збираємо після серії операцій, а не після першого замовлення — разом із напрямом, містом і клінікою."
      />

      {/* Stacks vertically on narrow viewports: a horizontal scroller here
          would hide cards behind an edge with nothing to reveal them. */}
      <ul className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {testimonials.map((testimonial, i) => (
          <Reveal
            as="li"
            key={testimonial.quote}
            delay={(i % 3) * 90}
            className="h-full"
          >
            <figure className="flex h-full flex-col gap-6 rounded-card border border-hairline bg-base p-6 lg:p-7">
              <Quote
                aria-hidden="true"
                size={22}
                strokeWidth={1.5}
                className="shrink-0 text-fg-accent"
              />

              <blockquote className="flex-1 text-body text-pretty text-fg-secondary">
                {testimonial.quote}
              </blockquote>

              <figcaption className="flex flex-col gap-0.5 border-t border-hairline pt-5">
                <p className="text-body-sm font-semibold text-fg">
                  {testimonial.author}
                </p>
                <p className="text-caption text-fg-muted">
                  {testimonial.role} · {testimonial.city}
                </p>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
