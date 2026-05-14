import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
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
import { Loader2, Banknote, Wallet, Truck, Upload, Tag, MapPin, User as UserIcon, CreditCard, Check } from "lucide-react";
import { SHIPPING_CITIES, DEFAULT_SHIPPING, applyPromo, FREE_SHIPPING_THRESHOLD, type Promo } from "@/lib/shop-config";

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
  const [city, setCity] = useState<string>(SHIPPING_CITIES[0].city);
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<"cod" | "transfer" | "ewallet">("cod");
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ promo: Promo; discount: number } | null>(null);

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

  const cityCfg = useMemo(() => SHIPPING_CITIES.find((c) => c.city === city) ?? SHIPPING_CITIES[0], [city]);
  const baseShipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : cityCfg.cost;
  const shipping = promo?.promo.code === "FREESHIP" ? 0 : baseShipping;
  const discount = promo && promo.promo.code !== "FREESHIP" ? promo.discount : 0;
  const total = Math.max(0, subtotal + shipping - discount);

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold">Your cart is empty</h1>
        <Button asChild className="mt-6"><Link to="/shop">Browse products</Link></Button>
      </div>
    );
  }

  const tryPromo = () => {
    const result = applyPromo(promoInput, subtotal);
    if (!result) {
      toast.error("Invalid or ineligible promo code");
      return;
    }
    setPromo(result);
    toast.success(`Promo applied: ${result.promo.label}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (method !== "cod" && !proof) {
      toast.error("Please upload payment proof");
      return;
    }

    setSubmitting(true);
    try {
      await supabase.from("profiles").upsert({ id: user.id, full_name: name, phone, address });

      const fullAddress = `${address}\n${city}`;
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          customer_name: name,
          customer_phone: phone,
          customer_address: fullAddress,
          notes: [notes, promo ? `Promo: ${promo.promo.code} (-${formatIDR(discount + (promo.promo.code === "FREESHIP" ? baseShipping : 0))})` : ""].filter(Boolean).join("\n"),
          payment_method: method,
          subtotal,
          shipping,
          total,
        })
        .select("id, order_number")
        .single();
      if (orderErr || !order) throw orderErr ?? new Error("Failed");

      const { error: itemErr } = await supabase.from("order_items").insert(
        items.map((i) => ({ order_id: order.id, product_id: i.id, name: i.name, price: i.price, qty: i.qty }))
      );
      if (itemErr) throw itemErr;

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
    <div className="container mx-auto px-4 py-10 pb-32 lg:pb-10">
      <h1 className="font-display text-4xl font-semibold">Checkout</h1>
      <p className="mt-1 text-sm text-muted-foreground">Almost there — review and confirm your order.</p>

      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Section icon={<UserIcon className="h-4 w-4" />} title="Customer info">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" value={name} onChange={setName} required />
              <Field label="Phone (WhatsApp)" value={phone} onChange={setPhone} required />
            </div>
          </Section>

          <Section icon={<MapPin className="h-4 w-4" />} title="Shipping address">
            <div className="space-y-1.5">
              <Label htmlFor="address">Street, building, notes</Label>
              <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} required rows={3} placeholder="Jl. Mawar No. 12, RT 03/04…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <select
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                {SHIPPING_CITIES.map((c) => (
                  <option key={c.city} value={c.city}>
                    {c.city} — {formatIDR(c.cost)} ({c.eta})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Shipping fee is calculated based on your city.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Order notes (optional)</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="E.g. leave at front desk" />
            </div>
          </Section>

          <Section icon={<CreditCard className="h-4 w-4" />} title="Payment method">
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

        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card lg:sticky lg:top-20">
          <div className="font-display text-xl font-semibold">Summary</div>
          <ul className="space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="truncate">{i.name} <span className="text-muted-foreground">× {i.qty}</span></span>
                <span>{formatIDR(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>

          {/* Promo */}
          <div className="space-y-2 rounded-xl bg-secondary/50 p-3">
            <Label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              <Tag className="h-3.5 w-3.5" /> Promo code
            </Label>
            {promo ? (
              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> {promo.promo.code}</span>
                <button type="button" onClick={() => setPromo(null)} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="GROW10" className="h-9 bg-background" />
                <Button type="button" size="sm" variant="secondary" onClick={tryPromo}>Apply</Button>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">Try <code className="rounded bg-background px-1">GROW10</code>, <code className="rounded bg-background px-1">LEAF25K</code>, <code className="rounded bg-background px-1">FREESHIP</code></p>
          </div>

          <div className="space-y-1 border-t border-border pt-3 text-sm">
            <Row label="Subtotal" value={formatIDR(subtotal)} />
            <Row label={`Shipping · ${city}`} value={shipping === 0 ? "FREE" : formatIDR(shipping)} />
            {discount > 0 && <Row label="Discount" value={`− ${formatIDR(discount)}`} accent />}
          </div>
          <div className="flex justify-between border-t border-border pt-3 font-display text-xl font-semibold">
            <span>Total</span>
            <span className="text-primary">{formatIDR(total)}</span>
          </div>
          <Button type="submit" size="lg" className="w-full shadow-soft" disabled={submitting}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Placing order…</> : `Place order · ${formatIDR(total)}`}
          </Button>
        </aside>
      </form>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary">{icon}</span>
        {title}
      </h2>
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
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${active ? "border-primary bg-primary/5 shadow-card" : "border-border hover:bg-secondary/50"}`}
    >
      <RadioGroupItem id={`pay-${value}`} value={value} className="mt-1" />
      <div className="flex-1">
        <div className="flex items-center gap-2 font-medium">{icon} {title}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{desc}</div>
      </div>
    </Label>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span><span className={accent ? "font-medium text-primary" : "text-foreground"}>{value}</span>
    </div>
  );
}
