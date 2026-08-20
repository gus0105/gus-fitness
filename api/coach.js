import { createClient } from "@supabase/supabase-js";

const ALLOWED_ORIGINS = [
  "https://gus-fitness.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Requiere sesión válida de Supabase — evita que cualquiera gaste cuota de IA sin estar autenticado
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No autenticado" });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Sesión inválida" });

  try {
    const { prompt, system, image } = req.body;

    let content;
    if (image) {
      content = [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
        { type: "text", text: prompt }
      ];
    } else {
      content = prompt;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    return res.status(200).json({ text: data.content?.[0]?.text ?? "Sin respuesta." });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
