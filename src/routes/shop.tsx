import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState, useMemo } from "react";

const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(["new", "price-asc", "price-desc"]).optional(),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
});
type Search = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/shop")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Shop — GreenGrow Store" },
      { name: "description", content: "Browse plants, pots, soil, fertilizer and tools. Filter by category, price and search." },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const [q, setQ] = useState(search.q ?? "");
  const [showFilters, setShowFilters] = useState(false);

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
    return products.filter((p) => {
      if (needle && !p.name.toLowerCase().includes(needle)) return false;
      if (search.min != null && p.price < search.min) return false;
      if (search.max != null && p.price > search.max) return false;
      return true;
    });
  }, [products, search.q, search.min, search.max]);

  const setSearch = (patch: Partial<Search>) =>
    navigate({ search: (prev: Search) => ({ ...prev, ...patch }) });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch({ q: q || undefined });
  };

  const activeFilters = [
    search.category && { key: "category", label: `Category: ${search.category}`, clear: () => setSearch({ category: undefined }) },
    search.q && { key: "q", label: `“${search.q}”`, clear: () => { setQ(""); setSearch({ q: undefined }); } },
    (search.min != null || search.max != null) && {
      key: "price",
      label: `Price: ${search.min ?? 0} – ${search.max ?? "∞"}`,
      clear: () => setSearch({ min: undefined, max: undefined }),
    },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  return (
    <div className="container mx-auto px-4 py-10 pb-24 md:pb-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold">Shop</h1>
          <p className="mt-1 text-muted-foreground">Find your next green companion.</p>
        </div>
        <form onSubmit={submitSearch} className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search plants, pots, tools…"
            className="rounded-full pl-9"
          />
        </form>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterPill active={!search.category} onClick={() => setSearch({ category: undefined })}>All</FilterPill>
        {categories?.map((c) => (
          <FilterPill key={c.id} active={search.category === c.slug} onClick={() => setSearch({ category: c.slug })}>
            {c.name}
          </FilterPill>
        ))}
        <Button variant="outline" size="sm" className="ml-auto rounded-full" onClick={() => setShowFilters((v) => !v)}>
          <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> Filters
        </Button>
        <select
          value={search.sort ?? "new"}
          onChange={(e) => setSearch({ sort: e.target.value as Search["sort"] })}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-sm"
        >
          <option value="new">Newest</option>
          <option value="price-asc">Price: low → high</option>
          <option value="price-desc">Price: high → low</option>
        </select>
      </div>

      {showFilters && (
        <div className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Min price (Rp)</label>
            <Input
              type="number"
              min={0}
              defaultValue={search.min ?? ""}
              onBlur={(e) => setSearch({ min: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="0"
              className="mt-1.5"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Max price (Rp)</label>
            <Input
              type="number"
              min={0}
              defaultValue={search.max ?? ""}
              onBlur={(e) => setSearch({ max: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="1.000.000"
              className="mt-1.5"
            />
          </div>
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Active:</span>
          {activeFilters.map((f) => (
            <button
              key={f.key}
              onClick={f.clear}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs hover:bg-secondary/70"
            >
              {f.label} <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center">
          <Search className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 font-medium">No products match your filters</p>
          <p className="mt-1 text-sm text-muted-foreground">Try clearing filters or searching for something else.</p>
        </div>
      ) : (
        <>
          <div className="mb-3 text-xs text-muted-foreground">{filtered.length} product{filtered.length > 1 ? "s" : ""}</div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </>
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
