import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MessageCircle, ChevronRight } from "lucide-react";
import { formatChatTime } from "@/lib/chat";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "Chat — GreenGrow Store" }] }),
  component: ChatListPage,
});

function ChatListPage() {
  const { user } = useAuth();
  const { data: threads, isLoading } = useQuery({
    queryKey: ["chat-threads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_threads")
        .select("id,subject,product_id,order_id,last_message_at,unread_for_user")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 pb-24">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-hero text-primary-foreground">
          <MessageCircle className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold">Pesan</h1>
          <p className="text-sm text-muted-foreground">Diskusi dengan penjual GreenGrow.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : !threads || threads.length === 0 ? (
        <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground" />
          <div className="font-medium">Belum ada pesan</div>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Mulai diskusi dari halaman produk dengan tombol "Tanya Produk", atau dari halaman pesanan.
          </p>
          <Link
            to="/shop"
            className="mt-5 inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-soft"
          >
            Cari tanaman
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                to="/chat/$id"
                params={{ id: t.id }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-primary/40"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-medium">{t.subject || "Diskusi umum"}</div>
                    {t.unread_for_user > 0 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                        {t.unread_for_user}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {formatChatTime(t.last_message_at)}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
