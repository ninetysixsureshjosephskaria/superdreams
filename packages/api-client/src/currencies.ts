import type { AxiosInstance } from 'axios';

/**
 * Currencies API resource — the fixed internal currency table (no live forex).
 * `perUnitValue` is the value of 1 SD unit in this currency (USD base = 30);
 * `perUsd` is the derived `perUnitValue / 30`. Mirrors the backend `currencies`
 * module DTO exactly. Mutations require the `currency.manage` permission.
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

export interface CreateCurrencyInput {
  code: string;
  name: string;
  symbol?: string;
  decimalDigits?: number;
  perUnitValue: number;
  flagSlug?: string;
  isActive?: boolean;
}

export interface UpdateCurrencyInput {
  name?: string;
  symbol?: string;
  decimalDigits?: number;
  perUnitValue?: number;
  flagSlug?: string;
  isActive?: boolean;
}

export interface ListCurrenciesParams {
  activeOnly?: boolean;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

interface ItemsEnvelope<T> {
  success: boolean;
  data: { items: T[] };
}

export interface CurrenciesApi {
  list(params?: ListCurrenciesParams): Promise<CurrencyData[]>;
  get(code: string): Promise<CurrencyData>;
  create(input: CreateCurrencyInput): Promise<CurrencyData>;
  update(code: string, input: UpdateCurrencyInput): Promise<CurrencyData>;
  remove(code: string): Promise<{ code: string; deleted: boolean }>;
}

/** Binds the currencies resource to a configured API client. */
export function createCurrenciesApi(client: AxiosInstance): CurrenciesApi {
  const base = '/api/v1/currencies';
  return {
    async list(params) {
      const response = await client.get<ItemsEnvelope<CurrencyData>>(base, { params });
      return response.data.data.items;
    },
    async get(code) {
      const response = await client.get<Envelope<CurrencyData>>(`${base}/${code}`);
      return response.data.data;
    },
    async create(input) {
      const response = await client.post<Envelope<CurrencyData>>(base, input);
      return response.data.data;
    },
    async update(code, input) {
      const response = await client.put<Envelope<CurrencyData>>(`${base}/${code}`, input);
      return response.data.data;
    },
    async remove(code) {
      const response = await client.delete<Envelope<{ code: string; deleted: boolean }>>(
        `${base}/${code}`,
      );
      return response.data.data;
    },
  };
}
