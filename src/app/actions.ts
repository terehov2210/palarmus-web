"use server";

import {
  emptyValues,
  normalisePhone,
  validateConsultation,
  type ConsultationState,
} from "@/lib/consultation";
import { LeadNotConfiguredError, sendLead } from "@/lib/leads";
import { site } from "@/content/site";

export async function submitConsultation(
  _previous: ConsultationState,
  formData: FormData,
): Promise<ConsultationState> {
  const values = {
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
  };

  const fieldErrors = validateConsultation(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
  }

  try {
    await sendLead({ ...values, phone: normalisePhone(values.phone) });
  } catch (error) {
    // Every failure names a way to reach us that does not depend on the form.
    const formError =
      error instanceof LeadNotConfiguredError
        ? `Форма ще не підключена до системи заявок. Зателефонуйте нам: ${site.phone.label}.`
        : `Не вдалося надіслати заявку. Спробуйте ще раз або зателефонуйте: ${site.phone.label}.`;

    return { status: "error", fieldErrors: {}, formError, values };
  }

  return { status: "success", fieldErrors: {}, values: emptyValues };
}
