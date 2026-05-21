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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [startingChat, setStartingChat] = useState(false);

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

          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="w-full"
              disabled={startingChat}
              onClick={async () => {
                if (!user) {
                  navigate({ to: "/auth", search: { redirect: `/shop/${product.slug}` } });
                  return;
                }
                setStartingChat(true);
                try {
                  const tid = await startThread({
                    userId: user.id,
                    subject: `Tanya: ${product.name}`,
                    productId: product.id,
                    initialMessage: `Halo, saya tertarik dengan produk ${product.name}`,
                  });
                  toast.success("Pesan terkirim ke admin");
                  navigate({ to: "/chat/$id", params: { id: tid } });
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : "Gagal memulai chat");
                } finally {
                  setStartingChat(false);
                }
              }}
            >
              <MessageCircle className="mr-2 h-4 w-4" /> Tanya Produk
            </Button>
            <Button asChild variant="outline" className="w-full">
              <a
                href={whatsappUrl(`Halo, saya tertarik dengan produk ${product.name}`)}
                target="_blank"
                rel="noreferrer"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zM6.597 20.13c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                WhatsApp
              </a>
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
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
