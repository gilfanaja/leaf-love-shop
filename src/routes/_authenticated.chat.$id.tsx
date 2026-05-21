import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { formatChatTime } from "@/lib/chat";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  head: () => ({ meta: [{ title: "Chat — GreenGrow Store" }] }),
  component: ChatRoomPage,
});

type Msg = {
  id: string;
  sender: "customer" | "admin";
  message: string;
  created_at: string;
};

function ChatRoomPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: thread } = useQuery({
    queryKey: ["chat-thread", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_threads")
        .select("id,subject,product_id,order_id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ["chat-messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id,sender,message,created_at")
        .eq("thread_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  // Clear unread badge for this user
  useEffect(() => {
    if (!user || !thread) return;
    supabase.from("chat_threads").update({ unread_for_user: 0 }).eq("id", id).then(() => {
      qc.invalidateQueries({ queryKey: ["chat-threads", user.id] });
    });
  }, [user, thread, id, qc]);

  // Realtime new messages
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["chat-messages", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages?.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim() || sending) return;
    setSending(true);
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("chat_messages").insert({
      thread_id: id,
      sender: "customer",
      sender_id: user.id,
      message: body,
    });
    setSending(false);
    if (error) {
      toast.error("Gagal mengirim pesan");
      setText(body);
      return;
    }
    toast.success("Pesan terkirim");
    qc.invalidateQueries({ queryKey: ["chat-messages", id] });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col pb-16 md:pb-0">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur">
        <div className="container mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/chat" aria-label="Back">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-hero text-primary-foreground">
            <MessageCircle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{thread?.subject || "Diskusi"}</div>
            <div className="text-[11px] text-muted-foreground">Admin GreenGrow biasanya membalas dalam beberapa jam</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-background">
        <div className="container mx-auto max-w-2xl space-y-2 px-4 py-4">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-12 w-2/3 animate-pulse rounded-2xl bg-secondary" />
              <div className="ml-auto h-12 w-2/3 animate-pulse rounded-2xl bg-secondary" />
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="grid place-items-center py-16 text-center text-sm text-muted-foreground">
              <MessageCircle className="mb-2 h-8 w-8" />
              Belum ada pesan. Mulai percakapan!
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender === "customer";
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-card ${
                      mine
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md bg-card text-foreground"
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">{m.message}</div>
                    <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {formatChatTime(m.created_at)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={send}
        className="sticky bottom-14 z-30 border-t border-border bg-background/95 p-3 backdrop-blur md:bottom-0"
      >
        <div className="container mx-auto flex max-w-2xl items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tulis pesan…"
            className="h-11 rounded-full"
          />
          <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-full" disabled={!text.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
