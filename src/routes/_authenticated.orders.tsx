import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatIDR, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/40",
  processed: "bg-primary/10 text-primary border-primary/30",
  shipped: "bg-accent/20 text-accent-foreground border-accent/40",
  completed: "bg-success/15 text-success border-success/40",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "My Orders — GreenGrow Store" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useAuth();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, payment_status, payment_method, total, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="font-display text-4xl font-semibold">My orders</h1>
      <p className="mt-1 text-muted-foreground">Track your purchases and download invoices.</p>

      <div className="mt-8 space-y-3">
        {isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : !orders || orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">You haven't placed any orders yet.</p>
            <Button asChild className="mt-6"><Link to="/shop">Start shopping</Link></Button>
          </div>
        ) : (
          orders.map((o) => (
            <Link
              key={o.id}
              to="/orders/$id"
              params={{ id: o.id }}
              className="block rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-display text-lg font-semibold">{o.order_number}</div>
                  <div className="text-sm text-muted-foreground">{formatDate(o.created_at)} · {o.payment_method.toUpperCase()}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg font-semibold">{formatIDR(Number(o.total))}</div>
                  <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[o.status] ?? ""}`}>
                    {o.status}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
