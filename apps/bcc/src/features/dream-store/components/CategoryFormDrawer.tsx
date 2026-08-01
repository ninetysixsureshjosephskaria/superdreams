import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import type { StoreCategory } from '@superdreams/api-client';
import { Button, Checkbox, Drawer, FormField, Input, Textarea } from '@superdreams/ui';

import { categoryFormSchema, type CategoryFormValues } from '../validation';

export interface CategoryFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  category?: StoreCategory;
  isSubmitting: boolean;
  onSubmit: (values: CategoryFormValues) => void;
}

/** Create / edit a Dream Store category. */
export function CategoryFormDrawer({
  isOpen,
  onClose,
  category,
  isSubmitting,
  onSubmit,
}: CategoryFormDrawerProps): JSX.Element {
  const isEdit = Boolean(category);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name ?? '',
      description: category?.description ?? '',
      isActive: category?.isActive ?? true,
      sortOrder: category?.sortOrder ?? 0,
    },
  });

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit ${category?.name ?? 'category'}` : 'New category'}
      description={isEdit ? 'Update the category details.' : 'Add a catalog category.'}
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
        <FormField label="Description" error={errors.description?.message}>
          <Textarea rows={3} {...register('description')} />
        </FormField>
        <FormField label="Sort order" required error={errors.sortOrder?.message}>
          <Input
            type="number"
            min="0"
            step="1"
            {...register('sortOrder', { valueAsNumber: true })}
          />
        </FormField>
        <Checkbox label="Active" {...register('isActive')} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create category'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
