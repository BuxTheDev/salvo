import "server-only";

/**
 * GoHighLevel API v2 (LeadConnector) client — §8.2.
 *
 * This is a thin, dependency-free wrapper kept server-only so the Private
 * Integration token never reaches the browser. It implements the four-step
 * push contract: upsert contact -> tag -> create opportunity -> trigger
 * workflow, with 429 backoff.
 */

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

export interface GhlAuth {
  accessToken: string;
  locationId: string;
}

export interface GhlContactPayload {
  name?: string;
  email?: string;
  phone?: string;
  tags: string[];
  customFields: Record<string, string>; // merge-tag -> GHL custom field ID already resolved by caller
}

export interface GhlPushResult {
  contactId: string;
  opportunityId?: string;
}

async function ghlFetch(auth: GhlAuth, path: string, init: RequestInit, attempt = 1): Promise<Response> {
  const res = await fetch(`${GHL_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      Version: GHL_API_VERSION,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 429 && attempt <= 4) {
    const retryAfter = Number(res.headers.get("Retry-After")) || 2 ** attempt;
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return ghlFetch(auth, path, init, attempt + 1);
  }

  return res;
}

/** Step 1 — upsert contact with custom fields. */
export async function upsertContact(auth: GhlAuth, payload: GhlContactPayload): Promise<string> {
  const [firstName, ...rest] = (payload.name ?? "").split(" ");
  const res = await ghlFetch(auth, "/contacts/upsert", {
    method: "POST",
    body: JSON.stringify({
      locationId: auth.locationId,
      firstName: firstName || undefined,
      lastName: rest.join(" ") || undefined,
      email: payload.email,
      phone: payload.phone,
      tags: payload.tags,
      customFields: Object.entries(payload.customFields).map(([id, value]) => ({ id, field_value: value })),
    }),
  });

  if (!res.ok) throw new Error(`GHL upsertContact failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.contact?.id ?? data.id;
}

/** Step 2 — tag the contact (Salvo, mode tags). Tags are set directly on upsert above; kept separate for the queue API below. */
export async function tagContact(auth: GhlAuth, contactId: string, tags: string[]): Promise<void> {
  const res = await ghlFetch(auth, `/contacts/${contactId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) throw new Error(`GHL tagContact failed: ${res.status} ${await res.text()}`);
}

/** Step 3 — create an opportunity in the acquisitions pipeline at "Offer Ready". */
export async function createOpportunity(
  auth: GhlAuth,
  args: { contactId: string; pipelineId: string; stageId: string; name: string; monetaryValue?: number },
): Promise<string> {
  const res = await ghlFetch(auth, "/opportunities/", {
    method: "POST",
    body: JSON.stringify({
      locationId: auth.locationId,
      contactId: args.contactId,
      pipelineId: args.pipelineId,
      pipelineStageId: args.stageId,
      name: args.name,
      monetaryValue: args.monetaryValue,
      status: "open",
    }),
  });
  if (!res.ok) throw new Error(`GHL createOpportunity failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.opportunity?.id ?? data.id;
}

/** Step 4 — add the contact to the "Offer Ready" workflow. */
export async function triggerWorkflow(auth: GhlAuth, contactId: string, workflowId: string): Promise<void> {
  const res = await ghlFetch(auth, `/contacts/${contactId}/workflow/${workflowId}`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`GHL triggerWorkflow failed: ${res.status} ${await res.text()}`);
}

export interface GhlPushArgs {
  auth: GhlAuth;
  payload: GhlContactPayload;
  pipelineId: string;
  stageId: string;
  workflowId?: string;
  opportunityName: string;
  monetaryValue?: number;
}

/** Full push contract for one property: upsert -> tag -> opportunity -> workflow. */
export async function pushOffer(args: GhlPushArgs): Promise<GhlPushResult> {
  const contactId = await upsertContact(args.auth, args.payload);
  await tagContact(args.auth, contactId, args.payload.tags);
  const opportunityId = await createOpportunity(args.auth, {
    contactId,
    pipelineId: args.pipelineId,
    stageId: args.stageId,
    name: args.opportunityName,
    monetaryValue: args.monetaryValue,
  });
  if (args.workflowId) await triggerWorkflow(args.auth, contactId, args.workflowId);
  return { contactId, opportunityId };
}

/**
 * Queue + backoff for batch pushes. Runs sequentially with a small delay
 * between calls to stay under GHL's rate limits; 429s are retried inside
 * `ghlFetch` above. Callers should filter out suppressed contacts before
 * calling this (see `lib/engine/modes#isSuppressed`).
 */
export async function pushOffersQueued(
  jobs: GhlPushArgs[],
  opts: { delayMs?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<{ succeeded: GhlPushResult[]; failed: { job: GhlPushArgs; error: string }[] }> {
  const delayMs = opts.delayMs ?? 350;
  const succeeded: GhlPushResult[] = [];
  const failed: { job: GhlPushArgs; error: string }[] = [];

  for (let i = 0; i < jobs.length; i++) {
    try {
      succeeded.push(await pushOffer(jobs[i]));
    } catch (err) {
      failed.push({ job: jobs[i], error: err instanceof Error ? err.message : String(err) });
    }
    opts.onProgress?.(i + 1, jobs.length);
    if (i < jobs.length - 1) await new Promise((r) => setTimeout(r, delayMs));
  }

  return { succeeded, failed };
}
