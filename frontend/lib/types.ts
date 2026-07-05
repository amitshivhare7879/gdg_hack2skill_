// Mirrors API_CONTRACT.md field-for-field. snake_case preserved deliberately.

export type Language = "hi" | "en";

export type Category =
  | "water"
  | "roads"
  | "electricity"
  | "education"
  | "health"
  | "sanitation"
  | "safety"
  | "other";

export type Severity = "low" | "medium" | "high";

export type Relation = "causes" | "contributes_to" | "related_to";

export type OutboxStatus = "queued" | "sent";

export interface Health {
  status: string;
  complaints: number;
  clusters: number;
}

export interface Locality {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  population: number;
  literacy_rate: number;
  connectivity_rate: number;
}

export interface ComplaintItem {
  id: string;
  text: string;
  original_language: Language;
  has_photo: boolean;
  photo_url?: string;
  created_at: string;
}

export interface RelatedCluster {
  cluster_id: string;
  label: string;
  relation: Relation;
  explanation: string;
}

export interface Cluster {
  id: string;
  label: string;
  category: Category;
  severity: Severity;
  severity_rationale: string;
  complaint_count: number;
  citizen_count: number;
  locality: string;
  lat: number;
  lng: number;
  complaints: ComplaintItem[];
  related: RelatedCluster[];
}

export interface Hotspot {
  cluster_id: string;
  label: string;
  category: Category;
  lat: number;
  lng: number;
  complaint_count: number;
  severity: Severity;
}

export interface Project {
  id: string;
  title: string;
  category: Category;
  locality: string;
  demand_score: number;
  demand_evidence: string;
  severity_score: number;
  severity_evidence: string;
  feasibility_score: number;
  feasibility_evidence: string;
  linked_cluster_ids: string[];
  data_sources: string[];
}

export interface OutboxMessage {
  id: string;
  phone_masked: string;
  language: Language;
  cluster_label: string;
  body: string;
  status: OutboxStatus;
  channel: string;
  created_at: string;
}

// Pagination envelopes (Load-more style)
export interface ClusterStats {
  complaints: number;
  citizens: number;
}

export interface ClusterPage {
  items: Cluster[];
  total: number;
  stats: ClusterStats;
}

export interface OutboxPage {
  items: OutboxMessage[];
  total: number;
}

// POST /complaints
export interface ComplaintSubmission {
  text: string;
  original_language: Language;
  locality: string;
  category_hint: string;
  phone?: string;
  photo?: File | null;
}

export interface ComplaintResponse {
  id: string;
  cluster_id: string;
  cluster_label: string;
  is_new_cluster: boolean;
  message: string;
}
