export type OrganizationStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'ARCHIVED';

export interface OrganizationProps {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: OrganizationStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/** Organization (tenant) aggregate. */
export class Organization {
  private constructor(private readonly props: OrganizationProps) {}

  public static fromProps(props: OrganizationProps): Organization {
    return new Organization({ ...props });
  }

  public get id(): string {
    return this.props.id;
  }

  public get slug(): string {
    return this.props.slug;
  }

  public get isActive(): boolean {
    return this.props.isActive && this.props.status === 'ACTIVE';
  }

  public activate(): void {
    this.props.isActive = true;
    this.props.status = 'ACTIVE';
  }

  public deactivate(): void {
    this.props.isActive = false;
    this.props.status = 'INACTIVE';
  }

  public toProps(): OrganizationProps {
    return { ...this.props };
  }
}
