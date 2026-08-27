// Syrové tvary odpovědí Universal Content API (server-only) — obecné,
// žádná projekt-specifická byznys logika. Konkrétní projekty si nad
// tímhle staví vlastní typy (jako lib/promotions, lib/assets tady ve
// starteru), ale tenhle soubor zůstává čistě "co UCA vrací".

export type UcaMedia = {
  id: number;
  record_id: number | null;
  public_url: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  created_at: string;
};

export type UcaRecordStatus = "pending" | "approved" | "rejected";

export type UcaRecord = {
  id: number;
  collection?: string;
  status: UcaRecordStatus;
  data: Record<string, unknown>;
  media: UcaMedia[];
  created_at: string;
  updated_at: string;
};

export type UcaPaginatedResponse<T> = {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};
