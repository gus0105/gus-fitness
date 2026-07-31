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

const motivational = [
  "¡Sigue así! Cada día cuenta en tu progreso. 💪",
  "Recuerda: consistencia > intensidad. ¡Tú puedes!",
  "¿Has entrenado hoy? Tu versión futura te lo agradecerá.",
  "Un día más de registro = un día más cerca de tu objetivo.",
  "¡Buen trabajo! Llevas semanas de progreso constante.",
];

export default async function handler(req, res) {
  // Verify cron secret
  const secret = req.headers["x-cron-secret"] || req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Current time in Spain
  const now = new Date().toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).replace(",", "").trim();
  const timeNow = now.slice(0, 5);

  // Get all subscriptions
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("*");

  if (error || !subs?.length) return res.status(200).json({ sent: 0, time: timeNow });

  let sent = 0;

  for (const sub of subs) {
    try {
      // Get user's notification config from latest entry
      const { data: entries } = await supabase
        .from("entries")
        .select("data")
        .eq("user_id", sub.user_id)
        .order("date", { ascending: false })
        .limit(3);

      // Find notifConfig in entries
      let config = null;
      for (const e of entries || []) {
        if (e.data?.notifConfig) { config = e.data.notifConfig; break; }
      }

      // Default config if none found
      if (!config) config = {
        meals: { enabled: true, times: ["08:00", "14:00", "21:00"] },
        weight: { enabled: true, time: "07:30" },
        supplements: { enabled: true, time: "09:00" },
        motivational: { enabled: false, time: "19:00" },
      };

      let payload = null;

      if (config.meals?.enabled) {
        for (const t of config.meals.times || []) {
          if (t === timeNow) {
            payload = { title: "Gus Coach 🍽️", body: "¿Has registrado tu comida?", url: "/" };
            break;
          }
        }
      }
      if (!payload && config.weight?.enabled && config.weight.time === timeNow) {
        payload = { title: "Gus Coach ⚖️", body: "¿Te has pesado hoy? Registra tu peso.", url: "/" };
      }
      if (!payload && config.supplements?.enabled && config.supplements.time === timeNow) {
        payload = { title: "Gus Coach 💊", body: "¿Has tomado tus suplementos de hoy?", url: "/" };
      }
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
