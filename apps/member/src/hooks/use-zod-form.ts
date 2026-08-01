import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormProps, type UseFormReturn } from 'react-hook-form';
import type { TypeOf, ZodType } from 'zod';

/**
 * Thin wrapper around React Hook Form that wires a Zod schema as the resolver.
 * Form values are inferred from the schema, so a single source of truth defines
 * both validation and types.
 */
export function useZodForm<TSchema extends ZodType>(
  schema: TSchema,
  options?: Omit<UseFormProps<TypeOf<TSchema>>, 'resolver'>,
): UseFormReturn<TypeOf<TSchema>> {
  return useForm<TypeOf<TSchema>>({
    ...options,
    resolver: zodResolver(schema),
  });
}
