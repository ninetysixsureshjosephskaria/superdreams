import type { PaginatedResult, PaginationParams } from '@/database/types';
import { ConflictError, NotFoundError } from '@/errors';

import { Organization } from '../domain';
import type { CreateOrganizationInput, OrganizationResponse } from '../dto';
import type { IdentityEventBus } from '../events';
import { toOrganizationProps, toOrganizationResponse } from '../mappers';
import type { OrganizationRepository } from '../repositories';
import { createOrganizationSchema } from '../validators';

/** Application service for organization (tenant) management. */
export class OrganizationService {
  public constructor(
    private readonly organizations: OrganizationRepository,
    private readonly events: IdentityEventBus,
  ) {}

  public async createOrganization(input: CreateOrganizationInput): Promise<OrganizationResponse> {
    const data = createOrganizationSchema.parse(input);
    if (await this.organizations.findBySlug(data.slug)) {
      throw new ConflictError('An organization with this slug already exists.');
    }
    const row = await this.organizations.create({
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
    });
    await this.events.publish({
      type: 'OrganizationCreated',
      organizationId: row.id,
      at: new Date(),
    });
    return toOrganizationResponse(row);
  }

  public async getById(id: string): Promise<OrganizationResponse | null> {
    const row = await this.organizations.findById(id);
    return row ? toOrganizationResponse(row) : null;
  }

  public async list(params: PaginationParams = {}): Promise<PaginatedResult<OrganizationResponse>> {
    const page = await this.organizations.findMany(params);
    return { ...page, items: page.items.map(toOrganizationResponse) };
  }

  public async deactivate(id: string): Promise<OrganizationResponse> {
    const row = await this.organizations.findById(id);
    if (!row) {
      throw new NotFoundError('Organization not found.');
    }
    const organization = Organization.fromProps(toOrganizationProps(row));
    organization.deactivate();
    const props = organization.toProps();

    const updated = await this.organizations.update(id, {
      status: props.status,
      isActive: props.isActive,
    });
    if (!updated) {
      throw new NotFoundError('Organization not found.');
    }
    await this.events.publish({
      type: 'OrganizationDeactivated',
      organizationId: id,
      at: new Date(),
    });
    return toOrganizationResponse(updated);
  }
}
