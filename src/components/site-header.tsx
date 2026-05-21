import { Link, useRouterState } from "@tanstack/react-router";
import { Leaf, ShoppingCart, User as UserIcon, Package, Heart, Home, Store, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const count = useCart((s) => s.count());
  const wishCount = useWishlist((s) => s.items.length);
  const { user } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });

  const { data: unreadChat = 0 } = useQuery({
    queryKey: ["chat-unread", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_threads")
        .select("unread_for_user")
        .gt("unread_for_user", 0);
      return (data ?? []).reduce((s, t) => s + (t.unread_for_user || 0), 0);
    },
  });

  const isActive = (to: string) => (to === "/" ? path === "/" : path === to || path.startsWith(to + "/"));

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors hover:text-primary ${
        isActive(to) ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
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
          {navLink("/wishlist", "Wishlist")}
          {navLink("/orders", "Orders")}
          {navLink("/chat", "Chat")}
          {navLink("/profile", "Profile")}
        </nav>

        <div className="flex items-center gap-1.5">
          {user && (
            <Button asChild variant="ghost" size="icon" className="relative hidden sm:inline-flex">
              <Link to="/chat" aria-label="Chat">
                <MessageCircle className="h-5 w-5" />
                {unreadChat > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {unreadChat}
                  </span>
                )}
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="icon" className="relative hidden sm:inline-flex">
            <Link to="/wishlist" aria-label="Wishlist">
              <Heart className="h-5 w-5" />
              {wishCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                  {wishCount}
                </span>
              )}
            </Link>
          </Button>
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
            <Button asChild variant="outline" size="sm" className="ml-1 hidden sm:inline-flex">
              <Link to="/profile">
                <UserIcon className="mr-2 h-4 w-4" /> Account
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="ml-1 hidden sm:inline-flex">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile bottom nav with active highlight */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <BottomTab to="/" icon={<Home className="h-5 w-5" />} label="Home" active={isActive("/")} />
        <BottomTab to="/shop" icon={<Store className="h-5 w-5" />} label="Shop" active={isActive("/shop")} />
        <BottomTab to="/cart" icon={<ShoppingCart className="h-5 w-5" />} label="Cart" active={isActive("/cart")} badge={count} />
        <BottomTab to="/orders" icon={<Package className="h-5 w-5" />} label="Orders" active={isActive("/orders")} />
        <BottomTab to="/profile" icon={<UserIcon className="h-5 w-5" />} label="Profile" active={isActive("/profile")} />
      </nav>
    </header>
  );
}

function BottomTab({
  to,
  icon,
  label,
  active,
  badge,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <span className={`relative grid place-items-center rounded-full px-3 py-1 transition ${active ? "bg-primary/10" : ""}`}>
        {icon}
        {badge && badge > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
            {badge}
          </span>
        ) : null}
      </span>
      <span>{label}</span>
    </Link>
  );
}
