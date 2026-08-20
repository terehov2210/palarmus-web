/**
 * Lead delivery.
 *
 * INTEGRATION POINT — set `LEAD_WEBHOOK_URL` to the CRM or mail endpoint that
 * should receive consultation requests. Until it is set, `sendLead` throws
 * `LeadNotConfiguredError` and the form tells the visitor to phone instead,
 * rather than reporting a success that never happened.
 */

export type Lead = {
  name: string;
  phone: string;
  message: string;
};

export class LeadNotConfiguredError extends Error {
  constructor() {
    super("LEAD_WEBHOOK_URL is not set");
    this.name = "LeadNotConfiguredError";
  }
}

export async function sendLead(lead: Lead): Promise<void> {
  const endpoint = process.env.LEAD_WEBHOOK_URL;
  if (!endpoint) throw new LeadNotConfiguredError();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...lead, source: "homepage/consultation" }),
  });

  if (!response.ok) {
    throw new Error(`Lead endpoint responded ${response.status}`);
  }
}
