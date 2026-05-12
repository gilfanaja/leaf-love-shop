import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/store/cart";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";
import { useState } from "react";
import { Minus, Plus, ChevronLeft, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/shop/$slug")({
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const add = useCart((s) => s.add);
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

  if (isLoading) {
    return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Loading…</div>;
  }
  if (!product) return null;

  const out = product.stock <= 0;

  return (
    <div className="container mx-auto px-4 py-8">
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
          <h1 className="mt-2 font-display text-4xl font-semibold">{product.name}</h1>
          <div className="mt-4 font-display text-3xl font-semibold text-primary">{formatIDR(product.price)}</div>
          <p className="mt-6 text-muted-foreground">{product.description}</p>

          <div className="mt-6 text-sm">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${out ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
              <span className="h-2 w-2 rounded-full bg-current" />
              {out ? "Out of stock" : `${product.stock} in stock`}
            </span>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-border">
              <Button variant="ghost" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(product.stock, Number(e.target.value) || 1)))}
                className="h-9 w-14 border-0 text-center focus-visible:ring-0"
              />
              <Button variant="ghost" size="icon" onClick={() => setQty((q) => Math.min(product.stock, q + 1))}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              size="lg"
              className="flex-1"
              disabled={out}
              onClick={() => {
                add(
                  { id: product.id, name: product.name, price: product.price, image_url: product.image_url, stock: product.stock },
                  qty
                );
                toast.success(`${product.name} × ${qty} added to cart`);
              }}
            >
              <ShoppingCart className="mr-2 h-4 w-4" /> Add to cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
