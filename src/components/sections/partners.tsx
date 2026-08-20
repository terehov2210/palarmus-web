import { Reveal } from "@/components/reveal";
import { Eyebrow } from "@/components/ui/section";
import { partners } from "@/content/trust";

export function Partners() {
  return (
    <section aria-labelledby="partners-title" className="bg-base py-16 lg:py-20">
      <div className="container-page">
        <Reveal className="flex flex-col gap-4">
          <Eyebrow>Виробники</Eyebrow>
          <h2 id="partners-title" className="max-w-[28ch] text-h3 text-fg">
            Працюємо напряму з виробниками систем
          </h2>
        </Reveal>

        <Reveal
          as="ul"
          delay={100}
          className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {partners.map((partner) => (
            <li
              key={partner.name}
              className="flex flex-col gap-1 border-t border-hairline pt-5"
            >
              <p className="text-h3 text-fg">{partner.name}</p>
              <p className="text-body-sm text-fg-muted">{partner.note}</p>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
