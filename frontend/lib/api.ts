// The ONE data layer (RULES.md #1). Components never fetch directly.
//
// Live mode:  NEXT_PUBLIC_API_URL set (e.g. http://localhost:8000/api)
// Mock mode:  NEXT_PUBLIC_API_URL empty/unset -> reads /public/mock/*.json
//
// Switching from mock to live at integration time is ONLY setting the env var.

import type {
  Cluster,
  ComplaintResponse,
  ComplaintSubmission,
  Health,
  Hotspot,
  Locality,
  OutboxMessage,
  Project,
} from "./types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
export const IS_MOCK = API_URL === "";

// Backend origin (strip trailing /api) — used to resolve /media/* photo URLs.
const ORIGIN = API_URL.replace(/\/api$/, "");

/** Resolve a relative photo_url (e.g. "/media/x2.jpg") to an absolute URL. */
export function mediaUrl(photoUrl: string | undefined): string | undefined {
  if (!photoUrl) return undefined;
  if (/^https?:\/\//.test(photoUrl)) return photoUrl;
  if (IS_MOCK) return photoUrl; // mock photos are served from /public
  return `${ORIGIN}${photoUrl.startsWith("/") ? "" : "/"}${photoUrl}`;
}

async function getJSON<T>(livePath: string, mockFile: string): Promise<T> {
  const url = IS_MOCK ? `/mock/${mockFile}` : `${API_URL}${livePath}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export async function getHealth(): Promise<Health> {
  return getJSON<Health>("/health", "health.json");
}

export async function getLocalities(): Promise<Locality[]> {
  const data = await getJSON<{ localities: Locality[] }>(
    "/localities",
    "localities.json",
  );
  return data.localities;
}

export async function getClusters(locality?: string): Promise<Cluster[]> {
  const q = locality ? `?locality=${encodeURIComponent(locality)}` : "";
  const data = await getJSON<{ clusters: Cluster[] }>(
    `/clusters${q}`,
    "clusters.json",
  );
  // Mock mode: filter client-side so the selector still works offline.
  if (IS_MOCK && locality) {
    return data.clusters.filter((c) => c.locality === locality);
  }
  return data.clusters;
}

export async function getHotspots(): Promise<Hotspot[]> {
  const data = await getJSON<{ hotspots: Hotspot[] }>(
    "/hotspots",
    "hotspots.json",
  );
  return data.hotspots;
}

export async function getPriorities(): Promise<Project[]> {
  const data = await getJSON<{ projects: Project[] }>(
    "/priorities",
    "priorities.json",
  );
  return data.projects;
}

export async function getOutbox(): Promise<OutboxMessage[]> {
  const data = await getJSON<{ messages: OutboxMessage[] }>(
    "/outbox",
    "outbox.json",
  );
  return data.messages;
}

export async function submitComplaint(
  input: ComplaintSubmission,
): Promise<ComplaintResponse> {
  if (IS_MOCK) {
    // Fake a plausible 201 so /submit is demoable offline.
    await new Promise((r) => setTimeout(r, 600));
    return {
      id: "mock-" + input.text.length,
      cluster_id: "c3",
      cluster_label:
        input.category_hint === "education"
          ? "School infrastructure gaps in the ward"
          : "Street lights non-functional in the ward lanes",
      is_new_cluster: false,
      message:
        "Your complaint has been recorded and grouped with 7 similar reports.",
    };
  }

  let res: Response;
  if (input.photo) {
    const form = new FormData();
    form.append("text", input.text);
    form.append("original_language", input.original_language);
    form.append("locality", input.locality);
    form.append("category_hint", input.category_hint);
    if (input.phone) form.append("phone", input.phone);
    form.append("photo", input.photo);
    res = await fetch(`${API_URL}/complaints`, { method: "POST", body: form });
  } else {
    res = await fetch(`${API_URL}/complaints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: input.text,
        original_language: input.original_language,
        locality: input.locality,
        category_hint: input.category_hint,
        phone: input.phone || undefined,
      }),
    });
  }

  if (!res.ok) {
    let detail = `Submission failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as ComplaintResponse;
}
