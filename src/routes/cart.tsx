import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/format";
import { Minus, Plus, Trash2, ShoppingBag, Truck } from "lucide-react";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shop-config";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — GreenGrow Store" }] }),
  component: CartPage,
});

function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart((s) => s.subtotal());

  if (items.length === 0) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-secondary">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">Discover beautiful plants, planters and care essentials.</p>
        <Button asChild size="lg" className="mt-6 shadow-soft">
          <Link to="/shop">Start shopping</Link>
        </Button>
      </div>
    );
  }

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div className="container mx-auto px-4 py-10 pb-32 lg:pb-10">
      <h1 className="font-display text-4xl font-semibold">Your cart</h1>
      <p className="mt-1 text-sm text-muted-foreground">{items.length} item{items.length > 1 ? "s" : ""} · review and proceed to checkout</p>

      {/* Free-shipping progress */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2 text-sm">
          <Truck className="h-4 w-4 text-primary" />
          {remaining > 0 ? (
            <span>Add <strong className="text-primary">{formatIDR(remaining)}</strong> more for free shipping</span>
          ) : (
            <span className="font-medium text-primary">🎉 You qualify for free shipping!</span>
          )}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-hero transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.id} className="flex gap-4 rounded-2xl border border-border bg-card p-3 shadow-card sm:p-4">
              <Link to="/shop" className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-secondary sm:h-28 sm:w-28">
                {i.image_url && <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" />}
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <Link to="/shop" className="line-clamp-2 text-sm font-medium hover:text-primary sm:text-base">{i.name}</Link>
                  <button onClick={() => remove(i.id)} className="text-muted-foreground transition hover:text-destructive" aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{formatIDR(i.price)} each</div>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="inline-flex items-center rounded-full border border-border bg-background">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setQty(i.id, i.qty - 1)} disabled={i.qty <= 1}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{i.qty}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setQty(i.id, i.qty + 1)} disabled={i.qty >= i.stock}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="font-display text-base font-semibold text-primary">{formatIDR(i.price * i.qty)}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-card lg:sticky lg:top-20">
          <div className="font-display text-xl font-semibold">Order summary</div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal ({items.length} items)</dt>
              <dd className="font-medium">{formatIDR(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="text-muted-foreground">Calculated at checkout</dd>
            </div>
          </dl>
          <div className="mt-4 flex justify-between border-t border-border pt-4 font-display text-lg font-semibold">
            <span>Estimated total</span>
            <span className="text-primary">{formatIDR(subtotal)}</span>
          </div>
          <Button asChild size="lg" className="mt-6 w-full shadow-soft">
            <Link to="/checkout">Proceed to checkout</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="mt-2 w-full">
            <Link to="/shop">Continue shopping</Link>
          </Button>
        </aside>
      </div>

      {/* Mobile sticky checkout bar */}
      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-border bg-background/95 p-3 shadow-soft backdrop-blur lg:hidden">
        <div className="container mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="font-display text-lg font-semibold text-primary">{formatIDR(subtotal)}</div>
          </div>
          <Button asChild size="lg" className="shadow-soft">
            <Link to="/checkout">Checkout →</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
