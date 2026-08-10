import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { ProductStatus, StoreProduct } from '@superdreams/api-client';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  Icon,
  Input,
  Pagination,
  Select,
  type DataTableColumn,
} from '@superdreams/ui';

import { DreamStoreTabs } from '../components/DreamStoreTabs';
import { ProductFormDrawer } from '../components/ProductFormDrawer';
import { PRODUCT_STATUS_META, STOCK_STATUS_META } from '../data';
import {
  useArchiveProduct,
  useCategories,
  useCreateProduct,
  useProducts,
  useUpdateProduct,
} from '../hooks';
import type { ProductFormValues } from '../validation';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Archived', value: 'ARCHIVED' },
];

type FormState = { mode: 'create' } | { mode: 'edit'; product: StoreProduct } | null;

/** Dream Store admin — product catalog backed by the real API. */
export default function ProductsPage() {
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState<FormState>(null);

  const categoriesQuery = useCategories({ includeInactive: true });
  const productsQuery = useProducts({
    page,
    pageSize: PAGE_SIZE,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(category ? { categoryId: category } : {}),
    ...(status ? { status: status as ProductStatus } : {}),
  });

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const archiveProduct = useArchiveProduct();

  const resetPage = (): void => setPage(1);

  const handleSubmit = (values: ProductFormValues): void => {
    const categoryId = values.categoryId ? values.categoryId : undefined;
    if (form?.mode === 'edit') {
      updateProduct.mutate(
        {
          id: form.product.id,
          input: {
            name: values.name,
            categoryId: categoryId ?? null,
            points: values.points,
            reorderLevel: values.reorderLevel,
            status: values.status,
            description: values.description ?? null,
          },
        },
        {
          onSuccess: () => {
            notify({ variant: 'success', title: 'Product updated', description: values.name });
            setForm(null);
          },
          onError: (error) =>
            notify({ variant: 'error', title: 'Update failed', description: error.message }),
        },
      );
      return;
    }
    createProduct.mutate(
      {
        name: values.name,
        sku: values.sku,
        ...(categoryId ? { categoryId } : {}),
        points: values.points,
        stock: values.stock,
        reorderLevel: values.reorderLevel,
        status: values.status,
        ...(values.description ? { description: values.description } : {}),
      },
      {
        onSuccess: () => {
          notify({ variant: 'success', title: 'Product created', description: values.name });
          setForm(null);
        },
        onError: (error) =>
          notify({ variant: 'error', title: 'Create failed', description: error.message }),
      },
    );
  };

  const handleArchive = (product: StoreProduct): void => {
    if (!window.confirm(`Archive "${product.name}"? It will no longer be redeemable.`)) return;
    archiveProduct.mutate(product.id, {
      onSuccess: () =>
        notify({ variant: 'success', title: 'Product archived', description: product.name }),
      onError: (error) =>
        notify({ variant: 'error', title: 'Archive failed', description: error.message }),
    });
  };

  const columns: DataTableColumn<StoreProduct>[] = [
    {
      id: 'name',
      header: 'Product',
      cell: (product) => (
        <div>
          <p className="font-medium">{product.name}</p>
          <p className="text-xs text-muted-foreground">{product.sku}</p>
        </div>
      ),
    },
    { id: 'category', header: 'Category', cell: (product) => product.categoryName ?? '—' },
    {
      id: 'points',
      header: 'Points',
      align: 'right',
      cell: (product) => product.points.toLocaleString(),
    },
    {
      id: 'stock',
      header: 'Stock',
      cell: (product) => {
        const meta = STOCK_STATUS_META[product.stockStatus];
        return (
          <span className="flex items-center gap-2">
            <span className="tabular-nums">{product.stock}</span>
            <Badge soft variant={meta.variant}>
              {meta.label}
            </Badge>
          </span>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: (product) => {
        const meta = PRODUCT_STATUS_META[product.status];
        return (
          <Badge soft variant={meta.variant}>
            {meta.label}
          </Badge>
        );
      },
    },
  ];

  const categoryOptions = [
    { label: 'All categories', value: '' },
    ...(categoriesQuery.data ?? []).map((c) => ({ label: c.name, value: c.id })),
  ];

  return (
    <>
      <Helmet>
        <title>Dream Store — Products</title>
      </Helmet>
      <PageHeader
        title="Dream Store · Products"
        description="Manage the rewards catalog."
        actions={
          <Button
            leftIcon={<Icon name="plus" size="sm" />}
            onClick={() => setForm({ mode: 'create' })}
          >
            New product
          </Button>
        }
      />

      <DreamStoreTabs />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Input
            placeholder="Search products or SKU…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
          />
        </div>
        <div className="w-48">
          <Select
            aria-label="Filter by category"
            options={categoryOptions}
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              resetPage();
            }}
          />
        </div>
        <div className="w-40">
          <Select
            aria-label="Filter by status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              resetPage();
            }}
          />
        </div>
      </div>

      {productsQuery.isError ? (
        <Alert variant="destructive" title="Could not load products">
          <div className="space-y-3">
            <p>{productsQuery.error.message}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void productsQuery.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        </Alert>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={productsQuery.data?.items ?? []}
            getRowId={(product) => product.id}
            isLoading={productsQuery.isPending}
            emptyState="No products match your filters."
            rowActions={(product) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/dream-store/products/${product.id}`)}
                >
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm({ mode: 'edit', product })}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={product.status === 'ARCHIVED'}
                  onClick={() => handleArchive(product)}
                >
                  Archive
                </Button>
              </div>
            )}
          />

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {productsQuery.data?.total ?? 0} products
            </p>
            <Pagination
              page={productsQuery.data?.page ?? 1}
              pageCount={productsQuery.data?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      {form ? (
        <ProductFormDrawer
          isOpen
          onClose={() => setForm(null)}
          categories={categoriesQuery.data ?? []}
          product={form.mode === 'edit' ? form.product : undefined}
          isSubmitting={createProduct.isPending || updateProduct.isPending}
          onSubmit={handleSubmit}
        />
      ) : null}
    </>
  );
}
