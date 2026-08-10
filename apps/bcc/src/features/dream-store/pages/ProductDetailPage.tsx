import { useState, type ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import {
  Alert,
  Badge,
  Button,
  ContentCard,
  EmptyState,
  Icon,
  LoadingScreen,
} from '@superdreams/ui';

import { ProductFormDrawer } from '../components/ProductFormDrawer';
import { PRODUCT_STATUS_META, STOCK_STATUS_META } from '../data';
import { useArchiveProduct, useCategories, useProduct, useUpdateProduct } from '../hooks';
import type { ProductFormValues } from '../validation';

function DetailRow({ label, value }: { label: string; value: ReactNode }): JSX.Element {
  return (
    <div className="flex items-center justify-between border-b py-3 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

/** Dream Store admin — single product detail backed by the real API. */
export default function ProductDetailPage() {
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const { id = '' } = useParams<{ id: string }>();
  const [editing, setEditing] = useState(false);

  const productQuery = useProduct(id);
  const categoriesQuery = useCategories({ includeInactive: true });
  const updateProduct = useUpdateProduct();
  const archiveProduct = useArchiveProduct();

  if (productQuery.isPending) {
    return <LoadingScreen message="Loading product…" />;
  }

  if (productQuery.isError) {
    return (
      <>
        <Helmet>
          <title>Dream Store — Product</title>
        </Helmet>
        <PageHeader title="Product" description="Could not load this product." />
        <EmptyState
          title="Not found"
          description={productQuery.error.message}
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  void productQuery.refetch();
                }}
              >
                Try again
              </Button>
              <Button variant="outline" onClick={() => navigate('/dream-store/products')}>
                Back to products
              </Button>
            </div>
          }
        />
      </>
    );
  }

  const product = productQuery.data;
  const statusMeta = PRODUCT_STATUS_META[product.status];
  const stockMeta = STOCK_STATUS_META[product.stockStatus];

  const handleSubmit = (values: ProductFormValues): void => {
    updateProduct.mutate(
      {
        id: product.id,
        input: {
          name: values.name,
          categoryId: values.categoryId ? values.categoryId : null,
          points: values.points,
          reorderLevel: values.reorderLevel,
          status: values.status,
          description: values.description ?? null,
        },
      },
      {
        onSuccess: () => {
          notify({ variant: 'success', title: 'Product updated', description: values.name });
          setEditing(false);
        },
        onError: (error) =>
          notify({ variant: 'error', title: 'Update failed', description: error.message }),
      },
    );
  };

  const handleArchive = (): void => {
    if (!window.confirm(`Archive "${product.name}"? It will no longer be redeemable.`)) return;
    archiveProduct.mutate(product.id, {
      onSuccess: () => {
        notify({ variant: 'success', title: 'Product archived', description: product.name });
        navigate('/dream-store/products');
      },
      onError: (error) =>
        notify({ variant: 'error', title: 'Archive failed', description: error.message }),
    });
  };

  return (
    <>
      <Helmet>
        <title>{`Dream Store — ${product.name}`}</title>
      </Helmet>
      <PageHeader
        title={product.name}
        description={product.sku}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/dream-store/products')}>
              Back
            </Button>
            <Button
              variant="outline"
              leftIcon={<Icon name="edit" size="sm" />}
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              leftIcon={<Icon name="trash" size="sm" />}
              disabled={product.status === 'ARCHIVED' || archiveProduct.isPending}
              onClick={handleArchive}
            >
              Archive
            </Button>
          </div>
        }
      />

      {product.status === 'ARCHIVED' ? (
        <Alert variant="warning" title="Archived" className="mb-6">
          This product is archived and cannot be redeemed by members.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <ContentCard title="Details" className="lg:col-span-2">
          <dl>
            <DetailRow label="Category" value={product.categoryName ?? '—'} />
            <DetailRow label="Required points" value={product.points.toLocaleString()} />
            <DetailRow
              label="Status"
              value={
                <Badge soft variant={statusMeta.variant}>
                  {statusMeta.label}
                </Badge>
              }
            />
            <DetailRow
              label="Stock"
              value={
                <span className="flex items-center gap-2">
                  {product.stock}
                  <Badge soft variant={stockMeta.variant}>
                    {stockMeta.label}
                  </Badge>
                </span>
              }
            />
            <DetailRow label="Reorder level" value={product.reorderLevel} />
            <DetailRow label="Created" value={new Date(product.createdAt).toLocaleDateString()} />
          </dl>
        </ContentCard>

        <ContentCard title="Description">
          <p className="text-sm text-muted-foreground">
            {product.description ?? 'No description provided.'}
          </p>
        </ContentCard>
      </div>

      {editing ? (
        <ProductFormDrawer
          isOpen
          onClose={() => setEditing(false)}
          categories={categoriesQuery.data ?? []}
          product={product}
          isSubmitting={updateProduct.isPending}
          onSubmit={handleSubmit}
        />
      ) : null}
    </>
  );
}
