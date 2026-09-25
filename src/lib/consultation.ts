/**
 * Shape and validation for the consultation form.
 *
 * Kept out of `app/actions.ts` because a `"use server"` module may only
 * export async functions — a constant exported from there arrives as
 * `undefined` on the client.
 */

export type ConsultationField = "name" | "phone" | "message";

export type ConsultationValues = Record<ConsultationField, string>;

export type ConsultationState = {
  status: "idle" | "success" | "error";
  /** Field-level messages, keyed by input name. */
  fieldErrors: Partial<Record<ConsultationField, string>>;
  /** Form-level message when the submission itself failed. */
  formError?: string;
  /** Echoed back so a failed submit never empties the fields. */
  values: ConsultationValues;
};

export const emptyValues: ConsultationValues = {
  name: "",
  phone: "",
  message: "",
};

export const initialConsultationState: ConsultationState = {
  status: "idle",
  fieldErrors: {},
  values: emptyValues,
};

/** Ukrainian mobile numbers, with or without the country prefix. */
const PHONE = /^(?:\+?38)?0\d{9}$/;

export function normalisePhone(input: string) {
  return input.replace(/[\s()-]/g, "");
}

/*
 * Hints are phrased as what to do, not what went wrong.
 *
 * One function per field, so the same rule runs in two places: in the browser
 * through each Base UI `Field.Root`'s `validate`, and again on the server in
 * the action, which never trusts the client. They return `null` when valid,
 * which is what `Field.Root` expects.
 */

export function validateName(value: string) {
  return value.trim().length < 2
    ? "Вкажіть ім’я — щонайменше 2 символи."
    : null;
}

export function validatePhone(value: string) {
  return PHONE.test(normalisePhone(value.trim()))
    ? null
    : "Вкажіть номер у форматі 0XX XXX XX XX.";
}

export function validateConsultation(values: ConsultationValues) {
  const fieldErrors: ConsultationState["fieldErrors"] = {};

  const name = validateName(values.name);
  if (name) fieldErrors.name = name;

  const phone = validatePhone(values.phone);
  if (phone) fieldErrors.phone = phone;

  return fieldErrors;
}
