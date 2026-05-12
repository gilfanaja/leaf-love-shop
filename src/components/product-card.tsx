import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useCart } from "@/store/cart";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  image_url: string | null;
};

export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const out = product.stock <= 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-soft">
      <Link to="/shop/$slug" params={{ slug: product.slug }} className="relative block aspect-square overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center bg-secondary text-muted-foreground">No image</div>
        )}
        {out && (
          <span className="absolute left-3 top-3 rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">
            Out of stock
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link to="/shop/$slug" params={{ slug: product.slug }} className="font-medium leading-tight hover:text-primary">
          {product.name}
        </Link>
        <div className="mt-auto flex items-center justify-between">
          <div className="font-display text-lg font-semibold">{formatIDR(product.price)}</div>
          <Button
            size="icon"
            variant="secondary"
            disabled={out}
            onClick={(e) => {
              e.preventDefault();
              add({ id: product.id, name: product.name, price: product.price, image_url: product.image_url, stock: product.stock });
              toast.success(`${product.name} added to cart`);
            }}
            aria-label="Add to cart"
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
