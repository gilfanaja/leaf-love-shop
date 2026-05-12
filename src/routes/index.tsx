import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Leaf, Truck, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GreenGrow Store — Bring Nature Home" },
      { name: "description", content: "Curated indoor plants, pots, soil, fertilizer & tools. COD, transfer & e-wallet payments." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: featured } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,price,stock,image_url")
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      {/* Hero */}
      <section className="bg-soft">
        <div className="container mx-auto grid gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-card">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Fresh arrivals every week
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] md:text-6xl">
              Bring nature <span className="text-primary">home</span>.
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground md:text-lg">
              Hand-picked indoor plants, beautiful pots, premium soil & care essentials —
              delivered to your doorstep.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="shadow-soft">
                <Link to="/shop">
                  Shop now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/shop" search={{ category: "plants" } as never}>Browse plants</Link>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 text-sm">
              <Feat icon={<Truck className="h-4 w-4" />} title="Fast delivery" />
              <Feat icon={<ShieldCheck className="h-4 w-4" />} title="Quality guarantee" />
              <Feat icon={<Leaf className="h-4 w-4" />} title="Plant-care tips" />
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-hero opacity-20 blur-3xl" />
            <img
              src="https://images.unsplash.com/photo-1545241047-6083a3684587?w=1200"
              alt="Selection of healthy indoor plants in modern pots"
              className="aspect-[4/5] w-full rounded-3xl object-cover shadow-soft"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-semibold">Shop by category</h2>
            <p className="mt-2 text-muted-foreground">Everything your plant family needs.</p>
          </div>
          <Button asChild variant="ghost">
            <Link to="/shop">View all</Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            { slug: "plants", name: "Plants", img: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600" },
            { slug: "pots", name: "Pots", img: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600" },
            { slug: "soil", name: "Soil", img: "https://images.unsplash.com/photo-1526397751294-331021109fbd?w=600" },
            { slug: "fertilizer", name: "Fertilizer", img: "https://images.unsplash.com/photo-1598902108854-10e335adac99?w=600" },
            { slug: "tools", name: "Tools", img: "https://images.unsplash.com/photo-1599598425947-5fdfc984e0e8?w=600" },
          ].map((c) => (
            <Link
              key={c.slug}
              to="/shop"
              search={{ category: c.slug } as never}
              className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className="aspect-square overflow-hidden">
                <img src={c.img} alt={c.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
              </div>
              <div className="p-3 text-center text-sm font-medium">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="container mx-auto px-4 py-10">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-3xl font-semibold">New arrivals</h2>
          <Button asChild variant="ghost">
            <Link to="/shop">See all</Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {featured?.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </div>
  );
}

function Feat({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-primary">{icon}</span>
      {title}
    </div>
  );
}
