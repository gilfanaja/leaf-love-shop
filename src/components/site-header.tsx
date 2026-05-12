import { Link, useRouterState } from "@tanstack/react-router";
import { Leaf, ShoppingCart, User as UserIcon, Package } from "lucide-react";
import { useCart } from "@/store/cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const count = useCart((s) => s.count());
  const { user } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });

  const navLink = (to: string, label: string) => {
    const active = path === to || (to !== "/" && path.startsWith(to));
    return (
      <Link
        to={to}
        className={`text-sm font-medium transition-colors hover:text-primary ${
          active ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-hero text-primary-foreground shadow-soft">
            <Leaf className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold">GreenGrow</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Plant Store</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {navLink("/", "Home")}
          {navLink("/shop", "Shop")}
          {navLink("/orders", "Orders")}
          {navLink("/profile", "Profile")}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="relative">
            <Link to="/cart" aria-label="Cart">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>
          {user ? (
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/profile">
                <UserIcon className="mr-2 h-4 w-4" /> Account
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <Link to="/" className="flex flex-col items-center gap-1 py-2 text-xs">
          <Leaf className="h-4 w-4" /> Home
        </Link>
        <Link to="/shop" className="flex flex-col items-center gap-1 py-2 text-xs">
          <Package className="h-4 w-4" /> Shop
        </Link>
        <Link to="/cart" className="flex flex-col items-center gap-1 py-2 text-xs">
          <ShoppingCart className="h-4 w-4" /> Cart
        </Link>
        <Link to="/profile" className="flex flex-col items-center gap-1 py-2 text-xs">
          <UserIcon className="h-4 w-4" /> Profile
        </Link>
      </nav>
    </header>
  );
}
