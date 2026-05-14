import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";
import { ShoppingCart, Heart, Star } from "lucide-react";

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
  const toggleWish = useWishlist((s) => s.toggle);
  const wished = useWishlist((s) => s.has(product.id));
  const out = product.stock <= 0;

  // Deterministic pseudo-rating per product for visual richness
  const seed = product.id.charCodeAt(0) + product.id.charCodeAt(product.id.length - 1);
  const rating = (4.2 + ((seed % 8) / 10)).toFixed(1);
  const reviews = 12 + (seed % 180);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
      <Link to="/shop/$slug" params={{ slug: product.slug }} className="relative block aspect-square overflow-hidden bg-secondary/40">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">No image</div>
        )}
        {out && (
          <span className="absolute left-3 top-3 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive-foreground">
            Out of stock
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleWish({
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: product.price,
              image_url: product.image_url,
              stock: product.stock,
            });
            toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
          }}
          aria-label="Toggle wishlist"
          className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-background/85 backdrop-blur transition hover:scale-110 ${
            wished ? "text-destructive" : "text-muted-foreground hover:text-destructive"
          }`}
        >
          <Heart className={`h-4 w-4 ${wished ? "fill-current" : ""}`} />
        </button>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link to="/shop/$slug" params={{ slug: product.slug }} className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary">
          {product.name}
        </Link>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-accent text-accent" />
          <span className="font-medium text-foreground">{rating}</span>
          <span>· {reviews} sold</span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="font-display text-base font-semibold text-primary">{formatIDR(product.price)}</div>
          <Button
            size="icon"
            disabled={out}
            onClick={(e) => {
              e.preventDefault();
              add({ id: product.id, name: product.name, price: product.price, image_url: product.image_url, stock: product.stock });
              toast.success(`${product.name} added to cart`);
            }}
            aria-label="Add to cart"
            className="h-9 w-9 rounded-full shadow-soft"
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-square animate-pulse bg-secondary" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-secondary" />
      </div>
    </div>
  );
}
