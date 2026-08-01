import type { PaginatedResult, PaginationParams } from '@/database/types';
import { ConflictError, NotFoundError } from '@/errors';

import { User, type UserStatus } from '../domain';
import type { CreateUserInput, UpdateUserProfileInput, UserResponse } from '../dto';
import type { IdentityEvent, IdentityEventBus } from '../events';
import { toUserProps, toUserResponse } from '../mappers';
import type { UserRepository } from '../repositories';
import { createUserSchema, updateUserProfileSchema } from '../validators';
import { hashPassword } from './password.service';

/**
 * Application service for user management. Owns workflow/coordination; the
 * lifecycle rules live in the `User` domain aggregate and persistence in the
 * repository. Contains **no** authentication, JWT, or session logic.
 */
export class UserService {
  public constructor(
    private readonly users: UserRepository,
    private readonly events: IdentityEventBus,
  ) {}

  public async createUser(input: CreateUserInput): Promise<UserResponse> {
    const data = createUserSchema.parse(input);

    if (await this.users.findByEmail(data.email)) {
      throw new ConflictError('A user with this email already exists.');
    }
    if (data.username !== undefined && (await this.users.findByUsername(data.username))) {
      throw new ConflictError('A user with this username already exists.');
    }

    const passwordHash = await hashPassword(data.password);
    const row = await this.users.create({
      email: data.email,
      username: data.username ?? null,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      organizationId: data.organizationId ?? null,
      passwordHash,
      status: 'PENDING',
    });

    await this.events.publish({
      type: 'UserCreated',
      userId: row.id,
      email: row.email,
      at: new Date(),
    });
    return toUserResponse(row);
  }

  public async getById(id: string): Promise<UserResponse | null> {
    const row = await this.users.findById(id);
    return row ? toUserResponse(row) : null;
  }

  public async findByEmail(email: string): Promise<UserResponse | null> {
    const row = await this.users.findByEmail(email);
    return row ? toUserResponse(row) : null;
  }

  public async list(params: PaginationParams = {}): Promise<PaginatedResult<UserResponse>> {
    const page = await this.users.findMany(params);
    return { ...page, items: page.items.map(toUserResponse) };
  }

  public async updateProfile(id: string, input: UpdateUserProfileInput): Promise<UserResponse> {
    const data = updateUserProfileSchema.parse(input);
    const updated = await this.users.update(id, {
      ...(data.username !== undefined ? { username: data.username } : {}),
      ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
      ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
    });
    if (!updated) {
      throw new NotFoundError('User not found.');
    }
    await this.events.publish({ type: 'UserUpdated', userId: id, at: new Date() });
    return toUserResponse(updated);
  }

  public async changeStatus(id: string, next: UserStatus): Promise<UserResponse> {
    const row = await this.users.findById(id);
    if (!row) {
      throw new NotFoundError('User not found.');
    }

    const user = User.fromProps(toUserProps(row));
    this.applyTransition(user, next);

    const updated = await this.users.update(id, { status: user.status });
    if (!updated) {
      throw new NotFoundError('User not found.');
    }
    await this.events.publish(this.statusEvent(id, user.status));
    return toUserResponse(updated);
  }

  private applyTransition(user: User, next: UserStatus): void {
    switch (next) {
      case 'ACTIVE':
        user.activate();
        break;
      case 'INACTIVE':
        user.markInactive();
        break;
      case 'SUSPENDED':
        user.suspend();
        break;
      case 'DEACTIVATED':
        user.deactivate();
        break;
      case 'PENDING':
        throw new ConflictError('A user cannot be transitioned back to PENDING.');
    }
  }

  private statusEvent(id: string, status: UserStatus): IdentityEvent {
    const at = new Date();
    switch (status) {
      case 'ACTIVE':
        return { type: 'UserActivated', userId: id, at };
      case 'SUSPENDED':
        return { type: 'UserSuspended', userId: id, at };
      case 'DEACTIVATED':
        return { type: 'UserDeactivated', userId: id, at };
      default:
        return { type: 'UserUpdated', userId: id, at };
    }
  }
}
