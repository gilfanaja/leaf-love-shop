import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useState, useMemo } from "react";

const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(["new", "price-asc", "price-desc"]).optional(),
});

export const Route = createFileRoute("/shop")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Shop — GreenGrow Store" },
      { name: "description", content: "Browse plants, pots, soil, fertilizer and tools. Filter by category and search." },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const [q, setQ] = useState(search.q ?? "");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name,slug").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search.category, search.sort],
    queryFn: async () => {
      let qb = supabase.from("products").select("id,name,slug,price,stock,image_url,category_id,categories!inner(slug)");
      if (search.category) qb = qb.eq("categories.slug", search.category);
      if (search.sort === "price-asc") qb = qb.order("price", { ascending: true });
      else if (search.sort === "price-desc") qb = qb.order("price", { ascending: false });
      else qb = qb.order("created_at", { ascending: false });
      const { data, error } = await qb;
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    const needle = (search.q ?? "").toLowerCase().trim();
    if (!needle) return products;
    return products.filter((p) => p.name.toLowerCase().includes(needle));
  }, [products, search.q]);

  const setCategory = (slug?: string) =>
    navigate({ search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, category: slug }) });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, q: q || undefined }) });
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold">Shop</h1>
          <p className="mt-1 text-muted-foreground">Find your next green companion.</p>
        </div>
        <form onSubmit={submitSearch} className="relative w-full md:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search plants, pots..."
            className="pl-9"
          />
        </form>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <FilterPill active={!search.category} onClick={() => setCategory(undefined)}>All</FilterPill>
        {categories?.map((c) => (
          <FilterPill key={c.id} active={search.category === c.slug} onClick={() => setCategory(c.slug)}>
            {c.name}
          </FilterPill>
        ))}
        <div className="ml-auto">
          <select
            value={search.sort ?? "new"}
            onChange={(e) =>
              navigate({ search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, sort: e.target.value as "new" | "price-asc" | "price-desc" }) })
            }
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm"
          >
            <option value="new">Newest</option>
            <option value="price-asc">Price: low → high</option>
            <option value="price-desc">Price: high → low</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
          No products found.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      className="rounded-full"
      onClick={onClick}
      type="button"
    >
      {children}
    </Button>
  );
}
