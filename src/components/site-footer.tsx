import { Leaf } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-soft pb-20 pt-12 md:pb-12">
      <div className="container mx-auto grid gap-8 px-4 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-hero text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-semibold">GreenGrow</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Plants, pots & care essentials — delivered to your doorstep.
          </p>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-medium">Customer</div>
          <ul className="space-y-1 text-muted-foreground">
            <li>COD, Bank Transfer & E-Wallet</li>
            <li>Order tracking</li>
            <li>Auto invoices</li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-medium">Contact</div>
          <ul className="space-y-1 text-muted-foreground">
            <li>hello@greengrow.shop</li>
            <li>+62 812 0000 0000</li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto mt-8 border-t border-border px-4 pt-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} GreenGrow Store. All rights reserved.
      </div>
    </footer>
  );
}
