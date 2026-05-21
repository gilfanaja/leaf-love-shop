import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatIDR, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Download, ChevronLeft, Leaf, MessageCircle, Printer, Clock, CreditCard, Truck, PackageCheck, XCircle } from "lucide-react";
import jsPDF from "jspdf";
import { whatsappUrl } from "@/lib/shop-config";
import { startThread } from "@/lib/chat";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/40",
  processed: "bg-primary/10 text-primary border-primary/30",
  shipped: "bg-accent/20 text-accent-foreground border-accent/40",
  completed: "bg-success/15 text-success border-success/40",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

const TIMELINE: { key: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "pending", label: "Order placed", icon: Clock },
  { key: "processed", label: "Payment confirmed", icon: CreditCard },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "completed", label: "Delivered", icon: PackageCheck },
];

export const Route = createFileRoute("/_authenticated/orders/$id")({
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [startingChat, setStartingChat] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const [{ data: order, error: e1 }, { data: items, error: e2 }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return { order, items: items ?? [] };
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <div className="h-96 animate-pulse rounded-3xl bg-secondary" />
      </div>
    );
  }
  if (!data?.order) return <div className="container mx-auto px-4 py-20 text-center">Order not found</div>;

  const { order, items } = data;
  const cancelled = order.status === "cancelled";
  const activeStep = cancelled ? -1 : TIMELINE.findIndex((t) => t.key === order.status);

  const sendWhatsApp = () => {
    const lines = [
      `Hi GreenGrow! I'd like to follow up on my order *${order.order_number}*`,
      ``,
      ...items.map((it) => `• ${it.name} × ${it.qty} — ${formatIDR(Number(it.price) * it.qty)}`),
      ``,
      `Total: ${formatIDR(Number(order.total))}`,
      `Payment: ${order.payment_method.toUpperCase()} (${order.payment_status})`,
      `Status: ${order.status}`,
    ];
    window.open(whatsappUrl(lines.join("\n")), "_blank");
  };

  const downloadInvoice = () => {
    const doc = new jsPDF();
    const left = 14;
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("GreenGrow Store", left, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Plant Store · hello@greengrow.shop", left, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("INVOICE", 200 - left, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`No: ${order.order_number}`, 200 - left, y + 6, { align: "right" });
    doc.text(`Date: ${formatDate(order.created_at)}`, 200 - left, y + 11, { align: "right" });

    y += 25;
    doc.setDrawColor(220);
    doc.line(left, y, 200 - left, y);

    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Bill to:", left, y);
    doc.setFont("helvetica", "normal");
    doc.text(order.customer_name, left, y + 6);
    const addrLines = doc.splitTextToSize(order.customer_address, 90);
    doc.text(addrLines, left, y + 11);
    doc.text(`Phone: ${order.customer_phone}`, left, y + 11 + addrLines.length * 5);

    doc.setFont("helvetica", "bold");
    doc.text("Payment:", 120, y);
    doc.setFont("helvetica", "normal");
    doc.text(`Method: ${order.payment_method.toUpperCase()}`, 120, y + 6);
    doc.text(`Status: ${order.payment_status}`, 120, y + 11);
    doc.text(`Order: ${order.status}`, 120, y + 16);

    y += 40;
    doc.setFillColor(240, 245, 240);
    doc.rect(left, y, 200 - 2 * left, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Item", left + 2, y + 5.5);
    doc.text("Qty", 130, y + 5.5);
    doc.text("Price", 150, y + 5.5);
    doc.text("Subtotal", 200 - left - 2, y + 5.5, { align: "right" });
    y += 10;

    doc.setFont("helvetica", "normal");
    items.forEach((it) => {
      doc.text(String(it.name), left + 2, y);
      doc.text(String(it.qty), 130, y);
      doc.text(formatIDR(Number(it.price)), 150, y);
      doc.text(formatIDR(Number(it.price) * it.qty), 200 - left - 2, y, { align: "right" });
      y += 7;
    });

    y += 4;
    doc.line(120, y, 200 - left, y);
    y += 6;
    const totRow = (label: string, val: string, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(label, 130, y);
      doc.text(val, 200 - left - 2, y, { align: "right" });
      y += 6;
    };
    totRow("Subtotal", formatIDR(Number(order.subtotal)));
    totRow("Shipping", formatIDR(Number(order.shipping)));
    totRow("Total", formatIDR(Number(order.total)), true);

    y += 12;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("Thank you for shopping with GreenGrow Store!", left, y);

    doc.save(`Invoice-${order.order_number}.pdf`);
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 pb-32 md:pb-10">
      <Link to="/orders" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary print:hidden">
        <ChevronLeft className="h-4 w-4" /> Back to orders
      </Link>

      {/* Status timeline */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-card print:hidden">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Order status</div>
            <div className="mt-1 font-display text-lg font-semibold capitalize">{order.status}</div>
          </div>
          <span className={`inline-block rounded-full border px-3 py-1 text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? ""}`}>
            {order.status}
          </span>
        </div>

        {cancelled ? (
          <div className="flex items-center gap-3 rounded-xl bg-destructive/5 p-4 text-sm text-destructive">
            <XCircle className="h-5 w-5" /> This order was cancelled.
          </div>
        ) : (
          <ol className="relative grid grid-cols-4 gap-2">
            <div className="absolute left-4 right-4 top-4 -z-0 h-0.5 bg-border" />
            <div
              className="absolute left-4 top-4 -z-0 h-0.5 bg-primary transition-all duration-500"
              style={{ width: `calc((100% - 2rem) * ${Math.max(0, activeStep) / (TIMELINE.length - 1)})` }}
            />
            {TIMELINE.map((s, idx) => {
              const done = idx <= activeStep;
              const Icon = s.icon;
              return (
                <li key={s.key} className="relative z-10 flex flex-col items-center text-center">
                  <span className={`grid h-9 w-9 place-items-center rounded-full border-2 transition ${done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className={`mt-2 text-[11px] font-medium leading-tight ${done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-card p-8 shadow-card print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-hero text-primary-foreground"><Leaf className="h-4 w-4" /></span>
              <span className="font-display text-xl font-semibold">GreenGrow Store</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">hello@greengrow.shop · +62 812 0000 0000</p>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-semibold">Invoice</div>
            <div className="text-sm text-muted-foreground">{order.order_number}</div>
            <div className="text-sm text-muted-foreground">{formatDate(order.created_at)}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Bill to</div>
            <div className="mt-2 font-medium">{order.customer_name}</div>
            <div className="text-sm text-muted-foreground">{order.customer_phone}</div>
            <div className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{order.customer_address}</div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Payment</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? ""}`}>{order.status}</span>
              <span className="inline-block rounded-full border border-border px-2.5 py-0.5 text-xs font-medium capitalize">
                {order.payment_method.toUpperCase()} · {order.payment_status}
              </span>
            </div>
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr><th className="py-2">Item</th><th className="py-2 text-center">Qty</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Total</th></tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-border/60">
                <td className="py-3">{it.name}</td>
                <td className="py-3 text-center">{it.qty}</td>
                <td className="py-3 text-right">{formatIDR(Number(it.price))}</td>
                <td className="py-3 text-right">{formatIDR(Number(it.price) * it.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-6 max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatIDR(Number(order.subtotal))}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatIDR(Number(order.shipping))}</span></div>
          <div className="flex justify-between border-t border-border pt-2 font-display text-lg font-semibold"><span>Total</span><span className="text-primary">{formatIDR(Number(order.total))}</span></div>
        </div>

        {order.notes && (
          <div className="mt-6 rounded-xl bg-secondary/60 p-4 text-sm">
            <div className="font-medium">Notes</div>
            <div className="mt-1 whitespace-pre-line text-muted-foreground">{order.notes}</div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2 print:hidden">
        <Button onClick={downloadInvoice} className="shadow-soft"><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
        <Button variant="outline" onClick={sendWhatsApp} className="text-success-foreground">
          <MessageCircle className="mr-2 h-4 w-4" /> Chat seller on WhatsApp
        </Button>
      </div>
    </div>
  );
}
