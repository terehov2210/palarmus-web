import Image from "next/image";

import { Reveal } from "@/components/reveal";
import { Eyebrow } from "@/components/ui/section";
import { partners, type Partner } from "@/content/trust";

/**
 * A maker's logo in one ink colour. The originals are purple, grey and a
 * gradient, and two of them vanish on the dark theme; flattened to the text
 * colour they read the same in both themes and sit together as a set.
 */
export function PartnerLogo({
  partner,
  className,
}: {
  partner: Partner;
  className?: string;
}) {
  return (
    <Image
      src={partner.logo.src}
      alt={partner.name}
      width={partner.logo.width}
      height={partner.logo.height}
      unoptimized={partner.logo.src.endsWith(".svg")}
      className={`w-auto max-w-full self-start object-contain brightness-0 opacity-85 dark:invert ${className ?? ""}`}
    />
  );
}

export function Partners() {
  return (
    <section aria-labelledby="partners-title" className="bg-base py-16 lg:py-20">
      <div className="container-page">
        <Reveal className="flex flex-col gap-5">
          <Eyebrow>Виробники</Eyebrow>
          <h2 id="partners-title" className="max-w-[28ch] font-display text-[clamp(1.5rem,1.1rem+1.2vw,2rem)] leading-tight font-medium tracking-[-0.025em] text-balance text-fg">
            Працюємо напряму з виробниками систем
          </h2>
        </Reveal>

        <Reveal
          as="ul"
          delay={100}
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {partners.map((partner) => (
            <li
              key={partner.name}
              className="flex flex-col gap-5 rounded-card bg-surface p-7 ring-1 ring-inset ring-hairline"
            >
              <PartnerLogo partner={partner} className="h-9" />
              <p className="text-body-sm text-fg-muted">{partner.note}</p>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
