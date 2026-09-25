"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { AlertCircle, CheckCircle2, Loader2, Mail, MapPin, Phone } from "lucide-react";

import { submitConsultation } from "@/app/actions";
import {
  initialConsultationState,
  validateName,
  validatePhone,
} from "@/lib/consultation";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section";
import { site } from "@/content/site";

/** The perimeter turns red off Base UI's `data-invalid` on the control. */
const control = [
  "w-full rounded-control border border-hairline-strong bg-surface px-4 py-3.5",
  "text-body text-fg placeholder:text-fg-muted",
  "transition-[border-color,background-color,box-shadow] duration-fast ease-out-quint",
  "hover:border-control-line focus:border-fg focus:bg-base focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-fg)_8%,transparent)]",
  "data-invalid:border-error-line",
].join(" ");

const label = "text-body-sm font-medium text-fg";

/** Icon + message, never colour alone — the brand accent is red too. */
const error =
  "field-error-icon flex items-center gap-2 text-caption text-error";

/**
 * Base UI Form + Field.
 *
 * Each field validates in the browser with the same rule the server action
 * runs (`src/lib/consultation.ts`), so a mistake is flagged on submit without
 * a round trip, and re-checked on every keystroke after that. The server still
 * validates independently; whatever it returns goes back in through Form's
 * `errors`, keyed by field name, and lands in the same `Field.Error` slot.
 *
 * Without JavaScript this is still a plain `<form>` posting to a server
 * action, so it degrades to server-side validation only.
 */
export function Consultation() {
  const [state, formAction, isPending] = useActionState(
    submitConsultation,
    initialConsultationState,
  );

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  // Base UI focuses the first invalid field after its own validation. This
  // covers the other route: errors only the server found.
  useEffect(() => {
    if (state.status !== "error") return;
    if (state.fieldErrors.name) nameRef.current?.focus();
    else if (state.fieldErrors.phone) phoneRef.current?.focus();
  }, [state]);

  return (
    <section
      id="consultation"
      aria-labelledby="consultation-title"
      className="relative isolate overflow-hidden bg-surface py-20 lg:py-36"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 end-[-10%] h-[32rem] w-[44rem] rounded-full bg-[radial-gradient(closest-side,rgb(199_0_11/0.10),transparent)] blur-2xl"
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

          <ul className="mt-2 flex flex-col gap-1 rounded-card bg-base/60 p-3 ring-1 ring-inset ring-hairline">
            <li>
              <a
                href={site.phone.href}
                className="flex min-h-12 items-center gap-3 rounded-control px-3 text-body font-semibold text-fg transition-[background-color,color] duration-fast ease-out-quint hover:bg-surface hover:text-fg-accent"
              >
                <Phone aria-hidden="true" size={18} strokeWidth={2} />
                {site.phone.label}
              </a>
            </li>
            <li>
              <a
                href={site.email.href}
                className="flex min-h-12 items-center gap-3 rounded-control px-3 text-body text-fg-secondary transition-[background-color,color] duration-fast ease-out-quint hover:bg-surface hover:text-fg"
              >
                <Mail aria-hidden="true" size={18} strokeWidth={1.5} />
                {site.email.label}
              </a>
            </li>
            <li className="flex items-start gap-3 px-3 py-3 text-body text-fg-secondary">
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
          {/* Keyed on what the server echoed back. The fields are
              uncontrolled, and Base UI (rightly) refuses a `defaultValue`
              that changes under a mounted control, so a new echo remounts
              the form with fresh defaults instead: kept values after an
              error, empty fields after a success. */}
          <Form
            key={`${state.status}:${state.values.name}\u0000${state.values.phone}\u0000${state.values.message}`}
            action={formAction}
            errors={state.fieldErrors}
            aria-labelledby="consultation-title"
            aria-busy={isPending}
            noValidate
            className="flex flex-col gap-5 rounded-card bg-base p-6 shadow-float ring-1 ring-inset ring-hairline lg:p-9"
          >
            {/* Stable region, rendered before its text updates, so repeated
                submissions announce reliably. */}
            <p role="status" aria-live="polite" className="sr-only">
              {state.status === "success"
                ? "Заявку надіслано. Ми зателефонуємо протягом робочого дня."
                : ""}
            </p>

            {state.status === "success" ? (
              <p className="enter-notice flex items-start gap-3 rounded-control bg-success-tint px-4 py-3 text-body-sm text-fg">
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
                className="enter-notice flex items-start gap-3 rounded-control bg-error-tint px-4 py-3 text-body-sm text-fg"
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

            <Field.Root
              name="name"
              validate={(value) => validateName(String(value ?? ""))}
              className="flex flex-col gap-2"
            >
              <Field.Label className={label}>Ім’я</Field.Label>
              <Field.Control
                ref={nameRef}
                type="text"
                autoComplete="name"
                defaultValue={state.values.name}
                className={control}
              />
              <Field.Error className={error} />
            </Field.Root>

            <Field.Root
              name="phone"
              validate={(value) => validatePhone(String(value ?? ""))}
              className="group flex flex-col gap-2"
            >
              <Field.Label className={label}>Телефон</Field.Label>
              <Field.Control
                ref={phoneRef}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="067 123 45 67"
                defaultValue={state.values.phone}
                className={control}
              />
              {/* The hint gives way to the error rather than stacking under
                  it: they are about the same thing. */}
              <Field.Description className="text-caption text-fg-muted group-data-invalid:hidden">
                Український мобільний номер, з кодом оператора.
              </Field.Description>
              <Field.Error className={error} />
            </Field.Root>

            <Field.Root name="message" className="flex flex-col gap-2">
              <Field.Label className={label}>
                Що потрібно підібрати
                <span className="font-normal text-fg-muted">
                  {" "}— необов’язково
                </span>
              </Field.Label>
              <Field.Control
                render={<textarea rows={4} />}
                defaultValue={state.values.message}
                className={`${control} min-h-32 resize-y`}
              />
            </Field.Root>

            <Button
              type="submit"
              size="lg"
              disabled={isPending}
              focusableWhenDisabled
              className="mt-1"
            >
              {isPending ? (
                <Loader2
                  aria-hidden="true"
                  size={18}
                  strokeWidth={2}
                  className="animate-spin"
                />
              ) : null}
              Надіслати заявку
            </Button>

            <p className="text-caption text-fg-muted">
              Телефонуємо в робочий час. Контакти не передаємо третім сторонам.
            </p>
          </Form>
        </Reveal>
      </div>
    </section>
  );
}
