import { NotFoundError } from '@/errors';

import type {
  NetworkMemberDetail,
  NetworkMemberNode,
  PartnerNetworkSummary,
  ReferralSummary,
} from '../dto';
import type { MemberBrief, MemberLookupRepository, NetworkRepository } from '../repositories';

/**
 * Supplies a member's financial-wallet unit count for the network view. Adapted
 * in composition from the wallet module; a narrow port keeps the network module
 * decoupled from wallet wiring (and lets tests stub it).
 */
export interface UnitsProviderPort {
  getUnits(memberId: string): Promise<number>;
}

/** Safety cap on downline traversal depth (guards against relationship cycles). */
const MAX_DEPTH = 1000;

function fullName(brief: MemberBrief): string {
  return `${brief.firstName} ${brief.lastName}`.trim();
}

function toNode(brief: MemberBrief, directReferralCount: number, depth: number): NetworkMemberNode {
  return {
    memberId: brief.id,
    memberNumber: brief.memberNumber,
    name: fullName(brief),
    referredBy: brief.referredBy,
    partnerId: brief.partnerId,
    directReferralCount,
    depth,
  };
}

/**
 * Network / referral read model (Phase 2D). The downline is the transitive
 * closure over `members.referred_by`; a partner's direct members are those with
 * `partner_id = partner`. Member self-service is scoped to the caller's own
 * subtree (route separation + id resolved from the auth token); network-wide
 * visibility requires `network.read`.
 */
export class NetworkService {
  public constructor(
    private readonly net: NetworkRepository,
    private readonly members: MemberLookupRepository,
    private readonly units: UnitsProviderPort,
  ) {}

  /** Resolves the caller's member id from their auth user id (portal self-service). */
  public async memberIdForUser(userId: string): Promise<string> {
    const member = await this.members.findByUserId(userId);
    if (!member) {
      throw new NotFoundError('No member is linked to your account.');
    }
    return member.id;
  }

  // --- Member self-service ---------------------------------------------------

  public async getReferralSummary(memberId: string): Promise<ReferralSummary> {
    const brief = await this.net.findBrief(memberId);
    if (!brief) {
      throw new NotFoundError('Member not found.');
    }
    const directReferralCount = await this.net.countDirectReferrals(memberId);
    const downline = await this.walkDownline(memberId);
    return {
      memberId: brief.id,
      memberNumber: brief.memberNumber,
      referredBy: brief.referredBy,
      partnerId: brief.partnerId,
      directReferralCount,
      totalDownlineCount: downline.length,
    };
  }

  public async getDirectReferrals(memberId: string): Promise<NetworkMemberNode[]> {
    const direct = await this.net.directReferrals(memberId);
    const grandchildren = await this.net.childrenOf(direct.map((d) => d.id));
    const directCountByParent = new Map<string, number>();
    for (const g of grandchildren) {
      if (g.referredBy) {
        directCountByParent.set(g.referredBy, (directCountByParent.get(g.referredBy) ?? 0) + 1);
      }
    }
    return direct.map((d) => toNode(d, directCountByParent.get(d.id) ?? 0, 1));
  }

  public async getDownline(memberId: string): Promise<NetworkMemberNode[]> {
    const nodes = await this.walkDownline(memberId);
    const directCountById = new Map<string, number>();
    for (const { brief } of nodes) {
      if (brief.referredBy) {
        directCountById.set(brief.referredBy, (directCountById.get(brief.referredBy) ?? 0) + 1);
      }
    }
    return nodes.map(({ brief, depth }) =>
      toNode(brief, directCountById.get(brief.id) ?? 0, depth),
    );
  }

  // --- Admin (network.read) --------------------------------------------------

  public async listPartnerSummaries(): Promise<PartnerNetworkSummary[]> {
    const partnerIds = await this.net.distinctPartnerIds();
    const briefs = await this.net.findBriefByIds(partnerIds);
    const byId = new Map(briefs.map((b) => [b.id, b]));
    const summaries: PartnerNetworkSummary[] = [];
    for (const partnerId of partnerIds) {
      const brief = byId.get(partnerId);
      if (!brief) {
        continue;
      }
      const directMemberCount = await this.net.countDirectMembersOf(partnerId);
      const totalNetworkCount = (await this.walkDownline(partnerId)).length;
      summaries.push({
        partnerMemberId: partnerId,
        memberNumber: brief.memberNumber,
        name: fullName(brief),
        directMemberCount,
        totalNetworkCount,
      });
    }
    return summaries.sort((a, b) => b.totalNetworkCount - a.totalNetworkCount);
  }

  public async getMemberDetail(memberId: string): Promise<NetworkMemberDetail> {
    const brief = await this.net.findBrief(memberId);
    if (!brief) {
      throw new NotFoundError('Member not found.');
    }
    const directReferralCount = await this.net.countDirectReferrals(memberId);
    const totalDownlineCount = (await this.walkDownline(memberId)).length;
    const units = await this.units.getUnits(memberId);
    return {
      memberId: brief.id,
      memberNumber: brief.memberNumber,
      name: fullName(brief),
      email: brief.email,
      status: brief.status,
      referredBy: brief.referredBy,
      partnerId: brief.partnerId,
      directReferralCount,
      totalDownlineCount,
      units,
    };
  }

  // --- Internals -------------------------------------------------------------

  /** Breadth-first traversal of the downline; excludes the root; cycle-safe. */
  private async walkDownline(
    rootId: string,
  ): Promise<Array<{ brief: MemberBrief; depth: number }>> {
    const all: Array<{ brief: MemberBrief; depth: number }> = [];
    const seen = new Set<string>([rootId]);
    let frontier = [rootId];
    let depth = 1;
    while (frontier.length > 0 && depth < MAX_DEPTH) {
      const children = await this.net.childrenOf(frontier);
      const next: string[] = [];
      for (const child of children) {
        if (seen.has(child.id)) {
          continue;
        }
        seen.add(child.id);
        all.push({ brief: child, depth });
        next.push(child.id);
      }
      frontier = next;
      depth += 1;
    }
    return all;
  }
}
