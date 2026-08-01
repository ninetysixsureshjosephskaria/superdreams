import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import type { StoreProduct } from '@superdreams/api-client';
import { Button, Drawer, FormField, Input, Textarea } from '@superdreams/ui';

import { stockAdjustFormSchema, type StockAdjustFormValues } from '../validation';

export interface StockAdjustDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: StoreProduct | null;
  isSubmitting: boolean;
  onSubmit: (values: StockAdjustFormValues) => void;
}

/** Adjust a product's stock by a signed amount, with a required reason. */
export function StockAdjustDrawer({
  isOpen,
  onClose,
  product,
  isSubmitting,
  onSubmit,
}: StockAdjustDrawerProps): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StockAdjustFormValues>({
    resolver: zodResolver(stockAdjustFormSchema),
    defaultValues: { change: 0, reason: '' },
  });

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={product ? `Adjust stock — ${product.name}` : 'Adjust stock'}
      description={
        product ? `Current stock: ${product.stock.toLocaleString()}.` : 'Adjust product stock.'
      }
    >
      <form
        noValidate
        className="space-y-3"
        onSubmit={(event) => {
          void handleSubmit((values) => onSubmit(values))(event);
        }}
      >
        <FormField
          label="Change"
          required
          error={errors.change?.message}
          hint="Use a positive number to restock, a negative number to remove."
        >
          <Input type="number" step="1" {...register('change', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Reason" required error={errors.reason?.message}>
          <Textarea rows={2} {...register('reason')} />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Apply adjustment
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
