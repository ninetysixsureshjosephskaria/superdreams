import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { StoreCategory } from '@superdreams/api-client';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  Icon,
  Input,
  type DataTableColumn,
} from '@superdreams/ui';

import { CategoryFormDrawer } from '../components/CategoryFormDrawer';
import { DreamStoreTabs } from '../components/DreamStoreTabs';
import { categoryStatusMeta } from '../data';
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from '../hooks';
import type { CategoryFormValues } from '../validation';

type FormState = { mode: 'create' } | { mode: 'edit'; category: StoreCategory } | null;

/** Dream Store admin — categories backed by the real API. */
export default function CategoriesPage() {
  const notify = useNotificationStore((state) => state.notify);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<FormState>(null);

  const categoriesQuery = useCategories({ includeInactive: true });
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory(form?.mode === 'edit' ? form.category.id : '');
  const deleteCategory = useDeleteCategory();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (categoriesQuery.data ?? []).filter(
      (category) => term === '' || category.name.toLowerCase().includes(term),
    );
  }, [categoriesQuery.data, search]);

  const handleSubmit = (values: CategoryFormValues): void => {
    const input = {
      name: values.name,
      isActive: values.isActive,
      sortOrder: values.sortOrder,
      ...(values.description ? { description: values.description } : {}),
    };
    if (form?.mode === 'edit') {
      updateCategory.mutate(input, {
        onSuccess: () => {
          notify({ variant: 'success', title: 'Category updated', description: values.name });
          setForm(null);
        },
        onError: (error) =>
          notify({ variant: 'error', title: 'Update failed', description: error.message }),
      });
      return;
    }
    createCategory.mutate(input, {
      onSuccess: () => {
        notify({ variant: 'success', title: 'Category created', description: values.name });
        setForm(null);
      },
      onError: (error) =>
        notify({ variant: 'error', title: 'Create failed', description: error.message }),
    });
  };

  const handleDelete = (category: StoreCategory): void => {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    deleteCategory.mutate(category.id, {
      onSuccess: () =>
        notify({ variant: 'success', title: 'Category deleted', description: category.name }),
      onError: (error) =>
        notify({ variant: 'error', title: 'Delete failed', description: error.message }),
    });
  };

  const columns: DataTableColumn<StoreCategory>[] = [
    {
      id: 'name',
      header: 'Category',
      cell: (category) => (
        <div>
          <p className="font-medium">{category.name}</p>
          {category.description ? (
            <p className="text-xs text-muted-foreground">{category.description}</p>
          ) : null}
        </div>
      ),
    },
    { id: 'slug', header: 'Slug', cell: (category) => category.slug },
    {
      id: 'products',
      header: 'Products',
      align: 'right',
      cell: (category) => category.productCount,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (category) => {
        const meta = categoryStatusMeta(category.isActive);
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      },
    },
  ];

  return (
    <>
      <Helmet>
        <title>Dream Store — Categories</title>
      </Helmet>
      <PageHeader
        title="Dream Store · Categories"
        description="Organize the rewards catalog."
        actions={
          <Button
            leftIcon={<Icon name="plus" size="sm" />}
            onClick={() => setForm({ mode: 'create' })}
          >
            New category
          </Button>
        }
      />

      <DreamStoreTabs />

      <div className="mb-4 w-64">
        <Input
          placeholder="Search categories…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {categoriesQuery.isError ? (
        <Alert variant="destructive" title="Could not load categories">
          {categoriesQuery.error.message}
        </Alert>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={filtered}
            getRowId={(category) => category.id}
            isLoading={categoriesQuery.isPending}
            emptyState="No categories yet."
            rowActions={(category) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm({ mode: 'edit', category })}
                >
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(category)}>
                  Delete
                </Button>
              </div>
            )}
          />

          <p className="mt-4 text-sm text-muted-foreground">{filtered.length} categories</p>
        </>
      )}

      {form ? (
        <CategoryFormDrawer
          isOpen
          onClose={() => setForm(null)}
          category={form.mode === 'edit' ? form.category : undefined}
          isSubmitting={createCategory.isPending || updateCategory.isPending}
          onSubmit={handleSubmit}
        />
      ) : null}
    </>
  );
}
