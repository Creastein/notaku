export interface ScanRequest {
  imageUrl: string;
}

export interface AdvisorRequest {
  userId: string; // UUID
  query: string;
}
