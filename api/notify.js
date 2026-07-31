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

// This endpoint is called by Vercel Cron Jobs
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const hour = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid", hour: "numeric", hour12: false }).padStart(2, "0");
  const minute = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid", minute: "numeric" }).padStart(2, "0");
  const timeNow = `${hour}:${minute}`;
  const dayOfWeek = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid", weekday: "long" });

  // Get all subscriptions
  const { data: subs } = await supabase.from("push_subscriptions").select("*");
  if (!subs?.length) return res.status(200).json({ sent: 0 });

  const motivational = [
    "¡Sigue así! Cada día cuenta en tu progreso. 💪",
    "Recuerda: consistencia > intensidad. ¡Tú puedes!",
    "¿Has entrenado hoy? Tu versión futura te lo agradecerá.",
    "Un día más de registro = un día más cerca de tu objetivo.",
    "¡Buen trabajo! Llevas semanas de progreso constante.",
  ];

  let sent = 0;
  for (const sub of subs) {
    try {
      // Get user settings from Supabase
      const { data: entry } = await supabase
        .from("entries")
        .select("data")
        .eq("user_id", sub.user_id)
        .order("date", { ascending: false })
        .limit(1)
        .single();

      // Default notification config
      const config = entry?.data?.notifConfig || {
        meals: { enabled: true, times: ["08:00", "14:00", "21:00"] },
        weight: { enabled: true, time: "07:30" },
        supplements: { enabled: true, time: "09:00" },
        motivational: { enabled: false, time: "19:00" },
      };

      let payload = null;

      // Check meal times
      if (config.meals?.enabled) {
        for (const t of config.meals.times) {
          if (t === timeNow) {
            payload = { title: "Gus Coach 🍽️", body: "¿Has registrado tu comida?", url: "/" };
            break;
          }
        }
      }
      // Weight
      if (!payload && config.weight?.enabled && config.weight.time === timeNow) {
        payload = { title: "Gus Coach ⚖️", body: "¿Te has pesado hoy? Registra tu peso.", url: "/" };
      }
      // Supplements
      if (!payload && config.supplements?.enabled && config.supplements.time === timeNow) {
        payload = { title: "Gus Coach 💊", body: "¿Has tomado tus suplementos de hoy?", url: "/" };
      }
      // Motivational
      if (!payload && config.motivational?.enabled && config.motivational.time === timeNow) {
        payload = { title: "Gus Coach 🎯", body: motivational[Math.floor(Math.random() * motivational.length)], url: "/" };
      }

      if (payload) {
        await webpush.sendNotification(sub.subscription, JSON.stringify(payload));
        sent++;
      }
    } catch (e) {
      if (e.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("user_id", sub.user_id);
      }
    }
  }

  return res.status(200).json({ sent, time: timeNow });
}
