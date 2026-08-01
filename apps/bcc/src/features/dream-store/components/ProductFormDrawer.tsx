import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import type { StoreCategory, StoreProduct } from '@superdreams/api-client';
import {
  Button,
  Drawer,
  FormField,
  Input,
  Select,
  Textarea,
  type SelectOption,
} from '@superdreams/ui';

import { productFormSchema, type ProductFormValues } from '../validation';

const STATUS_OPTIONS: SelectOption[] = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Archived', value: 'ARCHIVED' },
];

export interface ProductFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: StoreCategory[];
  /** When provided, the drawer edits this product; otherwise it creates a new one. */
  product?: StoreProduct;
  isSubmitting: boolean;
  onSubmit: (values: ProductFormValues) => void;
}

/** Create / edit a Dream Store product. SKU and initial stock are set at creation only. */
export function ProductFormDrawer({
  isOpen,
  onClose,
  categories,
  product,
  isSubmitting,
  onSubmit,
}: ProductFormDrawerProps): JSX.Element {
  const isEdit = Boolean(product);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name ?? '',
      sku: product?.sku ?? '',
      categoryId: product?.categoryId ?? '',
      points: product?.points ?? 0,
      stock: product?.stock ?? 0,
      reorderLevel: product?.reorderLevel ?? 0,
      status: product?.status ?? 'DRAFT',
      description: product?.description ?? '',
    },
  });

  const categoryOptions: SelectOption[] = [
    { label: 'No category', value: '' },
    ...categories.map((category) => ({ label: category.name, value: category.id })),
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit ${product?.name ?? 'product'}` : 'New product'}
      description={isEdit ? 'Update the product details.' : 'Add a product to the rewards catalog.'}
    >
      <form
        noValidate
        className="space-y-3"
        onSubmit={(event) => {
          void handleSubmit((values) => onSubmit(values))(event);
        }}
      >
        <FormField label="Name" required error={errors.name?.message}>
          <Input {...register('name')} />
        </FormField>
        {!isEdit ? (
          <FormField label="SKU" required error={errors.sku?.message}>
            <Input {...register('sku')} />
          </FormField>
        ) : null}
        <FormField label="Category" error={errors.categoryId?.message}>
          <Select options={categoryOptions} {...register('categoryId')} />
        </FormField>
        <FormField label="Points" required error={errors.points?.message}>
          <Input type="number" min="0" step="1" {...register('points', { valueAsNumber: true })} />
        </FormField>
        {!isEdit ? (
          <FormField label="Initial stock" required error={errors.stock?.message}>
            <Input type="number" min="0" step="1" {...register('stock', { valueAsNumber: true })} />
          </FormField>
        ) : null}
        <FormField label="Reorder level" required error={errors.reorderLevel?.message}>
          <Input
            type="number"
            min="0"
            step="1"
            {...register('reorderLevel', { valueAsNumber: true })}
          />
        </FormField>
        <FormField label="Status" required error={errors.status?.message}>
          <Select options={STATUS_OPTIONS} {...register('status')} />
        </FormField>
        <FormField label="Description" error={errors.description?.message}>
          <Textarea rows={3} {...register('description')} />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
