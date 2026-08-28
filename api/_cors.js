// Vercel genera una URL de "preview" distinta para cada rama o commit
// (https://gus-fitness-<hash>.vercel.app, https://gus-fitness-git-<rama>-<user>.vercel.app...).
// Sin esto, cualquier deploy que no sea la producción da "Load failed" en TODAS
// las llamadas a /api/*: el navegador bloquea la respuesta porque el servidor
// no manda Access-Control-Allow-Origin para un origen fuera de la lista.
const ALLOWED_ORIGINS = [
  "https://gus-fitness.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

const PREVIEW_ORIGIN_RE = /^https:\/\/gus-fitness-[a-z0-9-]+\.vercel\.app$/i;

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN_RE.test(origin);
}

export function applyCors(req, res, methods = "POST, OPTIONS") {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
