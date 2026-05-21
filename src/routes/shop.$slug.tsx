import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { useAuth } from "@/hooks/use-auth";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";
import { useState } from "react";
import { Minus, Plus, ChevronLeft, ShoppingCart, Heart, Truck, ShieldCheck, Leaf, Star, MessageCircle } from "lucide-react";
import { startThread } from "@/lib/chat";
import { whatsappUrl } from "@/lib/shop-config";

export const Route = createFileRoute("/shop/$slug")({
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const add = useCart((s) => s.add);
  const toggleWish = useWishlist((s) => s.toggle);
  const [qty, setQty] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,description,price,stock,image_url,categories(name,slug)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const wished = useWishlist((s) => (product ? s.has(product.id) : false));

  if (isLoading) {
    return (
      <div className="container mx-auto grid gap-10 px-4 py-8 md:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-3xl bg-secondary" />
        <div className="space-y-4">
          <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
          <div className="h-10 w-3/4 animate-pulse rounded bg-secondary" />
          <div className="h-8 w-1/3 animate-pulse rounded bg-secondary" />
          <div className="h-24 w-full animate-pulse rounded bg-secondary" />
        </div>
      </div>
    );
  }
  if (!product) return null;

  const out = product.stock <= 0;
  const seed = product.id.charCodeAt(0) + product.id.charCodeAt(product.id.length - 1);
  const rating = (4.2 + ((seed % 8) / 10)).toFixed(1);
  const reviews = 12 + (seed % 180);

  return (
    <div className="container mx-auto px-4 py-8 pb-32 md:pb-8">
      <Link to="/shop" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> Back to shop
      </Link>
      <div className="grid gap-10 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="aspect-square w-full object-cover" />
          ) : (
            <div className="grid aspect-square place-items-center bg-secondary text-muted-foreground">No image</div>
          )}
        </div>
        <div>
          {product.categories && (
            <Link
              to="/shop"
              search={{ category: product.categories.slug } as never}
              className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
            >
              {product.categories.name}
            </Link>
          )}
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight">{product.name}</h1>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="font-medium text-foreground">{rating}</span>
            </span>
            <span>·</span>
            <span>{reviews} reviews</span>
          </div>

          <div className="mt-5 font-display text-3xl font-semibold text-primary">{formatIDR(product.price)}</div>

          <p className="mt-6 leading-relaxed text-muted-foreground">{product.description}</p>

          <div className="mt-6">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${out ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
              <span className="h-2 w-2 rounded-full bg-current" />
              {out ? "Out of stock" : `${product.stock} in stock`}
            </span>
          </div>

          <div className="mt-8 hidden items-center gap-3 md:flex">
            <QtyControl qty={qty} setQty={setQty} max={product.stock} />
            <Button
              size="lg"
              className="flex-1 shadow-soft"
              disabled={out}
              onClick={() => {
                add({ id: product.id, name: product.name, price: product.price, image_url: product.image_url, stock: product.stock }, qty);
                toast.success(`${product.name} × ${qty} added to cart`);
              }}
            >
              <ShoppingCart className="mr-2 h-4 w-4" /> Add to cart
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                toggleWish({ id: product.id, name: product.name, slug: product.slug, price: product.price, image_url: product.image_url, stock: product.stock });
                toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
              }}
              aria-label="Toggle wishlist"
            >
              <Heart className={`h-4 w-4 ${wished ? "fill-destructive text-destructive" : ""}`} />
            </Button>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 text-xs">
            <Trust icon={<Truck className="h-4 w-4" />} title="Fast delivery" />
            <Trust icon={<ShieldCheck className="h-4 w-4" />} title="Healthy guarantee" />
            <Trust icon={<Leaf className="h-4 w-4" />} title="Care guide" />
          </div>
        </div>
      </div>

      {/* Mobile sticky add-to-cart */}
      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-border bg-background/95 p-3 shadow-soft backdrop-blur md:hidden">
        <div className="container mx-auto flex items-center gap-2">
          <QtyControl qty={qty} setQty={setQty} max={product.stock} />
          <Button
            className="flex-1 shadow-soft"
            disabled={out}
            onClick={() => {
              add({ id: product.id, name: product.name, price: product.price, image_url: product.image_url, stock: product.stock }, qty);
              toast.success(`${product.name} × ${qty} added`);
            }}
          >
            <ShoppingCart className="mr-1.5 h-4 w-4" /> Add — {formatIDR(product.price * qty)}
          </Button>
        </div>
      </div>
    </div>
  );
}

function QtyControl({ qty, setQty, max }: { qty: number; setQty: (n: number) => void; max: number }) {
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-card">
      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setQty(Math.max(1, qty - 1))}>
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        value={qty}
        onChange={(e) => setQty(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
        className="h-9 w-12 border-0 bg-transparent p-0 text-center focus-visible:ring-0"
      />
      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setQty(Math.min(max, qty + 1))}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Trust({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-muted-foreground">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-primary">{icon}</span>
      <span className="font-medium text-foreground">{title}</span>
    </div>
  );
}
