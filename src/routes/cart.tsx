import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/format";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

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
        <ShoppingBag className="h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 font-display text-3xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Discover beautiful plants and accessories.</p>
        <Button asChild className="mt-6">
          <Link to="/shop">Start shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="font-display text-4xl font-semibold">Your cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.id} className="flex gap-4 rounded-2xl border border-border bg-card p-3 shadow-card">
              {i.image_url && (
                <img src={i.image_url} alt={i.name} className="h-24 w-24 flex-shrink-0 rounded-xl object-cover" />
              )}
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <Link to="/shop" className="font-medium hover:text-primary">{i.name}</Link>
                  <button onClick={() => remove(i.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{formatIDR(i.price)}</div>
                <div className="mt-auto flex items-center justify-between">
                  <div className="inline-flex items-center rounded-full border border-border">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(i.id, i.qty - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm">{i.qty}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(i.id, i.qty + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="font-medium">{formatIDR(i.price * i.qty)}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="font-display text-xl font-semibold">Order summary</div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatIDR(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>Calculated at checkout</dd>
            </div>
          </dl>
          <div className="mt-4 flex justify-between border-t border-border pt-4 font-display text-lg font-semibold">
            <span>Total</span>
            <span>{formatIDR(subtotal)}</span>
          </div>
          <Button asChild size="lg" className="mt-6 w-full">
            <Link to="/checkout">Checkout</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
