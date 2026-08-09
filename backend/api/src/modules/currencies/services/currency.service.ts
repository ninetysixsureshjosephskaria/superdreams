import type { Database } from '@/database/client';
import { withTransaction } from '@/database/helpers/transaction';
import { BusinessRuleError, ConflictError, NotFoundError } from '@/errors';
import { UNIT_VALUE_USD_CENTS } from '@/modules/wallet/units';

import type { CurrencyActor, CurrencyData } from '../dto';
import {
  type CurrencyAuditRepository,
  type CurrencyRepository,
  type CurrencyRow,
} from '../repositories';
import {
  createCurrencySchema,
  listCurrenciesQuerySchema,
  updateCurrencySchema,
} from '../validators';

/** 1 SD unit is worth this many USD (reference-defined 1 unit = $30). */
const USD_PER_UNIT = UNIT_VALUE_USD_CENTS / 100;

function toCurrency(row: CurrencyRow): CurrencyData {
  return {
    code: row.code,
    name: row.name,
    symbol: row.symbol,
    decimalDigits: row.decimalDigits,
    perUnitValue: row.perUnitValue,
    // "1 USD =" derived: this currency's per-unit value ÷ the USD per-unit value.
    perUsd: row.perUnitValue > 0 ? row.perUnitValue / USD_PER_UNIT : 0,
    isBase: row.isBase,
    flagSlug: row.flagSlug,
    isActive: row.isActive,
  };
}

/**
 * Currencies — the fixed internal per-unit value table (Phase 2C). Admin CRUD;
 * members only consume. The USD base row is immutable and undeletable. No live
 * forex: `perUnitValue` is maintained by admins.
 */
export class CurrencyService {
  public constructor(
    private readonly db: Database,
    private readonly currencies: CurrencyRepository,
    private readonly audit: CurrencyAuditRepository,
  ) {}

  public async list(query: unknown): Promise<CurrencyData[]> {
    const { activeOnly } = listCurrenciesQuerySchema.parse(query);
    const rows = await this.currencies.list(activeOnly ?? false);
    return rows.map(toCurrency);
  }

  public async get(code: string): Promise<CurrencyData> {
    const row = await this.currencies.findByCode(code.toUpperCase());
    if (!row) {
      throw new NotFoundError('Currency not found.');
    }
    return toCurrency(row);
  }

  public async create(input: unknown, actor: CurrencyActor): Promise<CurrencyData> {
    const data = createCurrencySchema.parse(input);
    if (await this.currencies.findByCode(data.code)) {
      throw new ConflictError('That currency code already exists.');
    }

    const created = await withTransaction(this.db, async (tx) => {
      const row = await this.currencies.create(
        {
          code: data.code,
          name: data.name,
          symbol: data.symbol ?? null,
          decimalDigits: data.decimalDigits ?? 2,
          perUnitValue: data.perUnitValue,
          isBase: false,
          flagSlug: data.flagSlug ?? null,
          isActive: data.isActive ?? true,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        tx,
      );
      await this.audit.write(
        { entityId: row.id, action: 'CREATE', newValue: toCurrency(row), ...this.ctx(actor) },
        tx,
      );
      return row;
    });
    return toCurrency(created);
  }

  public async update(code: string, input: unknown, actor: CurrencyActor): Promise<CurrencyData> {
    const data = updateCurrencySchema.parse(input);
    const existing = await this.currencies.findByCode(code.toUpperCase());
    if (!existing) {
      throw new NotFoundError('Currency not found.');
    }
    if (existing.isBase) {
      throw new BusinessRuleError('The base currency cannot be modified.');
    }

    const patch = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.symbol !== undefined ? { symbol: data.symbol } : {}),
      ...(data.decimalDigits !== undefined ? { decimalDigits: data.decimalDigits } : {}),
      ...(data.perUnitValue !== undefined ? { perUnitValue: data.perUnitValue } : {}),
      ...(data.flagSlug !== undefined ? { flagSlug: data.flagSlug } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      updatedBy: actor.userId,
    };

    const updated = await withTransaction(this.db, async (tx) => {
      const row = await this.currencies.update(existing.id, patch, tx);
      if (!row) {
        throw new NotFoundError('Currency not found.');
      }
      await this.audit.write(
        {
          entityId: row.id,
          action: 'UPDATE',
          oldValue: toCurrency(existing),
          newValue: toCurrency(row),
          ...this.ctx(actor),
        },
        tx,
      );
      return row;
    });
    return toCurrency(updated);
  }

  public async remove(code: string, actor: CurrencyActor): Promise<void> {
    const existing = await this.currencies.findByCode(code.toUpperCase());
    if (!existing) {
      throw new NotFoundError('Currency not found.');
    }
    if (existing.isBase) {
      throw new BusinessRuleError('The base currency cannot be deleted.');
    }
    await withTransaction(this.db, async (tx) => {
      await this.currencies.softDelete(existing.id, actor.userId, tx);
      await this.audit.write(
        {
          entityId: existing.id,
          action: 'DELETE',
          oldValue: toCurrency(existing),
          ...this.ctx(actor),
        },
        tx,
      );
    });
  }

  private ctx(
    actor: CurrencyActor,
  ): Pick<
    Parameters<CurrencyAuditRepository['write']>[0],
    'userId' | 'ipAddress' | 'userAgent' | 'correlationId'
  > {
    return {
      userId: actor.userId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      correlationId: actor.correlationId,
    };
  }
}
