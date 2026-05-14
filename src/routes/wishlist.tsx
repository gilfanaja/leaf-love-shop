import { createFileRoute, Link } from "@tanstack/react-router";
import { useWishlist } from "@/store/wishlist";
import { useCart } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/format";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist — GreenGrow Store" }] }),
  component: WishlistPage,
});

function WishlistPage() {
  const items = useWishlist((s) => s.items);
  const remove = useWishlist((s) => s.remove);
  const clear = useWishlist((s) => s.clear);
  const add = useCart((s) => s.add);

  if (items.length === 0) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <Heart className="h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 font-display text-3xl font-semibold">Your wishlist is empty</h1>
        <p className="mt-2 text-muted-foreground">Save plants you love to come back to them later.</p>
        <Button asChild className="mt-6"><Link to="/shop">Discover plants</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold">Wishlist</h1>
          <p className="mt-1 text-muted-foreground">{items.length} item{items.length > 1 ? "s" : ""} saved</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { clear(); toast.success("Wishlist cleared"); }}>
          Clear all
        </Button>
      </div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <li key={i.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-card">
            <Link to="/shop/$slug" params={{ slug: i.slug }} className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-secondary">
              {i.image_url && <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" />}
            </Link>
            <div className="flex flex-1 flex-col">
              <Link to="/shop/$slug" params={{ slug: i.slug }} className="line-clamp-2 text-sm font-medium hover:text-primary">{i.name}</Link>
              <div className="mt-1 font-display text-base font-semibold text-primary">{formatIDR(i.price)}</div>
              <div className="mt-auto flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={i.stock <= 0}
                  onClick={() => {
                    add({ id: i.id, name: i.name, price: i.price, image_url: i.image_url, stock: i.stock });
                    toast.success("Added to cart");
                  }}
                >
                  <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Add
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(i.id)} aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
