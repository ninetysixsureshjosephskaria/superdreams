export type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface UserProps {
  id: string;
  organizationId: string | null;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/** Permitted user lifecycle transitions. */
const ALLOWED_TRANSITIONS: Record<UserStatus, readonly UserStatus[]> = {
  PENDING: ['ACTIVE', 'DEACTIVATED'],
  ACTIVE: ['INACTIVE', 'SUSPENDED', 'DEACTIVATED'],
  INACTIVE: ['ACTIVE', 'DEACTIVATED'],
  SUSPENDED: ['ACTIVE', 'DEACTIVATED'],
  DEACTIVATED: [],
};

/** Thrown when a user lifecycle transition is not permitted. */
export class InvalidUserStatusTransitionError extends Error {
  public constructor(from: UserStatus, to: UserStatus) {
    super(`Cannot transition user from ${from} to ${to}.`);
    this.name = 'InvalidUserStatusTransitionError';
  }
}

/**
 * User aggregate. Owns the lifecycle business rules; persistence and hashing
 * live outside the domain (in the repository and services).
 */
export class User {
  private constructor(private readonly props: UserProps) {}

  public static fromProps(props: UserProps): User {
    return new User({ ...props });
  }

  public get id(): string {
    return this.props.id;
  }

  public get email(): string {
    return this.props.email;
  }

  public get status(): UserStatus {
    return this.props.status;
  }

  public get organizationId(): string | null {
    return this.props.organizationId;
  }

  public get isActive(): boolean {
    return this.props.status === 'ACTIVE';
  }

  public canTransitionTo(next: UserStatus): boolean {
    return ALLOWED_TRANSITIONS[this.props.status].includes(next);
  }

  public activate(): void {
    this.transition('ACTIVE');
  }

  public markInactive(): void {
    this.transition('INACTIVE');
  }

  public suspend(): void {
    this.transition('SUSPENDED');
  }

  public deactivate(): void {
    this.transition('DEACTIVATED');
  }

  public toProps(): UserProps {
    return { ...this.props };
  }

  private transition(next: UserStatus): void {
    if (!this.canTransitionTo(next)) {
      throw new InvalidUserStatusTransitionError(this.props.status, next);
    }
    this.props.status = next;
  }
}
