import { supabase } from "@/integrations/supabase/client";

export type StartThreadInput = {
  userId: string;
  subject: string;
  productId?: string | null;
  orderId?: string | null;
  initialMessage?: string;
};

/** Find an open thread for the same product/order/subject, or create one. */
export async function startThread(input: StartThreadInput) {
  const { userId, subject, productId = null, orderId = null, initialMessage } = input;

  // Try to find existing thread for this product/order
  let q = supabase.from("chat_threads").select("id").eq("user_id", userId);
  if (productId) q = q.eq("product_id", productId);
  else if (orderId) q = q.eq("order_id", orderId);
  else q = q.is("product_id", null).is("order_id", null).eq("subject", subject);

  const { data: existing } = await q.limit(1).maybeSingle();

  let threadId = existing?.id as string | undefined;

  if (!threadId) {
    const { data, error } = await supabase
      .from("chat_threads")
      .insert({ user_id: userId, subject, product_id: productId, order_id: orderId })
      .select("id")
      .single();
    if (error) throw error;
    threadId = data.id;
  }

  if (initialMessage && threadId) {
    await supabase.from("chat_messages").insert({
      thread_id: threadId,
      sender: "customer",
      sender_id: userId,
      message: initialMessage,
    });
  }

  return threadId!;
}

export function formatChatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
