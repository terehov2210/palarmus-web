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

/** Hints are phrased as what to do, not what went wrong. */
export function validateConsultation(values: ConsultationValues) {
  const fieldErrors: ConsultationState["fieldErrors"] = {};

  if (values.name.length < 2) {
    fieldErrors.name = "Вкажіть ім’я — щонайменше 2 символи.";
  }

  if (!PHONE.test(normalisePhone(values.phone))) {
    fieldErrors.phone = "Вкажіть номер у форматі 0XX XXX XX XX.";
  }

  return fieldErrors;
}
