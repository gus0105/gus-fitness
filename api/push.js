import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, subscription, user_id, payload } = req.body || {};

  // Save subscription
  if (req.method === "POST" && action === "subscribe") {
    if (!subscription || !user_id) return res.status(400).json({ error: "Missing data" });
    const { error } = await supabase.from("push_subscriptions").upsert(
      { user_id, subscription },
      { onConflict: "user_id" }
    );
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // Send notification
  if (req.method === "POST" && action === "send") {
    if (!user_id || !payload) return res.status(400).json({ error: "Missing data" });
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", user_id)
      .single();
    if (error || !data) return res.status(404).json({ error: "No subscription found" });
    try {
      await webpush.sendNotification(data.subscription, JSON.stringify(payload));
      return res.status(200).json({ ok: true });
    } catch (e) {
      // Subscription expired - delete it
      if (e.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("user_id", user_id);
      }
      return res.status(500).json({ error: e.message });
    }
  }

  // Delete subscription
  if (req.method === "DELETE") {
    if (!user_id) return res.status(400).json({ error: "Missing user_id" });
    await supabase.from("push_subscriptions").delete().eq("user_id", user_id);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
