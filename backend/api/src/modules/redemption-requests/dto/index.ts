/** Actor context threaded from the HTTP boundary into the service/audit layer. */
export interface RedemptionRequestActor {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}

export type RedemptionRequestStatusType = 'PENDING' | 'APPROVED' | 'REJECTED';

/** A member points-redemption request as returned to API consumers. */
export interface RedemptionRequestData {
  id: string;
  memberId: string;
  pointsRequested: number;
  status: RedemptionRequestStatusType;
  note: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedRedemptionRequests {
  items: RedemptionRequestData[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
