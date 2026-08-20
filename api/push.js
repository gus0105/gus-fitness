import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_ORIGINS = [
  "https://gus-fitness.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

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
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Requiere sesión válida — el user_id siempre sale del token, nunca del body,
  // para que nadie pueda suscribir/borrar/enviar notificaciones a otra cuenta
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No autenticado" });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Sesión inválida" });
  const userId = user.id;

  const { action, subscription, payload } = req.body || {};

  // Save subscription
  if (req.method === "POST" && action === "subscribe") {
    if (!subscription) return res.status(400).json({ error: "Missing data" });
    const { error } = await supabase.from("push_subscriptions").upsert(
      { user_id: userId, subscription },
      { onConflict: "user_id" }
    );
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // Send notification (a uno mismo)
  if (req.method === "POST" && action === "send") {
    if (!payload) return res.status(400).json({ error: "Missing data" });
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", userId)
      .single();
    if (error || !data) return res.status(404).json({ error: "No subscription found" });
    try {
      await webpush.sendNotification(data.subscription, JSON.stringify(payload));
      return res.status(200).json({ ok: true });
    } catch (e) {
      // Subscription expired - delete it
      if (e.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("user_id", userId);
      }
      return res.status(500).json({ error: e.message });
    }
  }

  // Delete subscription
  if (req.method === "DELETE") {
    await supabase.from("push_subscriptions").delete().eq("user_id", userId);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
