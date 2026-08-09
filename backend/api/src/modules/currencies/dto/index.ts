/**
 * A currency in the fixed internal table. `perUnitValue` is the value of 1 SD
 * unit in this currency's major units (USD base = 30). `perUsd` is the derived
 * "1 USD = …" rate (`perUnitValue / 30`). There is no live forex.
 */
export interface CurrencyData {
  code: string;
  name: string;
  symbol: string | null;
  decimalDigits: number;
  perUnitValue: number;
  perUsd: number;
  isBase: boolean;
  flagSlug: string | null;
  isActive: boolean;
}

export interface CurrencyActor {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}
