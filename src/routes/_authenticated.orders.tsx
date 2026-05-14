import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatIDR, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Package, Clock, CreditCard, Truck, PackageCheck, XCircle, ChevronRight } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/40",
  processed: "bg-primary/10 text-primary border-primary/30",
  shipped: "bg-accent/20 text-accent-foreground border-accent/40",
  completed: "bg-success/15 text-success border-success/40",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  processed: CreditCard,
  shipped: Truck,
  completed: PackageCheck,
  cancelled: XCircle,
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
    <div className="container mx-auto px-4 py-10 pb-24 md:pb-10">
      <h1 className="font-display text-4xl font-semibold">My orders</h1>
      <p className="mt-1 text-muted-foreground">Track your purchases and download invoices.</p>

      <div className="mt-8 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary" />
          ))
        ) : !orders || orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 font-medium">No orders yet</p>
            <p className="mt-1 text-sm text-muted-foreground">When you place an order, it will appear here.</p>
            <Button asChild className="mt-6"><Link to="/shop">Start shopping</Link></Button>
          </div>
        ) : (
          orders.map((o) => {
            const Icon = STATUS_ICON[o.status] ?? Clock;
            return (
              <Link
                key={o.id}
                to="/orders/$id"
                params={{ id: o.id }}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft sm:p-5"
              >
                <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-display text-base font-semibold sm:text-lg">{o.order_number}</div>
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${STATUS_COLORS[o.status] ?? ""}`}>
                      {o.status}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(o.created_at)} · {o.payment_method.toUpperCase()} · {o.payment_status}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-base font-semibold text-primary sm:text-lg">{formatIDR(Number(o.total))}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
