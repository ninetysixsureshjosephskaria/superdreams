import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { StoreProduct } from '@superdreams/api-client';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardTitle,
  EmptyState,
  Icon,
  LoadingScreen,
} from '@superdreams/ui';

import { gradientFor, monogramFor, STOCK_LABEL, stockVariant } from '../data';
import { useCatalog, useRedeem } from '../hooks';

/** A single Dream Store product card wired to the real redeem mutation. */
function ProductCard({ product }: { product: StoreProduct }): JSX.Element {
  const notify = useNotificationStore((state) => state.notify);
  const redeem = useRedeem();
  const soldOut = product.stockStatus === 'OUT_OF_STOCK' || product.stock <= 0;

  const handleRedeem = (): void => {
    redeem.mutate(
      { productId: product.id, quantity: 1 },
      {
        onSuccess: (result) => {
          notify({
            variant: 'success',
            title: `Redeemed ${product.name}`,
            description: `${result.pointsSpent.toLocaleString()} points spent. New balance: ${result.balanceAfter.toLocaleString()} points.`,
          });
        },
        onError: (error) => {
          notify({ variant: 'error', title: 'Redemption failed', description: error.message });
        },
      },
    );
  };

  return (
    <Card className="flex flex-col overflow-hidden">
      <div
        className="relative flex h-32 items-center justify-center"
        style={{ backgroundImage: gradientFor(product.id) }}
      >
        <span className="text-3xl font-bold tracking-tight text-white">
          {monogramFor(product.name)}
        </span>
        <span className="absolute right-3 top-3">
          <Badge variant={stockVariant(product.stockStatus)}>
            {STOCK_LABEL[product.stockStatus]}
          </Badge>
        </span>
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 pt-5">
        <div className="space-y-1">
          {product.categoryName ? (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {product.categoryName}
            </p>
          ) : null}
          <CardTitle className="text-base">{product.name}</CardTitle>
          {product.description ? (
            <p className="text-sm text-muted-foreground">{product.description}</p>
          ) : null}
        </div>

        <div className="mt-auto space-y-3 pt-1">
          <p className="flex items-baseline gap-1">
            <span className="text-lg font-bold">{product.points.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">points</span>
          </p>
          <Button
            fullWidth
            disabled={soldOut || redeem.isPending}
            isLoading={redeem.isPending}
            leftIcon={<Icon name="gift" size="sm" />}
            onClick={handleRedeem}
          >
            {soldOut ? 'Out of stock' : 'Redeem'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Member Dream Store — real catalog with reward-point redemption. */
export default function DreamStorePage() {
  const catalog = useCatalog({ pageSize: 60 });

  return (
    <>
      <Helmet>
        <title>Dream Store</title>
      </Helmet>
      <PageHeader title="Dream Store" description="Redeem your points for rewards." />

      {catalog.isPending ? (
        <LoadingScreen message="Loading the catalog…" />
      ) : catalog.isError ? (
        <Alert variant="destructive" title="Could not load the catalog">
          {catalog.error.message}
        </Alert>
      ) : catalog.data.items.length === 0 ? (
        <EmptyState
          icon={<Icon name="gift" />}
          title="No products available"
          description="Check back soon — new rewards are added regularly."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {catalog.data.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
}
