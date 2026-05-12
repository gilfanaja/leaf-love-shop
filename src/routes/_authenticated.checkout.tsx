import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/store/cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, Banknote, Wallet, Truck, Upload } from "lucide-react";

const SHIPPING_FLAT = 20000;

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({ meta: [{ title: "Checkout — GreenGrow Store" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const clear = useCart((s) => s.clear);
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<"cod" | "transfer" | "ewallet">("cod");
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setAddress(profile.address ?? "");
    }
  }, [profile]);

  const total = subtotal + SHIPPING_FLAT;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold">Your cart is empty</h1>
        <Button asChild className="mt-6"><Link to="/shop">Browse products</Link></Button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (method !== "cod" && !proof) {
      toast.error("Please upload payment proof");
      return;
    }

    setSubmitting(true);
    try {
      // Save profile
      await supabase.from("profiles").upsert({ id: user.id, full_name: name, phone, address });

      // Insert order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          customer_name: name,
          customer_phone: phone,
          customer_address: address,
          notes,
          payment_method: method,
          subtotal,
          shipping: SHIPPING_FLAT,
          total,
        })
        .select("id, order_number")
        .single();
      if (orderErr || !order) throw orderErr ?? new Error("Failed");

      // Insert items
      const { error: itemErr } = await supabase.from("order_items").insert(
        items.map((i) => ({ order_id: order.id, product_id: i.id, name: i.name, price: i.price, qty: i.qty }))
      );
      if (itemErr) throw itemErr;

      // Upload proof if needed
      if (proof) {
        const path = `${user.id}/${order.id}-${proof.name}`;
        const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, proof, { upsert: true });
        if (upErr) throw upErr;
        await supabase.from("orders").update({ payment_proof_url: path }).eq("id", order.id);
      }

      clear();
      toast.success(`Order ${order.order_number} placed!`);
      navigate({ to: "/orders/$id", params: { id: order.id } });
    } catch (err) {
      console.error(err);
      toast.error("Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="font-display text-4xl font-semibold">Checkout</h1>
      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Section title="Shipping details">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" value={name} onChange={setName} required />
              <Field label="Phone" value={phone} onChange={setPhone} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} required rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Order notes (optional)</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </Section>

          <Section title="Payment method">
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as typeof method)} className="grid gap-2">
              <PayOption value="cod" current={method} icon={<Truck className="h-4 w-4" />} title="Cash on Delivery" desc="Pay when your order arrives." />
              <PayOption value="transfer" current={method} icon={<Banknote className="h-4 w-4" />} title="Bank Transfer" desc="BCA 1234567890 a/n GreenGrow Store" />
              <PayOption value="ewallet" current={method} icon={<Wallet className="h-4 w-4" />} title="E-Wallet" desc="GoPay / OVO / Dana — 0812 0000 0000" />
            </RadioGroup>

            {method !== "cod" && (
              <div className="mt-4 rounded-xl border border-dashed border-border p-4">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Upload className="h-4 w-4" /> Upload payment proof
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  className="mt-2"
                  onChange={(e) => setProof(e.target.files?.[0] ?? null)}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  We'll verify your payment and update the order status.
                </p>
              </div>
            )}
          </Section>
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="font-display text-xl font-semibold">Summary</div>
          <ul className="space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="truncate">{i.name} <span className="text-muted-foreground">× {i.qty}</span></span>
                <span>{formatIDR(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-border pt-3 text-sm">
            <Row label="Subtotal" value={formatIDR(subtotal)} />
            <Row label="Shipping" value={formatIDR(SHIPPING_FLAT)} />
          </div>
          <div className="flex justify-between border-t border-border pt-3 font-display text-lg font-semibold">
            <span>Total</span>
            <span>{formatIDR(total)}</span>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Placing order…</> : "Place order"}
          </Button>
        </aside>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <h2 className="mb-4 font-display text-xl font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, ...props }: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </div>
  );
}

function PayOption({ value, current, icon, title, desc }: { value: string; current: string; icon: React.ReactNode; title: string; desc: string }) {
  const active = value === current;
  return (
    <Label
      htmlFor={`pay-${value}`}
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${active ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"}`}
    >
      <RadioGroupItem id={`pay-${value}`} value={value} className="mt-1" />
      <div className="flex-1">
        <div className="flex items-center gap-2 font-medium">{icon} {title}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{desc}</div>
      </div>
    </Label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span><span className="text-foreground">{value}</span>
    </div>
  );
}
