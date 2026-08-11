/** Actor context threaded from the HTTP boundary into the service/audit layer. */
export interface PartnerRequestActor {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}

export type PartnerRequestStatusType = 'PENDING' | 'APPROVED' | 'REJECTED';

/** A Member→Partner upgrade request as returned to API consumers. */
export interface PartnerRequestData {
  id: string;
  memberId: string;
  status: PartnerRequestStatusType;
  note: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPartnerRequests {
  items: PartnerRequestData[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
