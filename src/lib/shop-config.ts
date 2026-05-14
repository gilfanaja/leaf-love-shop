// Static config for promo codes and city-based shipping.
// No backend changes — keep beginner-friendly and easy to extend.

export const FREE_SHIPPING_THRESHOLD = 250000;

export const SHIPPING_CITIES: { city: string; cost: number; eta: string }[] = [
  { city: "Jakarta", cost: 15000, eta: "1–2 days" },
  { city: "Bogor", cost: 18000, eta: "1–2 days" },
  { city: "Depok", cost: 18000, eta: "1–2 days" },
  { city: "Tangerang", cost: 18000, eta: "1–2 days" },
  { city: "Bekasi", cost: 18000, eta: "1–2 days" },
  { city: "Bandung", cost: 25000, eta: "2–3 days" },
  { city: "Semarang", cost: 30000, eta: "2–4 days" },
  { city: "Yogyakarta", cost: 30000, eta: "2–4 days" },
  { city: "Surabaya", cost: 35000, eta: "3–4 days" },
  { city: "Medan", cost: 45000, eta: "3–5 days" },
  { city: "Makassar", cost: 50000, eta: "4–6 days" },
  { city: "Denpasar", cost: 40000, eta: "3–5 days" },
];

export const DEFAULT_SHIPPING = 20000;

export type Promo = { code: string; type: "percent" | "fixed"; value: number; min?: number; label: string };

export const PROMOS: Promo[] = [
  { code: "GROW10", type: "percent", value: 10, min: 100000, label: "10% off (min Rp100.000)" },
  { code: "LEAF25K", type: "fixed", value: 25000, min: 150000, label: "Rp25.000 off (min Rp150.000)" },
  { code: "FREESHIP", type: "fixed", value: DEFAULT_SHIPPING, min: 0, label: "Free shipping" },
];

export function applyPromo(code: string, subtotal: number): { promo: Promo; discount: number } | null {
  const promo = PROMOS.find((p) => p.code.toUpperCase() === code.trim().toUpperCase());
  if (!promo) return null;
  if (promo.min && subtotal < promo.min) return null;
  const discount = promo.type === "percent" ? Math.floor((subtotal * promo.value) / 100) : promo.value;
  return { promo, discount: Math.min(discount, subtotal) };
}

export const WHATSAPP_NUMBER = "6281200000000"; // GreenGrow seller (intl format, no +)

export function whatsappUrl(message: string, number = WHATSAPP_NUMBER) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
