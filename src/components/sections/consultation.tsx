"use client";

import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, Loader2, Mail, MapPin, Phone } from "lucide-react";

import { submitConsultation } from "@/app/actions";
import { initialConsultationState } from "@/lib/consultation";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section";
import { site } from "@/content/site";

const fieldBase = [
  "w-full rounded-control border bg-base px-4 py-3",
  "text-body text-fg placeholder:text-fg-muted",
  "transition-[border-color] duration-fast ease-out-quint",
].join(" ");

export function Consultation() {
  const [state, formAction, isPending] = useActionState(
    submitConsultation,
    initialConsultationState,
  );

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  // Validation runs on submit, then focus lands on the first field that failed.
  useEffect(() => {
    if (state.status !== "error") return;
    if (state.fieldErrors.name) nameRef.current?.focus();
    else if (state.fieldErrors.phone) phoneRef.current?.focus();
  }, [state]);

  return (
    <section
      id="consultation"
      aria-labelledby="consultation-title"
      className="relative isolate overflow-hidden bg-base py-20 lg:py-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 blueprint-grid opacity-40 [mask-image:radial-gradient(100%_80%_at_100%_100%,black,transparent_70%)]"
      />

      <div className="container-page relative grid gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal className="flex flex-col gap-6">
          <Eyebrow>Консультація</Eyebrow>
          <h2
            id="consultation-title"
            className="max-w-[20ch] text-h2 text-balance text-fg"
          >
            Підберемо систему під конкретний випадок
          </h2>
          <p className="max-w-[52ch] text-lede text-pretty text-fg-secondary">
            Опишіть клінічний випадок або назвіть позицію — інженер разом із
            представником у вашому місті підбере набір і назве строк доставки.
          </p>

          <ul className="mt-2 flex flex-col gap-4 border-t border-hairline pt-6">
            <li>
              <a
                href={site.phone.href}
                className="inline-flex min-h-11 items-center gap-3 text-body font-semibold text-fg transition-[color] duration-fast ease-out-quint hover:text-fg-accent"
              >
                <Phone aria-hidden="true" size={18} strokeWidth={2} />
                {site.phone.label}
              </a>
            </li>
            <li>
              <a
                href={site.email.href}
                className="inline-flex min-h-11 items-center gap-3 text-body text-fg-secondary transition-[color] duration-fast ease-out-quint hover:text-fg"
              >
                <Mail aria-hidden="true" size={18} strokeWidth={1.5} />
                {site.email.label}
              </a>
            </li>
            <li className="flex items-start gap-3 text-body text-fg-secondary">
              <MapPin
                aria-hidden="true"
                size={18}
                strokeWidth={1.5}
                className="mt-1 shrink-0"
              />
              {site.address.label}
            </li>
          </ul>
        </Reveal>

        <Reveal delay={120}>
          <form
            action={formAction}
            aria-labelledby="consultation-title"
            aria-busy={isPending}
            noValidate
            className="flex flex-col gap-5 rounded-card border border-hairline bg-surface p-6 lg:p-8"
          >
            {/* Stable region, rendered before its text updates, so repeated
                submissions announce reliably. */}
            <p role="status" aria-live="polite" className="sr-only">
              {state.status === "success"
                ? "Заявку надіслано. Ми зателефонуємо протягом робочого дня."
                : ""}
            </p>

            {state.status === "success" ? (
              <p className="flex items-start gap-3 rounded-control bg-success-tint px-4 py-3 text-body-sm text-fg">
                <CheckCircle2
                  aria-hidden="true"
                  size={18}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 text-success"
                />
                Заявку надіслано. Ми зателефонуємо протягом робочого дня.
              </p>
            ) : null}

            {state.formError ? (
              <p
                role="alert"
                className="flex items-start gap-3 rounded-control bg-error-tint px-4 py-3 text-body-sm text-fg"
              >
                <AlertCircle
                  aria-hidden="true"
                  size={18}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 text-error"
                />
                {state.formError}
              </p>
            ) : null}

            <div className="flex flex-col gap-2">
              <label htmlFor="lead-name" className="text-body-sm font-medium text-fg">
                Ім’я
              </label>
              <input
                ref={nameRef}
                id="lead-name"
                name="name"
                type="text"
                autoComplete="name"
                defaultValue={state.values.name}
                aria-invalid={state.fieldErrors.name ? true : undefined}
                aria-describedby={state.fieldErrors.name ? "lead-name-error" : undefined}
                className={`${fieldBase} ${
                  state.fieldErrors.name ? "border-error-line" : "border-control-line"
                }`}
              />
              {state.fieldErrors.name ? (
                <p
                  id="lead-name-error"
                  className="flex items-center gap-2 text-caption text-error"
                >
                  <AlertCircle aria-hidden="true" size={14} strokeWidth={2} />
                  {state.fieldErrors.name}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="lead-phone" className="text-body-sm font-medium text-fg">
                Телефон
              </label>
              <input
                ref={phoneRef}
                id="lead-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="067 123 45 67"
                defaultValue={state.values.phone}
                aria-invalid={state.fieldErrors.phone ? true : undefined}
                aria-describedby={
                  state.fieldErrors.phone ? "lead-phone-error" : "lead-phone-hint"
                }
                className={`${fieldBase} ${
                  state.fieldErrors.phone ? "border-error-line" : "border-control-line"
                }`}
              />
              {state.fieldErrors.phone ? (
                <p
                  id="lead-phone-error"
                  className="flex items-center gap-2 text-caption text-error"
                >
                  <AlertCircle aria-hidden="true" size={14} strokeWidth={2} />
                  {state.fieldErrors.phone}
                </p>
              ) : (
                <p id="lead-phone-hint" className="text-caption text-fg-muted">
                  Український мобільний номер, з кодом оператора.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="lead-message"
                className="text-body-sm font-medium text-fg"
              >
                Що потрібно підібрати
                <span className="font-normal text-fg-muted">
                  {" "}— необов’язково
                </span>
              </label>
              <textarea
                id="lead-message"
                name="message"
                rows={4}
                defaultValue={state.values.message}
                className={`${fieldBase} min-h-32 resize-y border-control-line`}
              />
            </div>

            <Button type="submit" size="lg" disabled={isPending} className="mt-1">
              {isPending ? (
                <Loader2 aria-hidden="true" size={18} strokeWidth={2} className="animate-spin" />
              ) : null}
              Надіслати заявку
            </Button>

            <p className="text-caption text-fg-muted">
              Телефонуємо в робочий час. Контакти не передаємо третім сторонам.
            </p>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
