import { useState, useEffect, useRef, Component } from "react";
import { createClient } from "@supabase/supabase-js";

const SECTION_COLORS = {
  home:         { primary:"#4ade80", bg:"#091209" },
  stats:        { primary:"#38bdf8", bg:"#080f12" },
  achievements: { primary:"#fbbf24", bg:"#0f0e08" },
  history:      { primary:"#a78bfa", bg:"#0d0a12" },
  chat:         { primary:"#fb923c", bg:"#12090a" },
  settings:     { primary:"#94a3b8", bg:"#09090f" },
  addMeal:      { primary:"#4ade80", bg:"#091209" },
  addDrink:     { primary:"#38bdf8", bg:"#080f12" },
  result:       { primary:"#4ade80", bg:"#091209" },
};

const VAPID_PUBLIC_KEY = "BFwI7qyDop2L5b_qWzhUkN11v9QGwnyKHHSZ0nePV476l63-No51_f0A-J7hBRY-XNV2z4dzp_4Nw7Pmk2XZzEE";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);



const DRINKS = [
  { id: "water",   label: "Agua",     icon: "💧", color: "#38bdf8" },
  { id: "coffee",  label: "Café",     icon: "☕", color: "#d97706" },
  { id: "tea",     label: "Té",       icon: "🍵", color: "#86efac" },
  { id: "juice",   label: "Zumo",     icon: "🍊", color: "#fb923c" },
  { id: "soda",    label: "Refresco", icon: "🥤", color: "#a78bfa" },
  { id: "beer",    label: "Cerveza",  icon: "🍺", color: "#fbbf24" },
  { id: "wine",    label: "Vino",     icon: "🍷", color: "#be123c" },
  { id: "spirits", label: "Licor",    icon: "🥃", color: "#f97316" },
  { id: "milk",    label: "Leche",    icon: "🥛", color: "#e2e8f0" },
  { id: "shake",   label: "Batido",   icon: "🧃", color: "#4ade80" },
];

const MEALS = [
  { id: "breakfast",  label: "Desayuno",     icon: "🌅" },
  { id: "midmorning", label: "Media mañana", icon: "🍎" },
  { id: "lunch",      label: "Comida",       icon: "🍽️" },
  { id: "snack",      label: "Merienda",     icon: "🥜" },
  { id: "dinner",     label: "Cena",         icon: "🌙" },
  { id: "other",      label: "Otro",         icon: "➕" },
];

const COACH_SYSTEM = `Eres el coach personal de Gus, hombre de 27 años, 170cm, residente en España.
Objetivo: recomposición corporal — bajar grasa manteniendo músculo.
Estado actual (mayo 2026): 73.3kg, 20.6% grasa, 54.4kg músculo. Meta: 67.7kg.
Progreso: bajó de 77.4kg y 23.8% grasa en 2 meses de trabajo consistente.

IDIOMA: Habla siempre en español de España. Usa "tú" (nunca "vos"). Nada de expresiones argentinas ni latinoamericanas.

FORMATO de respuesta para análisis:
- Usa secciones cortas con emoji: 🏋️ Entrenamiento, 🍽️ Nutrición, 💧 Hidratación, ⚡ Energía, 🎯 Ajuste para mañana
- Solo incluye las secciones relevantes según los datos del día
- Máximo 2-3 líneas por sección
- Sé directo, concreto y específico con los números

FORMATO de respuesta para chat:
- Responde en prosa natural, sin secciones
- Máximo 4-5 oraciones
- Directo y útil`;


const MUSCLE_GROUPS = [
  { id:"pecho",       label:"Pecho",       abbr:"PE", cat:"empuje",  color:"#38bdf8" },
  { id:"hombros",     label:"Hombros",     abbr:"HO", cat:"empuje",  color:"#38bdf8" },
  { id:"triceps",     label:"Tríceps",     abbr:"TR", cat:"empuje",  color:"#38bdf8" },
  { id:"espalda",     label:"Espalda",     abbr:"ES", cat:"tiron",   color:"#4ade80" },
  { id:"biceps",      label:"Bíceps",      abbr:"BI", cat:"tiron",   color:"#4ade80" },
  { id:"antebrazos",  label:"Antebrazos",  abbr:"AF", cat:"tiron",   color:"#4ade80" },
  { id:"cuadriceps",  label:"Cuádriceps",  abbr:"CU", cat:"piernas", color:"#fb923c" },
  { id:"isquios",     label:"Isquios",     abbr:"IS", cat:"piernas", color:"#fb923c" },
  { id:"gluteos",     label:"Glúteos",     abbr:"GL", cat:"piernas", color:"#fb923c" },
  { id:"gemelos",     label:"Gemelos",     abbr:"GE", cat:"piernas", color:"#fb923c" },
  { id:"abdominales", label:"Abdominales", abbr:"AB", cat:"core",    color:"#a78bfa" },
  { id:"lumbar",      label:"Lumbar",      abbr:"LU", cat:"core",    color:"#a78bfa" },
  { id:"cardio",      label:"Cardio",      abbr:"🏃", cat:"core",    color:"#a78bfa" },
  { id:"descanso",    label:"Descanso",    abbr:"😴", cat:"core",    color:"#a78bfa" },
];

const CAT_LABELS = { empuje:"Empuje", tiron:"Tirón", piernas:"Piernas", core:"Core y otros" };

// Catálogo inicial de ejercicios por grupo muscular — editable desde Ajustes.
// Sirve de punto de partida; el usuario añade/quita los suyos.
const DEFAULT_EXERCISE_CATALOG = {
  pecho:       ["Press banca", "Press inclinado", "Aperturas", "Fondos"],
  hombros:     ["Press militar", "Elevaciones laterales", "Pájaros"],
  triceps:     ["Press francés", "Extensión en polea", "Fondos en banco"],
  espalda:     ["Dominadas", "Remo con barra", "Jalón al pecho"],
  biceps:      ["Curl con barra", "Curl martillo", "Curl Scott"],
  antebrazos:  ["Curl de muñeca", "Farmer walk"],
  cuadriceps:  ["Sentadilla", "Prensa", "Zancadas"],
  isquios:     ["Peso muerto rumano", "Curl femoral"],
  gluteos:     ["Hip thrust", "Peso muerto sumo"],
  gemelos:     ["Elevación de talones de pie", "Elevación de talones sentado"],
  abdominales: ["Crunch", "Plancha", "Elevación de piernas"],
  lumbar:      ["Hiperextensiones", "Peso muerto"],
  cardio:      ["Cinta", "Bici", "Elíptica"],
  descanso:    [],
};

function timeSlot() {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 12) return "midmorning";
  if (h < 15) return "lunch";
  if (h < 18) return "snack";
  if (h < 22) return "dinner";
  return "other";
}
function nowTime() {
  return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

// Formatea un valor de serie (peso o reps): 0 es un valor válido (ej. dominadas
// a peso corporal), solo "" / null / undefined se muestran como "-"
function fmtSetVal(v) {
  return (v === "" || v === null || v === undefined) ? "-" : v;
}

// ---- Progreso corporal: media móvil, proyección con banda de incertidumbre e insight ----
// (usado en Estadísticas → Peso y % Grasa)

const DAY_MS = 86400000;

// Peso del día: entry.today.weight
function getWeightValue(entry) {
  const v = entry?.today?.weight ? parseFloat(entry.today.weight) : null;
  return (v != null && !isNaN(v)) ? v : null;
}

// % de grasa del día: entry.today.grasa, o si no se registró a mano, lo extrae
// del texto del feedback del coach ("Grasa corporal: 23.8%") — mismo criterio
// que ya usaba la tarjeta de Estadísticas.
function getGrasaValue(entry) {
  if (entry?.today?.grasa) {
    const v = parseFloat(entry.today.grasa);
    if (!isNaN(v)) return v;
  }
  const m = entry?.feedback?.match(/Grasa corporal: ([\d.]+)%/);
  if (m) {
    const v = parseFloat(m[1]);
    if (!isNaN(v)) return v;
  }
  return null;
}

// Serie diaria (con huecos) de los últimos `days` días naturales hasta hoy.
// entries: [{ date:"YYYY-MM-DD", today:{...}, feedback }], getValue: entry => número | null
function buildMetricSeries(entries, days, todayStr, getValue) {
  const todayD = new Date(todayStr + "T00:00:00");
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(todayD.getTime() - i * DAY_MS);
    const dateStr = d.toISOString().split("T")[0];
    const entry = entries.find(e => e.date === dateStr);
    series.push({ date: dateStr, w: entry ? getValue(entry) : null });
  }
  return series;
}

// Media móvil de 7 días naturales: solo cuenta días con registro,
// y exige al menos 2 registros en la ventana para dibujar el punto.
function movingAverageSeries(series) {
  return series.map((pt, idx) => {
    let sum = 0, count = 0;
    for (let k = Math.max(0, idx - 6); k <= idx; k++) {
      if (series[k].w != null) { sum += series[k].w; count++; }
    }
    return { date: pt.date, ma: count >= 2 ? sum / count : null };
  });
}

// Valor de media móvil no nulo más cercano a idx (para comparar periodos con huecos).
function nearestMA(maSeries, idx) {
  for (let d = 0; d < 10; d++) {
    if (idx - d >= 0 && maSeries[idx - d]?.ma != null) return maSeries[idx - d].ma;
    if (idx + d < maSeries.length && maSeries[idx + d]?.ma != null) return maSeries[idx + d].ma;
  }
  return null;
}

// Regresión lineal (mínimos cuadrados) sobre puntos {x,y}. Null si hay muy pocos puntos.
function linearRegression(points) {
  const n = points.length;
  if (n < 5) return null;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  let sxy = 0, sxx = 0;
  points.forEach(p => { sxy += (p.x - meanX) * (p.y - meanY); sxx += (p.x - meanX) * (p.x - meanX); });
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  let resSq = 0;
  points.forEach(p => { const r = p.y - (intercept + slope * p.x); resSq += r * r; });
  const residStd = Math.sqrt(resSq / Math.max(1, n - 2));
  const slopeStdErr = residStd / Math.sqrt(sxx);
  return { slope, intercept, residStd, slopeStdErr, n };
}

// Ancho (± unidad de la métrica) de la banda de incertidumbre a `horizonDays` de hoy.
// Heurística visual (crece con la distancia), no un intervalo estadístico estricto.
function bandHalfWidth(reg, horizonDays) {
  return reg.residStd * 0.7 + reg.slopeStdErr * 1.6 * horizonDays;
}

// Días (desde `lastIdx`) hasta que la recta de regresión cruza `target`. Null si no baja o no hay dato fiable.
function daysToTarget(reg, lastIdx, target) {
  if (!reg || reg.slope >= -0.0005) return null;
  const h = (target - reg.intercept) / reg.slope - lastIdx;
  return h > 0 ? h : null;
}

function fmtDateEs(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

const EMPTY = { meals: [], drinks: [], weight: "", grasa: "", imc: "", training: "", muscleGroups: [], exercises: [], suppsTaken: [], kcal: 0 };

// Adjunta el token de sesión de Supabase en toda llamada a /api,
// para que el backend pueda verificar quién hace la petición
async function authedFetch(url, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { "content-type": "application/json" };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
}

async function callClaude(userPrompt) {
  const response = await authedFetch("/api/coach", { prompt: userPrompt, system: COACH_SYSTEM });
  const json = await response.json();
  if (json.error) throw new Error(json.error);
  return json.text ?? "Sin respuesta.";
}

// Valores para las ruletas de peso (múltiplos de 2.5) y repeticiones
const WEIGHT_WHEEL_VALUES = Array.from({ length: 121 }, (_, i) => Math.round(i * 2.5 * 10) / 10); // 0 a 300 de 2.5 en 2.5
const REPS_WHEEL_VALUES = Array.from({ length: 30 }, (_, i) => i + 1); // 1 a 30

// Ruleta seleccionable estilo iOS: se desliza verticalmente y el valor centrado
// (entre las dos líneas) es el seleccionado. Aislado como componente fuera de App
// para que no se remonte y pierda el scroll en cada render (mismo motivo que WeightCard).
function WheelPicker({ values, value, onChange, itemHeight = 40, visibleCount = 5, color = "#4ade80" }) {
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const initialIdx = Math.max(0, values.indexOf(value));
  const [centerIdx, setCenterIdx] = useState(initialIdx);
  const containerHeight = itemHeight * visibleCount;
  const padding = (containerHeight - itemHeight) / 2;

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = initialIdx * itemHeight;
    // Solo al montar: la pantalla se remonta entera cada vez que se abre, así que
    // no hace falta re-sincronizar en cada cambio de "value".
  }, []);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.min(values.length - 1, Math.max(0, Math.round(el.scrollTop / itemHeight)));
    setCenterIdx(idx);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(values[idx]), 120);
  };

  const scrollToIdx = (idx) => {
    containerRef.current?.scrollTo({ top: idx * itemHeight, behavior: "smooth" });
  };

  return (
    <div style={{ position:"relative" }}>
      <div style={{ position:"absolute", top:padding, left:0, right:0, height:itemHeight, borderTop:`1px solid ${color}55`, borderBottom:`1px solid ${color}55`, pointerEvents:"none" }}/>
      <div ref={containerRef} onScroll={handleScroll}
        style={{ height:containerHeight, overflowY:"scroll", scrollSnapType:"y mandatory", WebkitOverflowScrolling:"touch" }}>
        <div style={{ height:padding }}/>
        {values.map((v,i)=>(
          <div key={v} onClick={()=>scrollToIdx(i)} style={{
            height:itemHeight, display:"flex", alignItems:"center", justifyContent:"center",
            scrollSnapAlign:"center", fontSize:i===centerIdx?20:15, fontWeight:i===centerIdx?800:500,
            color:i===centerIdx?color:"rgba(232,245,232,.3)", transition:"font-size .15s, color .15s", cursor:"pointer",
          }}>{v}</div>
        ))}
        <div style={{ height:padding }}/>
      </div>
    </div>
  );
}

function WeightCard({ saved, weight, grasa, imc, onSave, onEdit, g }) {
  const [w, setW] = useState("");
  const [gr, setGr] = useState("");
  const [im, setIm] = useState("");
  const inp = { ...g.inp, marginBottom:0, flex:1, padding:"10px 8px", fontSize:13 };
  const lbl = { fontSize:9, color:"rgba(74,222,128,.6)", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", marginBottom:5 };

  if (saved) return (
    <div style={{...g.card, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
      <div style={{display:"flex", gap:20, alignItems:"center"}}>
        <div><div style={g.sec}>⚖️ Peso</div><div style={{fontSize:24,fontWeight:900,color:"#4ade80"}}>{weight}<span style={{fontSize:12,fontWeight:600}}>kg</span></div></div>
        {grasa&&<div><div style={g.sec}>Grasa</div><div style={{fontSize:18,fontWeight:700,color:"rgba(74,222,128,.8)"}}>{grasa}<span style={{fontSize:11}}>%</span></div></div>}
        {imc&&<div><div style={g.sec}>IMC</div><div style={{fontSize:18,fontWeight:700,color:"rgba(74,222,128,.8)"}}>{imc}</div></div>}
      </div>
      <button style={g.back} onClick={onEdit}>✏️</button>
    </div>
  );

  return (
    <div style={g.cardG}>
      <div style={g.sec}>⚖️ Medición de hoy</div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12}}>
        <div>
          <div style={lbl}>Peso</div>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <input style={inp} type="number" inputMode="decimal" placeholder="73.1" value={w} onChange={e=>setW(e.target.value)}/>
            <span style={{color:"rgba(232,245,232,.35)",fontSize:11}}>kg</span>
          </div>
        </div>
        <div>
          <div style={lbl}>% Grasa</div>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <input style={inp} type="number" inputMode="decimal" placeholder="20.6" value={gr} onChange={e=>setGr(e.target.value)}/>
            <span style={{color:"rgba(232,245,232,.35)",fontSize:11}}>%</span>
          </div>
        </div>
        <div>
          <div style={lbl}>IMC</div>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <input style={inp} type="number" inputMode="decimal" placeholder="25.4" value={im} onChange={e=>setIm(e.target.value)}/>
          </div>
        </div>
      </div>
      {w&&<button style={{...g.btnP,marginBottom:0}} onClick={()=>onSave(w,gr,im)}>Guardar medición ✓</button>}
    </div>
  );
}

// Progreso de peso: media móvil de 7 días, selector de rango, proyección con banda de
// incertidumbre hasta el peso objetivo, comparativa de periodos e insight en texto.
// Standalone (como WeightCard) para no remontarse y perder el rango/hover seleccionado en cada render.
function MetricProgressChart({ entries, todayStr, target, g, label, tableLabel, unit, color, decimals = 1, getValue }) {
  const [range, setRange] = useState(30);
  const [hover, setHover] = useState(null);
  const [showTable, setShowTable] = useState(false);

  // El histórico del usuario puede ser más largo que 90 días: si "todo" se queda fijo
  // en 90, cualquier dato más antiguo (aunque sí se cargó de Supabase) nunca llega a
  // construirse en la serie y desaparece del todo de la gráfica, aunque exista.
  const todayD0 = new Date(todayStr + "T00:00:00");
  let earliestD = null;
  for (const e of entries) {
    if (getValue(e) != null) {
      const d = new Date(e.date + "T00:00:00");
      if (!earliestD || d < earliestD) earliestD = d;
    }
  }
  const historyDays = earliestD ? Math.round((todayD0 - earliestD) / DAY_MS) + 1 : 90;
  const FULL_DAYS = Math.min(Math.max(historyDays, 90), 1095); // entre 90 días y ~3 años
  const lastIdx = FULL_DAYS - 1;
  const fullSeries = buildMetricSeries(entries, FULL_DAYS, todayStr, getValue);
  const maFull = movingAverageSeries(fullSeries);

  const REG_WINDOW = 21;
  const regPoints = maFull
    .map((pt, idx) => ({ idx, ma: pt.ma }))
    .filter(p => p.idx >= lastIdx - (REG_WINDOW - 1) && p.ma != null)
    .map(p => ({ x: p.idx, y: p.ma }));
  const reg = linearRegression(regPoints);

  const PROJECTION_DAYS = 30;
  // Más allá de ~1 año no es una predicción útil, es ruido con forma de fecha — se descarta.
  const MAX_HORIZON_DAYS = 365;
  const capHorizon = h => (h != null && h <= MAX_HORIZON_DAYS) ? h : null;
  const hCentral = capHorizon((target && reg) ? daysToTarget(reg, lastIdx, target) : null);
  const hOpt     = capHorizon((target && reg) ? daysToTarget({ ...reg, slope: reg.slope - reg.slopeStdErr }, lastIdx, target) : null);
  const hPess    = capHorizon((target && reg) ? daysToTarget({ ...reg, slope: reg.slope + reg.slopeStdErr }, lastIdx, target) : null);

  const rawCount = fullSeries.filter(p => p.w != null).length;
  if (rawCount < 2) {
    return <p style={{ color:"rgba(232,245,232,.22)", fontSize:12, textAlign:"center", padding:"12px 0" }}>Registra al menos 2 días</p>;
  }

  const startIdx = Math.max(0, lastIdx - (range - 1));
  const endIdx = lastIdx + PROJECTION_DAYS;

  const dotPts = fullSeries.map((p, idx) => ({ idx, y: p.w })).filter(p => p.idx >= startIdx && p.y != null);
  const maPts = maFull.map((p, idx) => ({ idx, y: p.ma })).filter(p => p.idx >= startIdx && p.y != null);
  const projPts = reg ? Array.from({ length: PROJECTION_DAYS + 1 }, (_, h) => ({ idx: lastIdx + h, y: reg.intercept + reg.slope * (lastIdx + h) })) : [];
  const bandUp = reg ? projPts.map(p => ({ idx: p.idx, y: p.y + bandHalfWidth(reg, p.idx - lastIdx) })) : [];
  const bandDown = reg ? projPts.map(p => ({ idx: p.idx, y: p.y - bandHalfWidth(reg, p.idx - lastIdx) })) : [];

  // El dominio vertical sale SOLO del histórico visible: la proyección/banda (ver yClamp más abajo)
  // y el objetivo, si están lejos, no lo estiran — se recortan contra el borde con una etiqueta en
  // vez de aplastar la curva real (un objetivo a varios kg de distancia no debería dejar los datos
  // reales apretados en una esquina del gráfico).
  const dataVals = [...dotPts, ...maPts].map(p => p.y);
  const dataMin = dataVals.length ? Math.min(...dataVals) : 0;
  const dataMax = dataVals.length ? Math.max(...dataVals) : 1;
  const dataSpan = Math.max(dataMax - dataMin, 0.001);

  const MAX_TARGET_EXTRA = dataSpan; // el objetivo puede ensanchar el eje como mucho 1x el rango real
  let domainMin = dataMin, domainMax = dataMax, targetClipped = null;
  if (target != null) {
    if (target < dataMin) {
      domainMin = Math.max(target, dataMin - MAX_TARGET_EXTRA);
      if (target < domainMin) targetClipped = "below";
    } else if (target > dataMax) {
      domainMax = Math.min(target, dataMax + MAX_TARGET_EXTRA);
      if (target > domainMax) targetClipped = "above";
    }
  }
  const pad = Math.max(dataSpan * 0.1, 0.3);
  const yMin = domainMin - pad, yMax = domainMax + pad;

  const W = 400, H = 220, LEFT = 30, RIGHT = 6, TOP = 10, BOTTOM = 20;
  const PLOT_W = W - LEFT - RIGHT, PLOT_H = H - TOP - BOTTOM;
  const xS = idx => LEFT + ((idx - startIdx) / (endIdx - startIdx)) * PLOT_W;
  const yS = v => TOP + ((yMax - v) / (yMax - yMin)) * PLOT_H;
  const yClamp = py => Math.min(H - BOTTOM, Math.max(TOP, py));

  const dateAt = idx => {
    const d = new Date(todayStr + "T00:00:00");
    d.setDate(d.getDate() - (lastIdx - idx));
    return d.toISOString().split("T")[0];
  };

  const gridStep = (yMax - yMin) > 9 ? 2 : (yMax - yMin) > 3 ? 1 : 0.5;
  const gridVals = [];
  for (let v = Math.ceil(yMin / gridStep) * gridStep; v <= yMax; v += gridStep) gridVals.push(Math.round(v * 100) / 100);

  const maPath = maPts.length ? "M " + maPts.map(p => `${xS(p.idx)} ${yS(p.y)}`).join(" L ") : "";
  // Proyección y banda se recortan al dominio visible (yClamp): si el ritmo las llevaría
  // fuera de la escala, la línea se queda pegada al borde en vez de estirar todo el gráfico.
  const projPath = projPts.length ? "M " + projPts.map(p => `${xS(p.idx)} ${yClamp(yS(p.y))}`).join(" L ") : "";
  const bandPath = bandUp.length
    ? "M " + bandUp.map(p => `${xS(p.idx)} ${yClamp(yS(p.y))}`).join(" L ") + " L " + bandDown.slice().reverse().map(p => `${xS(p.idx)} ${yClamp(yS(p.y))}`).join(" L ") + " Z"
    : "";

  // Tendencia de la ventana visible (unidad/semana)
  const aMA = nearestMA(maFull, startIdx), bMA = nearestMA(maFull, lastIdx);
  const trendWeek = (aMA != null && bMA != null && lastIdx > startIdx) ? ((bMA - aMA) / (lastIdx - startIdx)) * 7 : null;

  // Comparativa: últimos 30 días vs los 30 anteriores
  const tmA = nearestMA(maFull, lastIdx), tmB = nearestMA(maFull, Math.max(0, lastIdx - 30));
  const thisMonth = (tmA != null && tmB != null) ? tmA - tmB : null;
  const lmA = nearestMA(maFull, Math.max(0, lastIdx - 30)), lmB = nearestMA(maFull, Math.max(0, lastIdx - 60));
  const lastMonth = (lmA != null && lmB != null) ? lmA - lmB : null;

  const w21 = reg ? reg.slope * 7 : null;
  const w14 = (() => {
    const a = nearestMA(maFull, lastIdx - 13), b = nearestMA(maFull, lastIdx);
    return (a != null && b != null) ? ((b - a) / 13) * 7 : null;
  })();
  const slowdown = (w21 != null && w14 != null) && Math.abs(w14) < Math.abs(w21) * 0.55;

  let insight = "";
  if (w21 != null) {
    insight += `En las últimas 3 semanas ${w21 <= 0 ? "bajas" : "subes"} de media ${Math.abs(w21).toFixed(2)} ${unit}/semana. `;
    if (slowdown) insight += `En los últimos 14 días el ritmo se ha frenado (${Math.abs(w14).toFixed(2)} ${unit}/semana) — vigila si se convierte en estancamiento real. `;
  } else {
    insight += "Todavía no hay suficientes registros recientes para calcular un ritmo fiable. ";
  }
  if (target && w21 != null) {
    if (hCentral != null) {
      const dC = dateAt(Math.round(lastIdx + hCentral));
      insight += `A este paso llegarías a ${target}${unit} hacia el ${fmtDateEs(dC)}` +
        (hOpt != null && hPess != null ? `, entre el ${fmtDateEs(dateAt(Math.round(lastIdx + hOpt)))} y el ${fmtDateEs(dateAt(Math.round(lastIdx + hPess)))}.` : ".");
    } else {
      insight += "Con el ritmo actual, la fecha objetivo no sería fiable todavía.";
    }
  }

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    let idx = Math.round(startIdx + ((svgX - LEFT) / PLOT_W) * (endIdx - startIdx));
    idx = Math.max(startIdx, Math.min(endIdx, idx));
    const isProj = idx > lastIdx;
    const val = isProj ? (reg ? reg.intercept + reg.slope * idx : null) : nearestMA(maFull, idx);
    if (val == null) { setHover(null); return; }
    setHover({ idx, val, isProj });
  }

  return <>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10,flexWrap:"wrap",gap:8}}>
      <div style={g.sec}>{label}</div>
      <div style={{display:"flex",gap:6}}>
        {[[14,"2 sem"],[30,"1 mes"],[FULL_DAYS,"todo"]].map(([d,lbl])=>(
          <button key={d} onClick={()=>setRange(d)}
            style={{fontSize:10.5,fontWeight:600,padding:"5px 10px",borderRadius:99,cursor:"pointer",
              border: range===d?`1px solid ${color}`:"1px solid rgba(255,255,255,.1)",
              background: range===d?`${color}26`:"rgba(255,255,255,.03)",
              color: range===d?color:"rgba(232,245,232,.45)"}}>{lbl}</button>
        ))}
      </div>
    </div>

    <div style={{position:"relative"}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block",overflow:"visible"}} onMouseMove={onMove} onMouseLeave={()=>setHover(null)}>
        {gridVals.map(v=>(
          <g key={v}>
            <line x1={LEFT} x2={W-RIGHT} y1={yS(v)} y2={yS(v)} stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
            <text x={2} y={yS(v)+3} fontSize="8.5" fill="rgba(232,245,232,.3)">{v}</text>
          </g>
        ))}
        {target != null && (targetClipped ? (
          <g>
            <line x1={LEFT} x2={W-RIGHT} y1={targetClipped==="below"?H-BOTTOM:TOP} y2={targetClipped==="below"?H-BOTTOM:TOP} stroke="rgba(232,245,232,.35)" strokeWidth="1" strokeDasharray="2 4"/>
            <text x={W-RIGHT} y={targetClipped==="below"?H-BOTTOM-4:TOP+10} fontSize="8.5" fill="rgba(232,245,232,.5)" textAnchor="end">{targetClipped==="below"?"↓":"↑"} objetivo {target}{unit}</text>
          </g>
        ) : (
          <line x1={LEFT} x2={W-RIGHT} y1={yS(target)} y2={yS(target)} stroke="rgba(232,245,232,.35)" strokeWidth="1" strokeDasharray="2 4"/>
        ))}
        {bandPath && <path d={bandPath} fill="rgba(167,139,250,.14)" stroke="none"/>}
        <line x1={xS(lastIdx)} x2={xS(lastIdx)} y1={TOP} y2={H-BOTTOM} stroke="rgba(255,255,255,.15)" strokeWidth="1"/>
        {projPath && <path d={projPath} fill="none" stroke="#a78bfa" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round"/>}
        {dotPts.map(p=><circle key={p.idx} cx={xS(p.idx)} cy={yS(p.y)} r="2" fill={color} opacity="0.4"/>)}
        {maPath && <path d={maPath} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>}
        {maPts.length>0 && <circle cx={xS(maPts[maPts.length-1].idx)} cy={yS(maPts[maPts.length-1].y)} r="4" fill={color} stroke="#0a0a0f" strokeWidth="2"/>}
        {hover && <line x1={xS(hover.idx)} x2={xS(hover.idx)} y1={TOP} y2={H-BOTTOM} stroke="rgba(255,255,255,.25)" strokeWidth="1"/>}
      </svg>
      {hover && (
        <div style={{position:"absolute",left:`${(xS(hover.idx)/W)*100}%`,top:`${(yClamp(yS(hover.val))/H)*100}%`,transform:"translate(-50%,-130%)",
          background:"#0a0a0f",border:`1px solid ${color}4d`,borderRadius:8,padding:"5px 9px",fontSize:11,color:"#e8f5e8",whiteSpace:"nowrap",pointerEvents:"none",zIndex:5}}>
          <b style={{display:"block",fontSize:9,color:"rgba(232,245,232,.4)",fontWeight:600}}>{fmtDateEs(dateAt(hover.idx))}{hover.isProj?" · proyectado":""}</b>
          {hover.val.toFixed(decimals)}{unit}
        </div>
      )}
    </div>

    <div style={{display:"flex",gap:11,marginTop:8,marginBottom:2,fontSize:9.5,color:"rgba(232,245,232,.35)",flexWrap:"wrap"}}>
      <span><span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:color,opacity:.5,marginRight:4}}/>Registrado</span>
      <span><span style={{display:"inline-block",width:12,height:2,background:color,marginRight:4,verticalAlign:"middle"}}/>Media móvil</span>
      <span><span style={{display:"inline-block",width:12,height:2,background:"repeating-linear-gradient(90deg,#a78bfa 0 4px,transparent 4px 7px)",marginRight:4,verticalAlign:"middle"}}/>Proyección</span>
      {target&&<span><span style={{display:"inline-block",width:12,height:2,background:"repeating-linear-gradient(90deg,rgba(232,245,232,.4) 0 3px,transparent 3px 6px)",marginRight:4,verticalAlign:"middle"}}/>Objetivo</span>}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginTop:12}}>
      <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:12,padding:"9px 8px"}}>
        <div style={{fontSize:9,color:"rgba(232,245,232,.35)",marginBottom:2}}>Tendencia</div>
        <div style={{fontSize:13,fontWeight:800,color: trendWeek==null?"#e8f5e8":(trendWeek<=0?"#4ade80":"#f87171")}}>
          {trendWeek==null?"—":`${trendWeek<=0?"":"+"}${trendWeek.toFixed(2)} ${unit}/sem`}
        </div>
      </div>
      <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:12,padding:"9px 8px"}}>
        <div style={{fontSize:9,color:"rgba(232,245,232,.35)",marginBottom:2}}>Este mes</div>
        <div style={{fontSize:13,fontWeight:800,color: thisMonth==null?"#e8f5e8":(thisMonth<=0?"#4ade80":"#f87171")}}>
          {thisMonth==null?"—":`${thisMonth<=0?"":"+"}${thisMonth.toFixed(decimals)}${unit}`}
        </div>
      </div>
      <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:12,padding:"9px 8px"}}>
        <div style={{fontSize:9,color:"rgba(232,245,232,.35)",marginBottom:2}}>Objetivo</div>
        <div style={{fontSize:13,fontWeight:800,color:"#e8f5e8"}}>
          {!target ? "sin fijar" : hCentral==null ? "sin fecha" : `≈ ${fmtDateEs(dateAt(Math.round(lastIdx+hCentral)))}`}
        </div>
      </div>
    </div>

    <div style={{background:`${color}0f`,border:`1px solid ${color}26`,borderRadius:12,padding:"10px 12px",marginTop:10,fontSize:11.5,lineHeight:1.55,color:"#d1fae5"}}>
      {insight}
    </div>

    <button onClick={()=>setShowTable(s=>!s)} style={{background:"none",border:"none",color,fontSize:11,cursor:"pointer",padding:"8px 0 0"}}>
      {showTable?"Ocultar tabla":"Ver tabla"}
    </button>
    {showTable && (
      <div style={{maxHeight:180,overflowY:"auto",marginTop:6,border:"1px solid rgba(255,255,255,.07)",borderRadius:10}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr>
            <th style={{textAlign:"left",padding:"6px 8px",color:"rgba(232,245,232,.35)",fontWeight:600,position:"sticky",top:0,background:"#0e1512"}}>Fecha</th>
            <th style={{textAlign:"left",padding:"6px 8px",color:"rgba(232,245,232,.35)",fontWeight:600,position:"sticky",top:0,background:"#0e1512"}}>{tableLabel}</th>
            <th style={{textAlign:"left",padding:"6px 8px",color:"rgba(232,245,232,.35)",fontWeight:600,position:"sticky",top:0,background:"#0e1512"}}>Media 7d</th>
          </tr></thead>
          <tbody>
            {fullSeries.slice(startIdx).map((p,i)=>{
              const idx = startIdx+i;
              const ma = maFull[idx]?.ma;
              return <tr key={p.date} style={{borderTop:"1px solid rgba(255,255,255,.05)"}}>
                <td style={{padding:"6px 8px",color:"#e8f5e8"}}>{fmtDateEs(p.date)}</td>
                <td style={{padding:"6px 8px",color:"rgba(232,245,232,.6)"}}>{p.w!=null?p.w.toFixed(decimals):"—"}</td>
                <td style={{padding:"6px 8px",color:"rgba(232,245,232,.6)"}}>{ma!=null?ma.toFixed(decimals):"—"}</td>
              </tr>;
            }).reverse()}
          </tbody>
        </table>
      </div>
    )}
  </>;
}

const BADGES = [
  { id:"streak7",   days:7,   icon:"🔥", label:"Una semana",     desc:"7 días seguidos registrando" },
  { id:"streak14",  days:14,  icon:"⚡", label:"Dos semanas",    desc:"14 días seguidos registrando" },
  { id:"streak30",  days:30,  icon:"💪", label:"Un mes",         desc:"30 días seguidos registrando" },
  { id:"streak60",  days:60,  icon:"🏆", label:"Dos meses",      desc:"60 días seguidos registrando" },
  { id:"streak100", days:100, icon:"👑", label:"100 días",       desc:"100 días seguidos registrando" },
];

function calcStreak(entries) {
  if (!entries?.length) return 0;
  const sorted = [...entries].sort((a,b) => b.date.localeCompare(a.date));
  const today = new Date().toISOString().split("T")[0];
  let streak = 0;
  let current = today;
  for (const e of sorted) {
    const hasData = e.today?.weight || e.today?.meals?.length || e.today?.training || e.today?.muscleGroups?.length || e.today?.exercises?.length;
    if (e.date === current && hasData) {
      streak++;
      const d = new Date(current);
      d.setDate(d.getDate() - 1);
      current = d.toISOString().split("T")[0];
    } else if (e.date < current) {
      break;
    }
  }
  return streak;
}

// Red de seguridad: si algo revienta durante el render, mostramos una pantalla
// de recuperación en vez de dejar la app en negro (sin esto, un error no
// controlado desmonta todo el árbol de React y no queda nada visible).
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("App crash:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100dvh",
          background: "#0a0a0f", color: "#e8f5e8",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 16, padding: 24, textAlign: "center", fontFamily: "-apple-system, sans-serif",
        }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Algo ha fallado</div>
          <div style={{ fontSize: 13, color: "rgba(232,245,232,.6)" }}>
            La app se ha encontrado con un error inesperado.
          </div>
          <button
            style={{
              padding: "12px 24px", borderRadius: 12, background: "#4ade80",
              color: "#0a0a0f", fontWeight: 700, border: "none", fontSize: 14, cursor: "pointer",
            }}
            onClick={() => {
              try { localStorage.removeItem("gus_cache"); } catch {}
              window.location.href = "/";
            }}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [screen, setScreen]       = useState("home");
  const [transitioning, setTransitioning] = useState(false);
  const [slideDir, setSlideDir]     = useState(1); // 1=left, -1=right
  const NAV_ORDER = ["home","stats","achievements","history","chat","settings"];
  const [entries, setEntries]     = useState([]);
  const [today, setTodayRaw]      = useState(EMPTY);
  const [wInput, setWInput]       = useState("");
  const [gInput, setGInput]       = useState("");
  const [imcInput, setImcInput]   = useState("");
  const [aiText, setAiText]       = useState("");
  const [loading, setLoading]     = useState(false);
  const [msgs, setMsgs]           = useState([]);
  const [chatIn, setChatIn]       = useState("");
  const [chatBusy, setChatBusy]   = useState(false);
  const [mealSlot, setMealSlot]   = useState(timeSlot());
  const [mealDesc, setMealDesc]   = useState("");
  const [drinkId, setDrinkId]     = useState("water");
  const [drinkAmt, setDrinkAmt]   = useState("");
  const [drinkUnit, setDrinkUnit] = useState("ml");
  const [ready, setReady]         = useState(false);
  const [user, setUser]           = useState(null);
  const [analyses, setAnalyses]   = useState([]);

  const [calYear, setCalYear]     = useState(new Date().getFullYear());
  const [calMonth, setCalMonth]   = useState(new Date().getMonth());
  const [selDay, setSelDay]       = useState(null);
  const [expandedMonths, setExpandedMonths] = useState({});
  const [activeTip, setActiveTip] = useState(null);
  const [editingMealId, setEditingMealId] = useState(null);
  const [editingMealTime, setEditingMealTime] = useState("");
  const [editingMealSlot, setEditingMealSlot] = useState("lunch");
  const [exName, setExName]       = useState("");
  const [exSets, setExSets]       = useState([{ weight:"", reps:"" }]);
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [exerciseCatalog, setExerciseCatalog] = useState(DEFAULT_EXERCISE_CATALOG);
  const [weightUnit, setWeightUnit] = useState("kg");
  const [goalWeight, setGoalWeight] = useState("");
  const [goalGrasa, setGoalGrasa] = useState("");
  const [newExerciseInputs, setNewExerciseInputs] = useState({});
  const [setGroupId, setSetGroupId] = useState(null);
  const [setExerciseName, setSetExerciseName] = useState("");
  const [newQuickExercise, setNewQuickExercise] = useState("");
  const [setWeight, setSetWeight] = useState(0);
  const [setReps, setSetReps] = useState(8);
  const [setUnit, setSetUnit] = useState("kg");
  const [supplements, setSupplements] = useState([
    { id: "creatina",   label: "Creatina",   icon: "⚡", doses: 1 },
    { id: "magnesio",   label: "Magnesio",   icon: "🌙", doses: 1 },
    { id: "ashwaganda", label: "Ashwaganda", icon: "🌿", doses: 2 },
  ]);
  const [kcalGoal, setKcalGoal] = useState(2000);
  const [editingSettings, setEditingSettings] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [newSupIcon, setNewSupIcon] = useState("💊");
  const [userProfile, setUserProfile] = useState(null);
  const [macroGoals, setMacroGoals] = useState({ prot: 147, carb: 193, fat: 70 });
  const [onboardStep, setOnboardStep] = useState(0);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [onboardData, setOnboardData] = useState({ goal:"recomp", activity:"moderate", weight:"" });

  const [notifConfig, setNotifConfig] = useState({
    meals: { enabled: true, times: ["08:00","14:00","21:00"] },
    weight: { enabled: true, time: "07:30" },
    supplements: { enabled: true, time: "09:00" },
    motivational: { enabled: false, time: "19:00" },
  });
  const [mealProt, setMealProt]   = useState("");
  const [mealCarb, setMealCarb]   = useState("");
  const [mealFat, setMealFat]     = useState("");
  const [mealKcal, setMealKcal]   = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recognitionRef = useRef(null);
  const [mealPhoto, setMealPhoto]   = useState(null);
  const [mealPhotoB64, setPhotoB64] = useState(null);
  const [analyzingPhoto, setAnPh]   = useState(false);
  const fileRef = useRef(null);
  const chatEnd = useRef(null);

  const touchRef = useRef(null);

  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  const onTouchEnd = (e) => {
    const s = touchRef.current;
    if (!s) return;
    touchRef.current = null;
    if (!NAV_ORDER.includes(screen)) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    // Solo swipe horizontal claro y rapido
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (Date.now() - s.t > 600) return;
    const idx = NAV_ORDER.indexOf(screen);
    const next = dx < 0 ? idx + 1 : idx - 1;
    if (next < 0 || next >= NAV_ORDER.length) return;
    goTo(NAV_ORDER[next]);
  };

  const goTo = (newScreen) => {
    const oldIdx = NAV_ORDER.indexOf(screen);
    const newIdx = NAV_ORDER.indexOf(newScreen);
    setSlideDir(newIdx >= oldIdx ? 1 : -1);
    setTransitioning(true);
    setTimeout(() => {
      setScreen(newScreen);
      setTransitioning(false);
    }, 180);
  };
  const getTodayStr = () => new Date().toISOString().split("T")[0];
  const todayStr = getTodayStr();

  // Load settings from localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem("gus_settings");
      if (s) {
        const p = JSON.parse(s);
        if (p.kcalGoal) setKcalGoal(p.kcalGoal);
        if (p.supplements) setSupplements(p.supplements);
        if (p.notifConfig) setNotifConfig(p.notifConfig);
        if (p.userProfile) setUserProfile(p.userProfile);
        if (p.macroGoals) setMacroGoals(p.macroGoals);
        if (p.exerciseCatalog) setExerciseCatalog(p.exerciseCatalog);
        if (p.weightUnit) setWeightUnit(p.weightUnit);
        if (p.goalWeight) setGoalWeight(p.goalWeight);
        if (p.goalGrasa) setGoalGrasa(p.goalGrasa);
      }
    } catch {}
    setSettingsLoaded(true);
  }, []);

  const saveSettings = (newKcal, newSupps) => {
    const k = newKcal ?? kcalGoal;
    const s = newSupps ?? supplements;
    setKcalGoal(k);
    setSupplements(s);
    localStorage.setItem("gus_settings", JSON.stringify({ kcalGoal: k, supplements: s, notifConfig: notifConfig, userProfile, macroGoals, exerciseCatalog, weightUnit, goalWeight, goalGrasa }));
  };

  const saveNotifConfig = (next) => {
    setNotifConfig(next);
    localStorage.setItem("gus_settings", JSON.stringify({
      kcalGoal, supplements, notifConfig: next, userProfile, macroGoals, exerciseCatalog, weightUnit, goalWeight, goalGrasa
    }));
  };

  const saveExerciseCatalog = (next) => {
    setExerciseCatalog(next);
    localStorage.setItem("gus_settings", JSON.stringify({
      kcalGoal, supplements, notifConfig, userProfile, macroGoals, exerciseCatalog: next, weightUnit, goalWeight, goalGrasa
    }));
  };

  const saveWeightUnit = (next) => {
    setWeightUnit(next);
    localStorage.setItem("gus_settings", JSON.stringify({
      kcalGoal, supplements, notifConfig, userProfile, macroGoals, exerciseCatalog, weightUnit: next, goalWeight, goalGrasa
    }));
  };

  const saveGoalWeight = (next) => {
    setGoalWeight(next);
    localStorage.setItem("gus_settings", JSON.stringify({
      kcalGoal, supplements, notifConfig, userProfile, macroGoals, exerciseCatalog, weightUnit, goalWeight: next, goalGrasa
    }));
  };

  const saveGoalGrasa = (next) => {
    setGoalGrasa(next);
    localStorage.setItem("gus_settings", JSON.stringify({
      kcalGoal, supplements, notifConfig, userProfile, macroGoals, exerciseCatalog, weightUnit, goalWeight, goalGrasa: next
    }));
  };

  const addCatalogExercise = (groupId) => {
    const name = (newExerciseInputs[groupId]||"").trim();
    if (!name) return;
    const current = exerciseCatalog[groupId]||[];
    if (!current.includes(name)) {
      saveExerciseCatalog({ ...exerciseCatalog, [groupId]: [...current, name] });
    }
    setNewExerciseInputs(prev=>({...prev,[groupId]:""}));
  };

  const removeCatalogExercise = (groupId, name) => {
    const current = exerciseCatalog[groupId]||[];
    saveExerciseCatalog({ ...exerciseCatalog, [groupId]: current.filter(n=>n!==name) });
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        skipBrowserRedirect: false,
      }
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setEntries([]);
    setTodayRaw(EMPTY);
    setWInput(""); setGInput(""); setImcInput("");
  };

  const loadingRef = useRef(false);

  // Handle OAuth redirect hash (Safari PWA fix)
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    // El propio proveedor puede devolver un error en el hash (p.ej. acceso denegado)
    if (hash.includes("error=")) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setReady(true);
      return;
    }
    if (hash.includes("access_token")) {
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          if (session?.user) {
            setUser(session.user);
            userRef.current = session.user;
            loadData(session.user.id);
          }
        })
        .catch((e) => {
          console.error("OAuth hash session error:", e);
        })
        .finally(() => {
          // Limpiar siempre la URL y desbloquear la app, aunque falle la sesión
          window.history.replaceState({}, document.title, window.location.pathname);
          setReady(true);
        });
    }
  }, []);

  // Load cached data instantly on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem("gus_cache");
      if (cached) {
        const { entries: cachedEntries, ts } = JSON.parse(cached);
        const ageHours = (Date.now() - ts) / 3600000;
        if (ageHours < 168 && cachedEntries?.length) { // 7 days cache
          setEntries(cachedEntries);
          const currentToday = getTodayStr();
          const td = cachedEntries.find(e => e.date === currentToday);
          if (td) {
            setTodayRaw(td.today);
            todayRef.current = td.today;
            setWInput(td.today.weight || "");
            setGInput(td.today.grasa || "");
            setImcInput(td.today.imc || "");
            if (td.today?.analyses?.length) setAnalyses(td.today.analyses);
          }
        }
      }
    } catch {}
  }, []);

  const loadData = async (userId) => {
    if (loadingRef.current) return; // prevent concurrent loads
    loadingRef.current = true;
    const currentToday = getTodayStr();
    try {
      // Antes esto se limitaba a los últimos 90 días (.gte("date", fromDate)), lo que
      // hacía que cualquier entrada más antigua nunca llegara a `entries` ni al caché:
      // no era solo que la gráfica no la mostrara, es que la app entera no la cargaba.
      // El límite de filas es solo un tope de seguridad (~10 años de registro diario).
      const { data, error } = await supabase
        .from("entries")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: true })
        .limit(3650);
      if (!error && data) {
        const allEntries = data.map(r => {
          let tod = r.data;
          if (typeof tod === "string") { try { tod = JSON.parse(tod); } catch { tod = EMPTY; } }
          return { date: r.date, today: tod || EMPTY, feedback: r.feedback };
        });
        // Cache in localStorage for instant load next time
        try { localStorage.setItem("gus_cache", JSON.stringify({ entries: allEntries, ts: Date.now() })); } catch {}
        setEntries(allEntries);
        const td = allEntries.find(e => e.date === currentToday);
        if (td) {
          const t = td.today;
          setTodayRaw(t);
          todayRef.current = t;
          setWInput(t.weight || "");
          setGInput(t.grasa || "");
          setImcInput(t.imc || "");
          if (t.analyses?.length) setAnalyses(t.analyses);
          else if (td.feedback) setAnalyses([{ time: "—", text: td.feedback, type: "summary" }]);
          else setAnalyses([]);
        } else {
          // New day — full reset
          setTodayRaw(EMPTY);
          todayRef.current = EMPTY;
          setWInput(""); setGInput(""); setImcInput("");
          setAnalyses([]);
        }
      }
    } catch (e) {
      console.error("loadData error:", e);
    }
    loadingRef.current = false;
    setReady(true); // always ensure app is unblocked after loadData
  };

  useEffect(() => {
    // Fallback: never stay on loading more than 8 seconds
    const timeout = setTimeout(() => { loadingRef.current = false; setReady(true); }, 5000);
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await loadData(session.user.id);
        }
      } catch (e) {
        console.error("Auth error:", e);
      } finally {
        clearTimeout(timeout);
        setReady(true);
      }
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        userRef.current = session.user;
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") await loadData(session.user.id);
      } else if (!session) {
        setUser(null);
        setEntries([]);
        setTodayRaw(EMPTY);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  // Reload when app comes to foreground, force-save when going to background
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && userRef.current?.id) {
        setReady(false); // show loading briefly while refreshing
        loadData(userRef.current.id);
      } else if (document.visibilityState === "hidden" && userRef.current?.id) {
        // Force save current state when app goes to background
        const t = todayRef.current;
        if (t && (t.weight || t.meals?.length || t.drinks?.length || t.training || t.exercises?.length)) {
          supabase.from("entries").upsert({
            user_id: userRef.current.id,
            date: getTodayStr(),
            data: t,
            feedback: t.feedback ?? null,
          }, { onConflict: "user_id,date" }).catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const subscribeToPush = async (userId) => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Tu navegador no soporta notificaciones push.");
      return false;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      // Unsubscribe first to force fresh subscription
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();
      // Subscribe fresh
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: (()=>{
          const b64=VAPID_PUBLIC_KEY;
          const padding='='.repeat((4-b64.length%4)%4);
          const base64=(b64+padding).replace(/-/g,'+').replace(/_/g,'/');
          const raw=window.atob(base64);
          const arr=new Uint8Array(raw.length);
          for(let i=0;i<raw.length;i++) arr[i]=raw.charCodeAt(i);
          return arr;
        })()
      });
      const res = await authedFetch("/api/push", { action: "subscribe", subscription: sub });
      const data = await res.json();
      if (data.ok) {
        return true;
      } else {
        console.error("Push subscription error:", data.error);
        return false;
      }
    } catch (e) {
      console.error("Push subscription error:", e);
      alert("Error: " + e.message);
      return false;
    }
  };

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").then(async () => {
      const reg = await navigator.serviceWorker.ready;
      // Schedule local notifications as fallback
      if (Notification.permission === "granted") {
        const slots = buildNotifSlots(notifConfig);
        reg.active?.postMessage({ type: "SCHEDULE_LOCAL", slots });
      }
    }).catch(() => {});
  }, [notifConfig]);

  const calcMacrosFromProfile = (profile) => {
    const { weight, goal, activity } = profile;
    const w = parseFloat(weight) || 73;
    const actMult = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725 }[activity] || 1.55;
    const tdee = Math.round((10*w + 6.25*170 - 5*27 + 5) * actMult);
    let kcal, prot, fat, carb;
    if (goal === "recomp") { kcal = tdee; prot = Math.round(w*2); fat = Math.round(w*0.9); }
    else if (goal === "bulk") { kcal = tdee + 300; prot = Math.round(w*1.8); fat = Math.round(w*1); }
    else if (goal === "cut") { kcal = tdee - 400; prot = Math.round(w*2.2); fat = Math.round(w*0.8); }
    else { kcal = tdee; prot = Math.round(w*1.6); fat = Math.round(w*0.9); }
    carb = Math.round((kcal - prot*4 - fat*9) / 4);
    return { kcal, prot, fat, carb: Math.max(0, carb) };
  };

  const buildNotifSlots = (config) => {
    const slots = [];
    if (config.meals?.enabled) {
      config.meals.times.forEach(t => slots.push({ time: t, title: "Gus Coach 🍽️", body: "¿Has registrado tu comida?" }));
    }
    if (config.weight?.enabled && config.weight.time) slots.push({ time: config.weight.time, title: "Gus Coach ⚖️", body: "¿Te has pesado hoy?" });
    if (config.supplements?.enabled && config.supplements.time) slots.push({ time: config.supplements.time, title: "Gus Coach 💊", body: "¿Has tomado tus suplementos?" });
    if (config.motivational?.enabled && config.motivational.time) slots.push({ time: config.motivational.time, title: "Gus Coach 🎯", body: "¡Sigue así! Cada día cuenta. 💪" });
    return slots;
  };

  const requestNotifications = async () => {
    if (!("Notification" in window)) { alert("Tu navegador no soporta notificaciones."); return; }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({ type: "SCHEDULE_NOTIFICATIONS", times: ["08:00", "16:00", "21:00"] });
      alert("Notificaciones activadas. Te avisare a las 8:00, 16:00 y 21:00.");
    }
  };

  const todayRef = useRef(today);
  todayRef.current = today;
  const userRef = useRef(user);
  userRef.current = user;

  const pendingSaveRef = useRef(null);

  const persist = async (newEntries, newToday) => {
    const t = newToday ?? todayRef.current;
    const currentDate = getTodayStr();
    const userId = userRef.current?.id;

    if (!userId) {
      // Queue the save for when user is available
      pendingSaveRef.current = { t, currentDate };
      return;
    }

    try {
      const { error } = await supabase.from("entries").upsert({
        user_id: userId,
        date: currentDate,
        data: t,
        feedback: t.feedback ?? null,
      }, { onConflict: "user_id,date" });
      if (error) console.error("persist error:", error);
      else pendingSaveRef.current = null; // clear pending
      if (newEntries) setEntries(newEntries);
      // Also update cache
      try {
        const cached = localStorage.getItem("gus_cache");
        if (cached) {
          const p = JSON.parse(cached);
          const updated = (p.entries || []).filter(e => e.date !== currentDate);
          updated.push({ date: currentDate, today: t, feedback: t.feedback });
          updated.sort((a,b) => a.date.localeCompare(b.date));
          localStorage.setItem("gus_cache", JSON.stringify({ entries: updated, ts: Date.now() }));
        }
      } catch {}
    } catch (e) {
      console.error("persist catch:", e);
      pendingSaveRef.current = { t, currentDate };
    }
  };

  // Subscribe to push when user logs in
  useEffect(() => {
    if (user?.id && Notification.permission === "granted") {
      subscribeToPush(user.id);
    }
  }, [user?.id]);

  // Flush pending saves when user becomes available
  useEffect(() => {
    if (user?.id && pendingSaveRef.current) {
      const { t, currentDate } = pendingSaveRef.current;
      supabase.from("entries").upsert({
        user_id: user.id,
        date: currentDate,
        data: t,
        feedback: t.feedback ?? null,
      }, { onConflict: "user_id,date" }).then(() => {
        pendingSaveRef.current = null;
      }).catch(() => {});
    }
  }, [user]);

  const setT = (patch) => {
    const updated = { ...todayRef.current, ...patch };
    setTodayRaw(updated);
    persist(null, updated);
  };

  const saveWeight = (w, gr, im) => { const wv=w??wInput; const gv=gr??gInput; const iv=im??imcInput; if(wv) setT({ weight: wv, grasa: gv, imc: iv }); };

  const analyzePhoto = async (b64) => {
    setAnPh(true);
    try {
      const res = await authedFetch("/api/coach", {
        image: b64,
        prompt: "Analiza esta foto de comida y estima los macronutrientes y calorías. Responde SOLO con un JSON así, sin texto extra: {\"desc\":\"descripción breve del plato\",\"prot\":25,\"carb\":40,\"fat\":12,\"kcal\":350}. Usa gramos enteros y kcal redondeadas. Si no puedes estimar, pon 0.",
        system: "Eres un nutricionista experto. Analizas fotos de comida y estimas macronutrientes con precisión. Respondes siempre en JSON puro sin markdown."
      });
      const json = await res.json();
      const raw = json.text?.replace(/```json|```/g,"").trim();
      const data = JSON.parse(raw);
      if (data.desc && !mealDesc) setMealDesc(data.desc);
      if (data.prot) setMealProt(String(data.prot));
      if (data.carb) setMealCarb(String(data.carb));
      if (data.fat)  setMealFat(String(data.fat));
      if (data.kcal) setMealKcal(String(data.kcal));
    } catch {}
    setAnPh(false);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMealPhoto(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result.split(",")[1];
      setPhotoB64(b64);
      analyzePhoto(b64);
    };
    reader.readAsDataURL(file);
  };

  const updateMeal = (id, newTime, newSlot) => {
    const updated = today.meals.map(m => m.id === id ? {...m, time: newTime, slot: newSlot} : m);
    setT({ meals: updated });
    setEditingMealId(null);
  };

  const toggleSupp = (suppId, doseIndex) => {
    const key = doseIndex !== undefined ? `${suppId}_${doseIndex}` : suppId;
    const taken = today.suppsTaken || [];
    const updated = taken.includes(key) ? taken.filter(s => s !== key) : [...taken, key];
    setT({ suppsTaken: updated });
  };

  const estimateKcalFromDesc = async (meal) => {
    if (meal.kcal) return; // already has kcal
    try {
      const res = await authedFetch("/api/coach", {
        prompt: `Estima las calorías y macros de esta comida: "${meal.desc}". Responde SOLO con JSON sin texto extra: {"kcal":350,"prot":25,"carb":40,"fat":12}. Usa números enteros. Si no puedes estimar, usa 0.`,
        system: "Eres un nutricionista experto. Estimas calorías y macros de comidas descritas en texto. Respondes siempre en JSON puro sin markdown ni texto adicional."
      });
      const json = await res.json();
      const raw = json.text?.replace(/```json|```/g,"").trim();
      const data = JSON.parse(raw);
      if (data.kcal > 0) {
        const updatedMeal = { ...meal, kcal: data.kcal };
        if (!meal.prot && data.prot) updatedMeal.prot = data.prot;
        if (!meal.carb && data.carb) updatedMeal.carb = data.carb;
        if (!meal.fat  && data.fat)  updatedMeal.fat  = data.fat;
        // Use todayRef to always get latest meals state
        const latestMeals = todayRef.current.meals;
        const updatedMeals = latestMeals.map(m => m.id === meal.id ? updatedMeal : m);
        const updatedToday = { ...todayRef.current, meals: updatedMeals };
        setTodayRaw(updatedToday);
        todayRef.current = updatedToday;
        persist(null, updatedToday); // persist uses getTodayStr() internally
      }
    } catch {}
  };

  const estimateKcal = (meal) => {
    const p = meal.prot || 0;
    const c = meal.carb || 0;
    const f = meal.fat  || 0;
    return Math.round(p * 4 + c * 4 + f * 9);
  };

  const analyzeTranscript = async (transcript) => {
    if (!transcript?.trim()) return;
    setTranscribing(true);
    try {
      const res = await authedFetch("/api/coach", {
        prompt: `El usuario ha dicho por voz lo que comió: "${transcript}". Extrae la descripción de la comida y estima los macros. Responde SOLO con JSON sin texto extra: {"desc":"descripción clara del plato","prot":25,"carb":40,"fat":12,"kcal":350}. Usa gramos enteros y kcal redondeadas.`,
        system: "Eres un nutricionista experto. Interpretas descripciones de comidas en español y estimas macronutrientes. Respondes siempre en JSON puro sin markdown."
      });
      const json = await res.json();
      const raw = json.text?.replace(/```json|```/g,"").trim();
      const data = JSON.parse(raw);
      if (data.desc) setMealDesc(data.desc);
      if (data.prot) setMealProt(String(data.prot));
      if (data.carb) setMealCarb(String(data.carb));
      if (data.fat)  setMealFat(String(data.fat));
      if (data.kcal) setMealKcal(String(data.kcal));
    } catch (e) { console.error("Transcription error:", e); }
    setTranscribing(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Tu navegador no soporta reconocimiento de voz. Prueba con Safari en iPhone o Chrome.");
      return;
    }
    const recognition = new SR();
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsRecording(true);
    recognition.onerror = (e) => {
      setIsRecording(false);
      if (e.error === "not-allowed") alert("Permiso de micrófono denegado. Actívalo en Ajustes del iPhone.");
    };
    recognition.onresult = (e) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      // Show interim results while speaking
      if (interim) setMealDesc(interim);
      // When final result arrives, analyze
      if (final) {
        setMealDesc(final);
        analyzeTranscript(final);
        recognition.stop();
      }
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  const addMeal = async () => {
    if (!mealDesc.trim()) return;
    const meal = { id: Date.now(), slot: mealSlot, desc: mealDesc.trim(), time: nowTime() };
    if (mealProt) meal.prot = parseFloat(mealProt);
    if (mealCarb) meal.carb = parseFloat(mealCarb);
    if (mealFat)  meal.fat  = parseFloat(mealFat);
    if (mealKcal) meal.kcal = parseInt(mealKcal);
    else if (meal.prot || meal.carb || meal.fat) meal.kcal = estimateKcal(meal);
    const newMeals = [...today.meals, meal];
    const newToday = { ...todayRef.current, meals: newMeals };
    setTodayRaw(newToday);
    todayRef.current = newToday;
    // Navigate immediately - don't wait for Supabase
    setMealDesc(""); setMealProt(""); setMealCarb(""); setMealFat(""); setMealKcal(""); setMealPhoto(null); setPhotoB64(null); setScreen("home");
    // Save and estimate in background
    persist(null, newToday).then(() => {
      if (!meal.kcal && meal.desc) estimateKcalFromDesc(meal);
    });
  };

  const addDrink = () => {
    if (!drinkAmt.trim()) return;
    setT({ drinks: [...today.drinks, { id: Date.now(), type: drinkId, amount: drinkAmt, unit: drinkUnit, time: nowTime() }] });
    setDrinkAmt(""); setScreen("home");
  };

  const openAddExercise = () => {
    setEditingExerciseId(null);
    setExName("");
    setExSets([{ weight:"", reps:"" }]);
    setScreen("addExercise");
  };

  const openEditExercise = (ex) => {
    setEditingExerciseId(ex.id);
    setExName(ex.name);
    setExSets(ex.sets?.length ? ex.sets.map(s=>({ weight: s.weight??"", reps: s.reps??"" })) : [{ weight:"", reps:"" }]);
    setScreen("addExercise");
  };

  const addExerciseSet = () => {
    setExSets(prev => {
      const last = prev[prev.length-1];
      return [...prev, { weight: last?.weight ?? "", reps: last?.reps ?? "" }]; // repite el peso/reps de la última serie como punto de partida
    });
  };

  const removeExerciseSet = (idx) => {
    setExSets(prev => prev.length>1 ? prev.filter((_,i)=>i!==idx) : prev);
  };

  const updateExerciseSet = (idx, field, value) => {
    setExSets(prev => prev.map((s,i)=> i===idx ? { ...s, [field]: value } : s));
  };

  const saveExercise = () => {
    const name = exName.trim();
    if (!name) return;
    const cleanSets = exSets
      .map(s => ({
        weight: s.weight!=="" ? parseFloat(s.weight) : "",
        reps: s.reps!=="" ? parseInt(s.reps, 10) : "",
      }))
      .filter(s => s.weight!=="" || s.reps!=="");
    if (!cleanSets.length) return;
    const list = today.exercises || [];
    const newList = editingExerciseId
      ? list.map(x => x.id===editingExerciseId ? { ...x, name, sets: cleanSets } : x)
      : [...list, { id: Date.now(), name, sets: cleanSets }];
    setT({ exercises: newList });
    setEditingExerciseId(null); setExName(""); setExSets([{ weight:"", reps:"" }]);
    setScreen("home");
  };

  const removeExercise = (id) => {
    const list = today.exercises || [];
    const removed = list.find(x=>x.id===id);
    const newExercises = list.filter(x=>x.id!==id);
    let newGroups = today.muscleGroups || [];
    if (removed?.muscleGroup && !newExercises.some(x=>x.muscleGroup===removed.muscleGroup)) {
      newGroups = newGroups.filter(g=>g!==removed.muscleGroup);
    }
    setT({ exercises: newExercises, muscleGroups: newGroups });
  };

  // Abre la pantalla de "añadir serie" para un grupo muscular, precargando
  // el último ejercicio/peso usado hoy en ese grupo (o el primero del catálogo)
  const openAddSet = (groupId) => {
    const todayGroupEx = (today.exercises||[]).filter(x=>x.muscleGroup===groupId);
    const lastEx = todayGroupEx[todayGroupEx.length-1];
    const catalogList = exerciseCatalog[groupId]||[];
    const name = lastEx?.name || catalogList[0] || "";
    setSetGroupId(groupId);
    setSetExerciseName(name);
    setNewQuickExercise("");
    const lastSet = lastEx?.sets?.[lastEx.sets.length-1];
    setSetWeight(lastSet?.weight ?? 0);
    setSetReps(lastSet?.reps ?? 8);
    setSetUnit(lastSet?.unit || weightUnit);
    setScreen("addSet");
  };

  const saveSet = () => {
    const name = (setExerciseName || newQuickExercise).trim();
    if (!name) return;
    const catalogList = exerciseCatalog[setGroupId]||[];
    if (!catalogList.includes(name)) {
      saveExerciseCatalog({ ...exerciseCatalog, [setGroupId]: [...catalogList, name] });
    }
    const newSet = { weight: setWeight, reps: setReps, unit: setUnit };
    const list = today.exercises || [];
    const idx = list.findIndex(x => x.name===name && x.muscleGroup===setGroupId);
    const newList = idx>=0
      ? list.map((x,i)=> i===idx ? { ...x, sets:[...x.sets, newSet] } : x)
      : [...list, { id: Date.now(), name, muscleGroup: setGroupId, sets:[newSet] }];
    const curGroups = today.muscleGroups||[];
    const newGroups = curGroups.includes(setGroupId) ? curGroups : [...curGroups, setGroupId];
    setT({ exercises: newList, muscleGroups: newGroups });
    setScreen("home");
  };

  const buildContext = () => {
    const mealTxt = today.meals.length
      ? today.meals.map(m => { const macros = [m.prot?`P:${m.prot}g`:"",m.carb?`C:${m.carb}g`:"",m.fat?`G:${m.fat}g`:"",m.kcal?`${m.kcal}kcal`:""].filter(Boolean).join(" "); return `- ${MEALS.find(x=>x.id===m.slot)?.label} (${m.time}): ${m.desc}${macros?" ["+macros+"]":""}`; }).join("\n")
      : "Sin comidas";
    const drinkTxt = today.drinks.length
      ? today.drinks.map(d => `- ${DRINKS.find(x => x.id === d.type)?.label}: ${d.amount}${d.unit}`).join("\n")
      : "Sin bebidas";
    const muscleGroups = today.muscleGroups||[];
    const muscleTxt = muscleGroups.length
      ? muscleGroups.map(id=>MUSCLE_GROUPS.find(m=>m.id===id)?.label||id).join(", ")
      : today.training || "ninguno";
    const exercises = today.exercises||[];
    const exerciseTxt = exercises.length
      ? exercises.map(ex => `- ${ex.name}${ex.muscleGroup?` (${MUSCLE_GROUPS.find(m=>m.id===ex.muscleGroup)?.label||ex.muscleGroup})`:""}: ${ex.sets.map(s=>`${fmtSetVal(s.weight)}${s.unit||"kg"}×${fmtSetVal(s.reps)}`).join(", ")}`).join("\n")
      : "Sin ejercicios registrados";
    return { mealTxt, drinkTxt, muscleTxt, exerciseTxt };
  };

  const saveAnalysis = async (text, type, newAnalyses) => {
    const updatedToday = { ...todayRef.current, analyses: newAnalyses };
    setTodayRaw(updatedToday);
    todayRef.current = updatedToday;
    const lastFeedback = [...newAnalyses].reverse().find(a => a.type === "summary")?.text
      || newAnalyses[newAnalyses.length - 1]?.text || text;
    try {
      await supabase.from("entries").upsert({
        user_id: userRef.current?.id || "gus", date: getTodayStr(),
        data: updatedToday,
        feedback: lastFeedback,
      }, { onConflict: "user_id,date" });
      const entry = { date: todayStr, today: updatedToday, feedback: lastFeedback };
      const all = [...entries.filter(e => e.date !== todayStr), entry].sort((a, b) => a.date.localeCompare(b.date));
      setEntries(all);
    } catch {}
  };

  const analyzeNow = async () => {
    setLoading(true); setAiText(""); setScreen("result");
    const { mealTxt, drinkTxt, muscleTxt, exerciseTxt } = buildContext();
    const totalKcalNow = todayRef.current.meals.reduce((s,m)=>s+(m.kcal||0),0);
    const prompt = `Análisis rápido (${nowTime()}, ${new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long" })}):\nPESO: ${todayRef.current.weight || "no registrado"}kg${todayRef.current.grasa ? " | Grasa: "+todayRef.current.grasa+"%" : ""}\nCALORÍAS: ${totalKcalNow}kcal de ${kcalGoal}kcal objetivo\nCOMIDAS HASTA AHORA:\n${mealTxt}\nBEBIDAS:\n${drinkTxt}\nGRUPOS MUSCULARES: ${muscleTxt}${todayRef.current.training?" | Notas: "+todayRef.current.training:""}\nEJERCICIOS:\n${exerciseTxt}\nDame feedback breve sobre lo que llevo hasta ahora, incluyendo si voy bien con las calorías.`;
    try {
      const text = await callClaude(prompt);
      setAiText(text);
      const newAnalyses = [...analyses, { time: nowTime(), text, type: "quick" }];
      setAnalyses(newAnalyses);
      saveAnalysis(text, "quick", newAnalyses); // no await - don't block UI
    } catch (e) {
      setAiText("Error al conectar con el coach: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeDay = async () => {
    setLoading(true); setAiText(""); setScreen("result");
    const { mealTxt, drinkTxt, muscleTxt, exerciseTxt } = buildContext();
    const totalKcalDay = todayRef.current.meals.reduce((s,m)=>s+(m.kcal||0),0);
    const prompt = `Resumen final del día (${new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}):\nPESO: ${todayRef.current.weight || "no registrado"}kg${todayRef.current.grasa ? " | Grasa: "+todayRef.current.grasa+"%" : ""}${todayRef.current.imc ? " | IMC: "+todayRef.current.imc : ""}\nCALORÍAS TOTALES: ${totalKcalDay}kcal de ${kcalGoal}kcal objetivo\nCOMIDAS:\n${mealTxt}\nBEBIDAS:\n${drinkTxt}\nGRUPOS MUSCULARES: ${muscleTxt}${todayRef.current.training?" | Notas: "+todayRef.current.training:""}\nEJERCICIOS:\n${exerciseTxt}\nEste es el resumen completo del día. Dame un análisis detallado incluyendo valoración calórica y un ajuste concreto para mañana.`;
    try {
      const text = await callClaude(prompt);
      setAiText(text);
      const newAnalyses = [...analyses, { time: nowTime(), text, type: "summary" }];
      setAnalyses(newAnalyses);
      saveAnalysis(text, "summary", newAnalyses); // no await
    } catch (e) {
      setAiText("Error al conectar con el coach: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const sendChat = async () => {
    if (!chatIn.trim() || chatBusy) return;
    const text = chatIn.trim(); setChatIn("");
    const next = [...msgs, { role: "user", content: text }];
    setMsgs(next); setChatBusy(true);
    const ctx = entries.slice(-5).map(e => `${e.date}: ${e.today?.weight || "?"}kg | ${e.today?.meals?.length || 0} comidas | ${(e.today?.exercises||[]).map(x=>x.name).join(", ") || e.today?.training || "-"}`).join("\n");
    try {
      const reply = await callClaude((ctx ? `Contexto reciente:\n${ctx}\n\n` : "") + text);
      setMsgs([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setMsgs([...next, { role: "assistant", content: "Error: " + e.message }]);
    }
    setChatBusy(false);
  };

  const todayEntry = entries.find(e => e.date === todayStr);
  const wHistory = entries.filter(e => e.today?.weight).slice(-14);
  const wVals = wHistory.map(e => parseFloat(e.today.weight)).filter(Boolean);
  const wMin = wVals.length ? Math.min(...wVals) - 0.5 : 70;
  const wMax = wVals.length ? Math.max(...wVals) + 0.5 : 78;
  const prevW = entries.filter(e => e.today?.weight && e.date !== todayStr).slice(-1)[0]?.today?.weight;
  const wDiff = today.weight && prevW ? (parseFloat(today.weight) - parseFloat(prevW)).toFixed(1) : null;
  const waterL = today.drinks.filter(d => d.type === "water" && d.unit === "ml").reduce((s, d) => s + parseFloat(d.amount || 0), 0) / 1000;
  const hasAlc = today.drinks.some(d => ["beer","wine","spirits"].includes(d.type));
  const exerciseHistory = [...new Set(
    entries.flatMap(e => (e.today?.exercises||[]).map(x=>x.name))
      .concat((today.exercises||[]).map(x=>x.name))
  )];
  const exerciseSuggestions = exName.trim()
    ? exerciseHistory.filter(n => n.toLowerCase().includes(exName.trim().toLowerCase()) && n.toLowerCase()!==exName.trim().toLowerCase()).slice(0,6)
    : [];

  const sc = SECTION_COLORS[screen] || SECTION_COLORS.home;

  const g = {
    page:     { minHeight:"100vh", background:`linear-gradient(160deg,#080b0f,${sc.bg} 60%,#080b0f)`, transition:"background .45s ease", fontFamily:"'DM Sans',sans-serif", color:"#e8f5e8" },
    wrap:     { maxWidth:440, margin:"0 auto", padding:"0 18px 90px" },
    hdr:      { padding:"28px 0 16px", display:"flex", justifyContent:"space-between", alignItems:"center" },
    logo:     { fontSize:11, fontWeight:800, letterSpacing:".3em", textTransform:"uppercase", color:sc.primary, transition:"color .45s ease" },
    dt:       { fontSize:11, color:"rgba(232,245,232,.3)" },
    card:     { background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:18, padding:18, marginBottom:12 },
    cardG:    { background:"rgba(74,222,128,.05)", border:"1px solid rgba(74,222,128,.18)", borderRadius:18, padding:18, marginBottom:12 },
    sec:      { fontSize:9, fontWeight:800, letterSpacing:".2em", textTransform:"uppercase", color:"rgba(74,222,128,.55)", marginBottom:12 },
    g3:       { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 },
    sbox:     { background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:14, padding:"14px 8px", textAlign:"center" },
    sv:       { fontSize:20, fontWeight:900, color:"#4ade80", lineHeight:1 },
    sl:       { fontSize:9, color:"rgba(232,245,232,.35)", marginTop:4, letterSpacing:".1em", textTransform:"uppercase" },
    btnP:     { width:"100%", padding:"16px", borderRadius:14, border:"none", background:"linear-gradient(135deg,#4ade80,#22c55e)", color:"#080b0f", fontSize:14, fontWeight:800, cursor:"pointer", marginBottom:10 },
    btnS:     { width:"100%", padding:"14px", borderRadius:14, border:"1px solid rgba(74,222,128,.2)", background:"rgba(74,222,128,.04)", color:"#4ade80", fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:10 },
    back:     { background:"none", border:"none", color:"rgba(232,245,232,.35)", fontSize:13, cursor:"pointer", padding:"4px 0", marginBottom:8 },
    inp:      { width:"100%", padding:14, borderRadius:12, border:"1px solid rgba(74,222,128,.2)", background:"rgba(255,255,255,.05)", color:"#e8f5e8", fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:12, fontFamily:"'DM Sans',sans-serif" },
    lbl:      { fontSize:10, fontWeight:700, color:"rgba(74,222,128,.6)", letterSpacing:".15em", textTransform:"uppercase", marginBottom:8, display:"block" },
    chip:     (a) => ({ padding:"7px 12px", borderRadius:18, border: a?"1px solid #4ade80":"1px solid rgba(255,255,255,.1)", background: a?"rgba(74,222,128,.12)":"rgba(255,255,255,.03)", color: a?"#4ade80":"rgba(232,245,232,.45)", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }),
    addBtn:   { background:"rgba(74,222,128,.08)", border:"1px solid rgba(74,222,128,.22)", borderRadius:9, color:"#4ade80", fontSize:11, fontWeight:700, padding:"5px 10px", cursor:"pointer" },
    rm:       { background:"none", border:"none", color:"rgba(232,245,232,.18)", fontSize:18, cursor:"pointer", flexShrink:0 },
    fb:       { background:"rgba(74,222,128,.05)", border:"1px solid rgba(74,222,128,.18)", borderRadius:14, padding:18, marginBottom:16, fontSize:14, lineHeight:1.75, color:"#d1fae5" },
    chart:    { height:68, display:"flex", alignItems:"flex-end", gap:3 },
    bar:      (h,t) => ({ flex:1, borderRadius:"3px 3px 0 0", minWidth:0, height:`${h}%`, background: t?"linear-gradient(180deg,#4ade80,#22c55e)":"rgba(74,222,128,.35)", transition:"height .3s ease" }),
    nav:      { position:"fixed", bottom:0, left:0, right:0, background:"rgba(8,11,15,.97)", borderTop:"1px solid rgba(255,255,255,.07)", display:"flex", justifyContent:"space-around", padding:"10px 0 18px", zIndex:100 },
    nb:       (a) => ({ display:"flex", flexDirection:"column", alignItems:"center", gap:2, background:"none", border:"none", color: a?sc.primary:"rgba(232,245,232,.28)", cursor:"pointer", padding:"3px 16px", fontSize:9, fontWeight:600 }),
    chatWrap: { display:"flex", flexDirection:"column", height:"calc(100vh - 110px)" },
    chatScr:  { flex:1, overflowY:"auto", display:"flex", flexDirection:"column", paddingBottom:6 },
    bub:      (u) => ({ maxWidth:"85%", padding:"11px 15px", marginBottom:8, fontSize:13, lineHeight:1.65, borderRadius: u?"16px 16px 3px 16px":"16px 16px 16px 3px", background: u?"linear-gradient(135deg,#4ade80,#22c55e)":"rgba(255,255,255,.06)", color: u?"#080b0f":"#e8f5e8", border: u?"none":"1px solid rgba(255,255,255,.08)", alignSelf: u?"flex-end":"flex-start" }),
    chatRow:  { display:"flex", gap:8, paddingTop:10, borderTop:"1px solid rgba(255,255,255,.07)" },
    chatInp:  { flex:1, padding:"13px 14px", borderRadius:12, border:"1px solid rgba(74,222,128,.2)", background:"rgba(255,255,255,.05)", color:"#e8f5e8", fontSize:13, outline:"none", fontFamily:"'DM Sans',sans-serif" },
    send:     { padding:"13px 16px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#4ade80,#22c55e)", color:"#080b0f", fontWeight:900, fontSize:16, cursor:"pointer" },
  };

  const Chart = () => {
    const [tip, setTip] = useState(null);
    if (wVals.length < 2) return <p style={{ color:"rgba(232,245,232,.22)", fontSize:12, textAlign:"center", padding:"12px 0" }}>Registra al menos 2 días</p>;
    const range = wMax - wMin;

    // Build full 14-day range including empty days
    const fullDays = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const entry = entries.find(e => e.date === dateStr);
      const w = entry?.today?.weight ? parseFloat(entry.today.weight) : null;
      fullDays.push({ dateStr, w });
    }

    return <>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <span style={{ fontSize:9, color:"rgba(232,245,232,.22)" }}>{wMax.toFixed(1)}kg</span>
        {tip
          ? <span style={{ fontSize:11, fontWeight:700, color:"#4ade80" }}>{tip.w}kg <span style={{ fontSize:9, color:"rgba(232,245,232,.35)", fontWeight:400 }}>{tip.date?.slice(5)}</span></span>
          : <span style={{ fontSize:9, color:"rgba(232,245,232,.22)" }}>{wMin.toFixed(1)}kg</span>
        }
      </div>
      <div style={g.chart}>
        {fullDays.map((day, i) => {
          const isToday = day.dateStr === todayStr;
          const isTip = tip?.i === i;
          if (!day.w) {
            // Empty day - show dotted placeholder bar at minimum height
            return <div key={i} style={{
              flex:1, borderRadius:"3px 3px 0 0", minWidth:0, height:"12%",
              border:"1px dashed rgba(74,222,128,.2)", background:"transparent",
              alignSelf:"flex-end"
            }}/>;
          }
          const h = range > 0 ? Math.max(8, ((day.w - wMin)/range)*80+10) : 50;
          return <div key={i}
            onClick={() => setTip(isTip ? null : {i, w: day.w, date: day.dateStr})}
            style={{...g.bar(h, isToday), cursor:"pointer",
              opacity: tip && !isTip ? 0.5 : 1,
              outline: isTip ? "2px solid #4ade80" : "none",
              outlineOffset:"1px"}}/>;
        })}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
        <span style={{ fontSize:9, color:"rgba(232,245,232,.2)" }}>{fullDays[0]?.dateStr?.slice(5)}</span>
        <span style={{ fontSize:9, color:"#4ade80" }}>hoy</span>
      </div>
    </>;
  };

  if (!settingsLoaded || (!ready && !user)) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#080b0f,#091209)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}><div style={{ fontSize:32, marginBottom:10 }}>⚡</div><div style={{ color:"#4ade80", fontSize:13 }}>Conectando...</div></div>
    </div>
  );

  const completeOnboarding = () => {
    const macros = calcMacrosFromProfile({ ...onboardData, goal: onboardData.goal });
    setMacroGoals({ prot: macros.prot, carb: macros.carb, fat: macros.fat });
    setKcalGoal(macros.kcal);
    const profile = { ...onboardData, completed: true };
    setUserProfile(profile);
    localStorage.setItem("gus_settings", JSON.stringify({
      kcalGoal: macros.kcal, supplements, notifConfig, userProfile: profile,
      macroGoals: { prot: macros.prot, carb: macros.carb, fat: macros.fat },
      exerciseCatalog, weightUnit, goalWeight, goalGrasa
    }));
  };

  if (!user || !userProfile?.completed) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#080b0f,#091209 60%,#080b0f)", fontFamily:"'DM Sans',sans-serif", color:"#e8f5e8", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
      <div style={{ maxWidth:360, width:"100%", padding:"0 24px" }}>
        {onboardStep === 0 && <div style={{textAlign:"center"}}>
          <div style={{ fontSize:64, marginBottom:16 }}>💪</div>
          <div style={{ fontSize:28, fontWeight:900, color:"#4ade80", marginBottom:8 }}>Gus Coach</div>
          <div style={{ fontSize:14, color:"rgba(232,245,232,.45)", marginBottom:40, lineHeight:1.6 }}>Tu coach personal de fitness con IA</div>
          <button onClick={()=>setOnboardStep(1)} style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", background:"linear-gradient(135deg,#4ade80,#22c55e)", color:"#080b0f", fontSize:15, fontWeight:800, cursor:"pointer", marginBottom:12 }}>
            Empezar →
          </button>
          {!user && <button onClick={signInWithGoogle} style={{ width:"100%", padding:"14px", borderRadius:14, border:"1px solid rgba(255,255,255,.15)", background:"rgba(255,255,255,.04)", color:"rgba(232,245,232,.6)", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Ya tengo cuenta — Entrar
          </button>}
        </div>}

        {onboardStep === 1 && <div>
          <div style={{fontSize:11,color:"rgba(232,245,232,.3)",marginBottom:8}}>1 de 3</div>
          <div style={{fontSize:22,fontWeight:900,marginBottom:8}}>¿Cuál es tu objetivo?</div>
          <div style={{fontSize:13,color:"rgba(232,245,232,.4)",marginBottom:24}}>Esto determinará tus objetivos calóricos y de macros.</div>
          {[
            {id:"recomp", icon:"⚖️", label:"Recomposición corporal", desc:"Bajar grasa manteniendo músculo"},
            {id:"cut",    icon:"🔥", label:"Definición",             desc:"Bajar grasa rápidamente"},
            {id:"bulk",   icon:"💪", label:"Volumen",                desc:"Ganar masa muscular"},
            {id:"maintain",icon:"🎯",label:"Mantenimiento",          desc:"Mantener el peso actual"},
          ].map(o=>(
            <div key={o.id} onClick={()=>setOnboardData(p=>({...p,goal:o.id}))}
              style={{padding:"14px 16px",borderRadius:14,border:onboardData.goal===o.id?"1px solid #4ade80":"1px solid rgba(255,255,255,.08)",
                background:onboardData.goal===o.id?"rgba(74,222,128,.1)":"rgba(255,255,255,.03)",cursor:"pointer",marginBottom:10,
                display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:24}}>{o.icon}</div>
              <div><div style={{fontSize:14,fontWeight:700,color:onboardData.goal===o.id?"#4ade80":"#e8f5e8"}}>{o.label}</div>
              <div style={{fontSize:11,color:"rgba(232,245,232,.4)",marginTop:2}}>{o.desc}</div></div>
            </div>
          ))}
          <button onClick={()=>setOnboardStep(2)} style={{width:"100%",padding:"16px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#4ade80,#22c55e)",color:"#080b0f",fontSize:14,fontWeight:800,cursor:"pointer",marginTop:8}}>
            Siguiente →
          </button>
        </div>}

        {onboardStep === 2 && <div>
          <div style={{fontSize:11,color:"rgba(232,245,232,.3)",marginBottom:8}}>2 de 3</div>
          <div style={{fontSize:22,fontWeight:900,marginBottom:8}}>Nivel de actividad</div>
          <div style={{fontSize:13,color:"rgba(232,245,232,.4)",marginBottom:24}}>¿Cuántos días a la semana haces ejercicio?</div>
          {[
            {id:"sedentary", icon:"🛋️", label:"Sedentario",  desc:"Poco o ningún ejercicio"},
            {id:"light",     icon:"🚶", label:"Ligero",      desc:"1-3 días/semana"},
            {id:"moderate",  icon:"🏃", label:"Moderado",   desc:"3-5 días/semana"},
            {id:"active",    icon:"🏋️", label:"Muy activo", desc:"6-7 días/semana"},
          ].map(o=>(
            <div key={o.id} onClick={()=>setOnboardData(p=>({...p,activity:o.id}))}
              style={{padding:"14px 16px",borderRadius:14,border:onboardData.activity===o.id?"1px solid #4ade80":"1px solid rgba(255,255,255,.08)",
                background:onboardData.activity===o.id?"rgba(74,222,128,.1)":"rgba(255,255,255,.03)",cursor:"pointer",marginBottom:10,
                display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:24}}>{o.icon}</div>
              <div><div style={{fontSize:14,fontWeight:700,color:onboardData.activity===o.id?"#4ade80":"#e8f5e8"}}>{o.label}</div>
              <div style={{fontSize:11,color:"rgba(232,245,232,.4)",marginTop:2}}>{o.desc}</div></div>
            </div>
          ))}
          <button onClick={()=>setOnboardStep(3)} style={{width:"100%",padding:"16px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#4ade80,#22c55e)",color:"#080b0f",fontSize:14,fontWeight:800,cursor:"pointer",marginTop:8}}>
            Siguiente →
          </button>
        </div>}

        {onboardStep === 3 && <div>
          <div style={{fontSize:11,color:"rgba(232,245,232,.3)",marginBottom:8}}>3 de 3</div>
          <div style={{fontSize:22,fontWeight:900,marginBottom:8}}>Tu peso actual</div>
          <div style={{fontSize:13,color:"rgba(232,245,232,.4)",marginBottom:24}}>Para calcular tus objetivos de macros.</div>
          <input type="number" inputMode="decimal" placeholder="ej: 73.3"
            value={onboardData.weight} onChange={e=>setOnboardData(p=>({...p,weight:e.target.value}))}
            style={{width:"100%",padding:16,borderRadius:12,border:"1px solid rgba(74,222,128,.3)",background:"rgba(255,255,255,.05)",color:"#e8f5e8",fontSize:18,outline:"none",marginBottom:8,textAlign:"center"}}/>
          <div style={{fontSize:11,color:"rgba(232,245,232,.3)",textAlign:"center",marginBottom:24}}>kg</div>
          {onboardData.weight&&(()=>{
            const m = calcMacrosFromProfile({...onboardData});
            return <div style={{background:"rgba(74,222,128,.06)",border:"1px solid rgba(74,222,128,.2)",borderRadius:14,padding:16,marginBottom:20}}>
              <div style={{fontSize:11,color:"rgba(74,222,128,.6)",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:12}}>Tus objetivos calculados</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[["🔥 Calorías",m.kcal,"kcal"],["🥩 Proteína",m.prot,"g"],["🍚 Carbos",m.carb,"g"],["🧈 Grasas",m.fat,"g"]].map(([l,v,u])=>(
                  <div key={l} style={{textAlign:"center",padding:"10px 8px",background:"rgba(255,255,255,.04)",borderRadius:10}}>
                    <div style={{fontSize:18,fontWeight:900,color:"#4ade80"}}>{v}<span style={{fontSize:11,color:"rgba(232,245,232,.4)"}}>{u}</span></div>
                    <div style={{fontSize:10,color:"rgba(232,245,232,.4)",marginTop:3}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>;
          })()}
          <button onClick={()=>{ completeOnboarding(); if (!user) signInWithGoogle(); }}
            style={{width:"100%",padding:"16px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#4ade80,#22c55e)",color:"#080b0f",fontSize:14,fontWeight:800,cursor:"pointer"}}>
            Empezar con Google →
          </button>
        </div>}
      </div>
    </div>
  );

  const showNav = ["home","stats","achievements","history","chat","settings"].includes(screen);

  return (
    <div style={g.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
      <div style={g.wrap} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div style={g.hdr}>
          <span style={g.logo}>Gus Coach</span>
<span style={g.dt}>{new Date().toLocaleDateString("es-ES",{day:"numeric",month:"short"})}</span>
        </div>

        <div style={{
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? `translateX(${slideDir * -28}px)` : "translateX(0)",
          transition: "opacity .18s ease, transform .18s ease"
        }}>

        {screen==="home" && <>
          <div style={g.g3}>
            <div style={g.sbox}><div style={g.sv}>{today.weight||"—"}</div><div style={g.sl}>kg hoy</div></div>
            <div style={g.sbox}><div style={{...g.sv,color:wDiff<0?"#4ade80":wDiff>0?"#f87171":"#4ade80"}}>{wDiff?(wDiff>0?`+${wDiff}`:wDiff):"—"}</div><div style={g.sl}>vs ayer</div></div>
            <div style={g.sbox}><div style={g.sv}>{today.meals.length}</div><div style={g.sl}>comidas</div></div>
          </div>

          {(()=>{
            const streak = calcStreak(entries);
            if (streak === 0) return null;
            const nextBadge = BADGES.find(b => b.days > streak);
            const earnedBadges = BADGES.filter(b => b.days <= streak);
            const lastBadge = earnedBadges[earnedBadges.length-1];
            return (
              <div style={{...g.card, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{fontSize:32}}>{lastBadge?.icon || "🔥"}</div>
                  <div>
                    <div style={{fontSize:20,fontWeight:900,color:"#4ade80"}}>{streak} <span style={{fontSize:13,fontWeight:600,color:"rgba(74,222,128,.6)"}}>días seguidos</span></div>
                    {nextBadge&&<div style={{fontSize:10,color:"rgba(232,245,232,.35)",marginTop:2}}>
                      {nextBadge.days - streak} días para {nextBadge.icon} {nextBadge.label}
                    </div>}
                  </div>
                </div>
                {nextBadge&&<div style={{width:36,height:36,borderRadius:"50%",border:"2px solid rgba(74,222,128,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,opacity:.35}}>{nextBadge.icon}</div>}
              </div>
            );
          })()}

          <WeightCard
            saved={!!today.weight}
            weight={today.weight} grasa={today.grasa} imc={today.imc}
            onSave={(w,gr,im)=>{ setWInput(w); setGInput(gr); setImcInput(im); saveWeight(w,gr,im); }}
            onEdit={()=>{ setT({weight:"",grasa:"",imc:""}); setWInput(""); setGInput(""); setImcInput(""); }}
            g={g}
          />

          <div style={g.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={g.sec}>🍽️ Comidas de hoy</div>
              <button style={g.addBtn} onClick={()=>{setMealSlot(timeSlot());setMealDesc("");setScreen("addMeal");}}>+ Añadir</button>
            </div>
            {today.meals.length===0?<p style={{color:"rgba(232,245,232,.22)",fontSize:12}}>Sin comidas registradas aún</p>
              :today.meals.map(m=>{const sl=MEALS.find(x=>x.id===m.slot);return(
              <div key={m.id} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                <div style={{flex:1}}>
                  <div onClick={()=>{setEditingMealId(m.id);setEditingMealTime(m.time||"12:00");setEditingMealSlot(m.slot||"other");}}
                    style={{fontSize:10,color:"#4ade80",fontWeight:700,marginBottom:2,cursor:"pointer",display:"inline-block",borderBottom:"1px dotted rgba(74,222,128,.5)",paddingBottom:1}}>{sl?.icon} {sl?.label} · {m.time} ✏️</div>
                  <div style={{fontSize:12,color:"rgba(232,245,232,.65)",lineHeight:1.4}}>{m.desc}</div>
                  {(m.prot||m.carb||m.fat)&&<div style={{fontSize:10,color:"rgba(74,222,128,.5)",marginTop:3}}>{m.prot?`P:${m.prot}g `:""}{m.carb?`C:${m.carb}g `:""}{m.fat?`G:${m.fat}g`:""}</div>}
                </div>
                <button style={g.rm} onClick={()=>setT({meals:today.meals.filter(x=>x.id!==m.id)})}>×</button>
              </div>);})}
          </div>

          <div style={g.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={g.sec}>💧 Bebidas {waterL>0&&<span style={{color:"#38bdf8"}}>· {waterL.toFixed(1)}L</span>}{hasAlc&&" 🍺"}</div>
              <button style={g.addBtn} onClick={()=>{setDrinkId("water");setDrinkAmt("");setDrinkUnit("ml");setScreen("addDrink");}}>+ Añadir</button>
            </div>
            {today.drinks.length===0?<p style={{color:"rgba(232,245,232,.22)",fontSize:12}}>Sin bebidas registradas aún</p>
              :today.drinks.map(d=>{const dt=DRINKS.find(x=>x.id===d.type);return(
              <div key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                <span style={{fontSize:13}}>{dt?.icon} <span style={{color:"rgba(232,245,232,.65)"}}>{dt?.label}</span> <span style={{color:"rgba(232,245,232,.25)",fontSize:11}}>{d.time}</span></span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{color:dt?.color||"#4ade80",fontWeight:700,fontSize:13}}>{d.amount}{d.unit}</span>
                  <button style={g.rm} onClick={()=>setT({drinks:today.drinks.filter(x=>x.id!==d.id)})}>×</button>
                </div>
              </div>);})}
          </div>

          <div style={g.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={g.sec}>💪 Entrenamiento</div>
              {(today.muscleGroups||[]).length>0&&<span style={{fontSize:10,color:"rgba(74,222,128,.6)"}}>{(today.muscleGroups||[]).length} grupos</span>}
            </div>
            {["empuje","tiron","piernas","core"].map(cat=>(
              <div key={cat} style={{marginBottom:12}}>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:".15em",textTransform:"uppercase",color:"rgba(232,245,232,.3)",marginBottom:7}}>{CAT_LABELS[cat]}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {MUSCLE_GROUPS.filter(m=>m.cat===cat).map(m=>{
                    const active=(today.muscleGroups||[]).includes(m.id);
                    return <div key={m.id} onClick={()=>{
                      // Descanso no tiene ejercicios: se marca/desmarca como antes
                      if (m.id === "descanso") {
                        const cur=today.muscleGroups||[];
                        const next=active?cur.filter(x=>x!==m.id):[...cur,m.id];
                        setT({muscleGroups:next});
                      } else {
                        openAddSet(m.id);
                      }
                    }} style={{
                      display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:20,cursor:"pointer",
                      border:`1.5px solid ${active?m.color:m.color+"44"}`,
                      background:active?`${m.color}18`:"rgba(255,255,255,.03)",
                      opacity:active?1:0.55,transition:"all .2s"
                    }}>
                      <div style={{width:24,height:24,borderRadius:"50%",background:active?`${m.color}33`:"rgba(255,255,255,.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:m.abbr.length>2?14:10,fontWeight:800,color:m.color,flexShrink:0}}>{m.abbr}</div>
                      <span style={{fontSize:12,fontWeight:600,color:active?m.color:"rgba(232,245,232,.55)"}}>{m.label}</span>
                    </div>;
                  })}
                </div>
              </div>
            ))}

            <div style={{marginTop:6,marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:".15em",textTransform:"uppercase",color:"rgba(232,245,232,.3)"}}>Ejercicios</div>
                <button style={g.addBtn} onClick={openAddExercise}>+ Añadir</button>
              </div>
              {(today.exercises||[]).length===0
                ? <div style={{fontSize:12,color:"rgba(232,245,232,.25)"}}>Sin ejercicios registrados hoy</div>
                : (today.exercises||[]).map(ex=>(
                  <div key={ex.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                    <div style={{cursor:"pointer",flex:1}} onClick={()=>openEditExercise(ex)}>
                      <div style={{fontSize:13,fontWeight:600}}>{ex.name}</div>
                      <div style={{fontSize:11,color:"rgba(232,245,232,.4)"}}>
                        {ex.sets.length} {ex.sets.length===1?"serie":"series"} · {ex.sets.map(s=>`${fmtSetVal(s.weight)}${s.unit||"kg"}×${fmtSetVal(s.reps)}`).join(", ")}
                      </div>
                    </div>
                    <button style={g.rm} onClick={()=>removeExercise(ex.id)}>×</button>
                  </div>
                ))}
            </div>

            <input style={{...g.inp,marginBottom:0,fontSize:12}} placeholder="Notas adicionales"
              value={today.training}
              onChange={e=>{ const v=e.target.value; setTodayRaw(p=>({...p,training:v})); todayRef.current={...todayRef.current,training:v}; }}
              onBlur={e=>persist(null,{...todayRef.current,training:e.target.value})}/>
          </div>

          {(()=>{
            const totalKcal = today.meals.reduce((s,m)=>s+(m.kcal||0),0);
            const pct = Math.min(100, Math.round((totalKcal/kcalGoal)*100));
            const mealsWithKcal = today.meals.filter(m=>m.kcal>0);
            const SLOT_COLORS = { breakfast:"#fb923c", midmorning:"#fbbf24", lunch:"#4ade80", snack:"#38bdf8", dinner:"#a78bfa", other:"#94a3b8" };
            return totalKcal>0||kcalGoal>0 ? (
              <div style={g.card}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={g.sec}>🔥 Calorías</div>
                  <span style={{fontSize:12,fontWeight:700,color:pct>100?"#f87171":"#4ade80"}}>{totalKcal} / {kcalGoal} kcal</span>
                </div>

                {/* Segmented bar */}
                <div style={{background:"rgba(255,255,255,.08)",borderRadius:99,height:16,overflow:"hidden",display:"flex",position:"relative"}}>
                  {mealsWithKcal.length>0 ? mealsWithKcal.map((m,i)=>{
                    const w = Math.min(100, (m.kcal/kcalGoal)*100);
                    const color = SLOT_COLORS[m.slot] || SLOT_COLORS.other;
                    const isActive = activeTip?.id === m.id;
                    return <div key={m.id} onClick={()=>setActiveTip(isActive?null:{id:m.id,meal:m})}
                      style={{height:"100%",width:`${w}%`,background:color,cursor:"pointer",
                        borderRight:i<mealsWithKcal.length-1?"1px solid rgba(0,0,0,.3)":"none",
                        opacity:activeTip&&!isActive?0.6:1,
                        filter:isActive?"brightness(1.3)":"none",
                        transition:"all .2s",minWidth:2}}/>;
                  }) : (
                    <div style={{height:"100%",borderRadius:99,background:"#4ade80",width:`${pct}%`,transition:"width .5s ease"}}/>
                  )}
                </div>

                {/* Tooltip */}
                {activeTip&&(()=>{
                  const m = activeTip.meal;
                  const sl = MEALS.find(x=>x.id===m.slot);
                  const color = SLOT_COLORS[m.slot]||SLOT_COLORS.other;
                  return <div style={{marginTop:8,padding:"8px 12px",borderRadius:10,background:"rgba(255,255,255,.05)",border:`1px solid ${color}44`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color}}>{sl?.icon} {sl?.label}</div>
                      <div style={{fontSize:10,color:"rgba(232,245,232,.5)",marginTop:2}}>{m.desc?.slice(0,40)}{m.desc?.length>40?"...":""}</div>
                    </div>
                    <div style={{fontSize:18,fontWeight:900,color}}>{m.kcal}<span style={{fontSize:10,fontWeight:400,color:"rgba(232,245,232,.4)"}}>kcal</span></div>
                  </div>;
                })()}

                {/* Legend dots */}
                {mealsWithKcal.length>0&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
                  {mealsWithKcal.map(m=>{
                    const sl=MEALS.find(x=>x.id===m.slot);
                    const color=SLOT_COLORS[m.slot]||SLOT_COLORS.other;
                    return <div key={m.id} style={{display:"flex",alignItems:"center",gap:4}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:color}}/>
                      <span style={{fontSize:9,color:"rgba(232,245,232,.4)"}}>{sl?.label} {m.kcal}kcal</span>
                    </div>;
                  })}
                </div>}

                <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                  <span style={{fontSize:10,color:"rgba(232,245,232,.3)"}}>{pct}% del objetivo</span>
                  <span style={{fontSize:10,color:"rgba(232,245,232,.3)"}}>{Math.max(0,kcalGoal-totalKcal)} restantes</span>
                </div>

                {/* Macro bars */}
                {(()=>{
                  const totalProt = today.meals.reduce((s,m)=>s+(m.prot||0),0);
                  const totalCarb = today.meals.reduce((s,m)=>s+(m.carb||0),0);
                  const totalFat  = today.meals.reduce((s,m)=>s+(m.fat||0),0);
                  if (!totalProt && !totalCarb && !totalFat) return null;
                  return <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8}}>
                    {[
                      {label:"Proteína",val:totalProt,goal:macroGoals.prot,color:"#4ade80"},
                      {label:"Carbos",  val:totalCarb,goal:macroGoals.carb,color:"#38bdf8"},
                      {label:"Grasas",  val:totalFat, goal:macroGoals.fat, color:"#fb923c"},
                    ].map(({label,val,goal,color})=>{
                      const p=Math.min(100,Math.round((val/goal)*100));
                      return <div key={label}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:10,color:"rgba(232,245,232,.5)"}}>{label}</span>
                          <span style={{fontSize:10,fontWeight:700,color}}>{Math.round(val)}<span style={{color:"rgba(232,245,232,.3)",fontWeight:400}}>/{goal}g</span></span>
                        </div>
                        <div style={{background:"rgba(255,255,255,.06)",borderRadius:99,height:6}}>
                          <div style={{height:"100%",borderRadius:99,background:color,width:`${p}%`,transition:"width .5s ease"}}/>
                        </div>
                      </div>;
                    })}
                  </div>;
                })()}
              </div>
            ) : null;
          })()}

          {supplements.length>0&&(
            <div style={g.card}>
              <div style={g.sec}>💊 Suplementos</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {supplements.map(s=>{
                  const doses = s.doses || 1;
                  const takenCount = Array.from({length:doses},(_,i)=>`${s.id}_${i}`).filter(k=>(today.suppsTaken||[]).includes(k)).length;
                  const allTaken = takenCount === doses;
                  const pct = doses > 0 ? takenCount/doses : 0;
                  return(
                    <div key={s.id}
                      onClick={()=>{
                        // Find next unfilled dose index (left to right)
                        const nextIndex = Array.from({length:doses},(_,i)=>i).find(i=>!(today.suppsTaken||[]).includes(`${s.id}_${i}`));
                        if(nextIndex!==undefined) toggleSupp(s.id, nextIndex);
                        else {
                          // All filled — reset all
                          const updated=(today.suppsTaken||[]).filter(k=>!k.startsWith(`${s.id}_`));
                          setT({suppsTaken:updated});
                        }
                      }}
                      style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"10px 14px",borderRadius:14,cursor:"pointer",
                        background:allTaken?"rgba(74,222,128,.12)":takenCount>0?"rgba(74,222,128,.06)":"rgba(255,255,255,.04)",
                        border:allTaken?"1px solid rgba(74,222,128,.4)":takenCount>0?"1px solid rgba(74,222,128,.2)":"1px solid rgba(255,255,255,.1)",
                        transition:"all .2s",userSelect:"none"}}>
                      <div style={{fontSize:24,filter:takenCount>0?"none":"grayscale(1)",opacity:takenCount>0?1:.4}}>{s.icon}</div>
                      <div style={{fontSize:10,fontWeight:600,color:allTaken?"#4ade80":takenCount>0?"rgba(74,222,128,.7)":"rgba(232,245,232,.4)"}}>{s.label}</div>
                      <div style={{display:"flex",gap:4}}>
                        {Array.from({length:doses},(_,i)=>{
                          const filled = i < takenCount;
                          return <div key={i} style={{width:16,height:16,borderRadius:"50%",
                            background:filled?"#4ade80":"rgba(255,255,255,.1)",
                            border:"2px solid rgba(74,222,128,.3)",transition:"all .2s",pointerEvents:"none"}}/>;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={g.card}><div style={g.sec}>📈 Evolución peso</div><Chart/></div>

          <div style={g.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={g.sec}>🧠 Análisis del coach</div>
              {analyses.length>0&&<span style={{fontSize:10,color:"rgba(74,222,128,.6)"}}>{analyses.length} análisis hoy</span>}
            </div>
            {analyses.length>0&&(
              <div style={{background:"rgba(74,222,128,.06)",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:12,color:"#d1fae5",lineHeight:1.6}}>
                <div style={{fontSize:10,color:"rgba(74,222,128,.5)",marginBottom:4}}>
                  {analyses[analyses.length-1].type==="summary"?"📋 Resumen final":"⚡ Análisis rápido"} · {analyses[analyses.length-1].time}
                </div>
                {analyses[analyses.length-1].text.slice(0,150)}...
                <button style={{display:"block",marginTop:8,background:"none",border:"none",color:"#4ade80",fontSize:11,cursor:"pointer",padding:0}} onClick={()=>{setAiText(analyses[analyses.length-1].text);setScreen("result");}}>Ver completo →</button>
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <button style={{...g.btnS,flex:1,marginBottom:0,fontSize:12,padding:"12px 8px"}} onClick={analyzeNow}>⚡ Análisis ahora</button>
              <button style={{...g.btnP,flex:1,marginBottom:0,fontSize:12,padding:"12px 8px"}} onClick={analyzeDay}>📋 Resumen del día</button>
            </div>
          </div>

          <div style={g.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={g.sec}>🔔 Notificaciones</div>
                <div onClick={()=>goTo("settings")} style={{fontSize:12,color:"rgba(232,245,232,.4)",cursor:"pointer",textDecoration:"underline"}}>Configura en Ajustes</div>
              </div>
              {typeof Notification!=="undefined"&&Notification.permission!=="granted"&&(
                <button onClick={requestNotifications} style={{background:"rgba(74,222,128,.1)",border:"1px solid rgba(74,222,128,.3)",borderRadius:9,color:"#4ade80",fontSize:11,fontWeight:700,padding:"5px 10px",cursor:"pointer"}}>
                  Activar
                </button>
              )}
            </div>
          </div>
        </>}

        {screen==="addMeal"&&<>
          <button style={g.back} onClick={()=>setScreen("home")}>← Volver</button>
          <div style={{marginTop:6}}>
            <div style={{fontSize:18,fontWeight:900,marginBottom:20}}>🍽️ Añadir comida</div>
            <label style={g.lbl}>Momento del día</label>
            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:18}}>
              {MEALS.map(m=><button key={m.id} style={g.chip(mealSlot===m.id)} onClick={()=>setMealSlot(m.id)}>{m.icon} {m.label}</button>)}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handlePhotoChange}/>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <button onClick={()=>fileRef.current?.click()} style={{flex:1,padding:"12px",borderRadius:14,border:"2px dashed rgba(74,222,128,.2)",background:mealPhoto?"rgba(74,222,128,.08)":"rgba(255,255,255,.03)",color:mealPhoto?"#4ade80":"rgba(232,245,232,.3)",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {analyzingPhoto ? <><span style={{fontSize:16}}>⚡</span> Analizando...</> : mealPhoto ? <><span>📷</span> Foto añadida ✓</> : <><span>📷</span> Añadir foto (estima macros)</>}
              </button>
              {mealPhoto&&<button onClick={()=>{setMealPhoto(null);setPhotoB64(null);}} style={{padding:"12px 14px",borderRadius:14,border:"1px solid rgba(248,113,113,.2)",background:"rgba(248,113,113,.05)",color:"#f87171",fontSize:13,cursor:"pointer"}}>×</button>}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <label style={{...g.lbl,marginBottom:0}}>¿Qué comiste?</label>
              <div style={{position:"relative",width:48,height:48,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {isRecording&&<>
                  <div style={{position:"absolute",width:48,height:48,borderRadius:"50%",background:"rgba(248,113,113,.2)",animation:"ping 1s cubic-bezier(0,0,.2,1) infinite"}}/>
                  <div style={{position:"absolute",width:56,height:56,borderRadius:"50%",background:"rgba(248,113,113,.1)",animation:"ping 1.5s cubic-bezier(0,0,.2,1) infinite"}}/>
                </>}
                <button onClick={toggleRecording}
                  style={{
                    width:44,height:44,borderRadius:"50%",border:"none",cursor:"pointer",
                    background:isRecording?"#f87171":transcribing?"rgba(251,146,60,.3)":"rgba(74,222,128,.12)",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,
                    position:"relative",zIndex:1,
                    transform:isRecording?"scale(1.1)":"scale(1)",
                    transition:"all .2s",
                    boxShadow:isRecording?"0 0 0 3px rgba(248,113,113,.4)":"none"
                  }}>
                  {transcribing?"⚡":isRecording?"⏹️":"🎙️"}
                </button>
              </div>
            </div>
            {isRecording&&<div style={{fontSize:11,color:"#f87171",marginBottom:8,textAlign:"center"}}>● Grabando... para cuando termines</div>}
            {transcribing&&<div style={{fontSize:11,color:"rgba(251,146,60,.8)",marginBottom:8,textAlign:"center"}}>⚡ Analizando audio...</div>}
            <textarea style={{...g.inp,minHeight:80,resize:"none"}} placeholder="ej: 150g pechuga, ensalada, arroz... o usa el 🎙️" value={mealDesc} onChange={e=>setMealDesc(e.target.value)}/>
            <label style={g.lbl}>Macros estimados (opcional)</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              <div>
                <div style={{fontSize:9,color:"rgba(74,222,128,.55)",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:4}}>Proteína</div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <input style={{...g.inp,marginBottom:0,flex:1,padding:"10px 8px",fontSize:13}} type="number" inputMode="decimal" placeholder="0"
                    value={mealProt} onChange={e=>setMealProt(e.target.value)}/>
                  <span style={{color:"rgba(232,245,232,.35)",fontSize:11}}>g</span>
                </div>
              </div>
              <div>
                <div style={{fontSize:9,color:"rgba(74,222,128,.55)",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:4}}>Carbos</div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <input style={{...g.inp,marginBottom:0,flex:1,padding:"10px 8px",fontSize:13}} type="number" inputMode="decimal" placeholder="0"
                    value={mealCarb} onChange={e=>setMealCarb(e.target.value)}/>
                  <span style={{color:"rgba(232,245,232,.35)",fontSize:11}}>g</span>
                </div>
              </div>
              <div>
                <div style={{fontSize:9,color:"rgba(74,222,128,.55)",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:4}}>Grasas</div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <input style={{...g.inp,marginBottom:0,flex:1,padding:"10px 8px",fontSize:13}} type="number" inputMode="decimal" placeholder="0"
                    value={mealFat} onChange={e=>setMealFat(e.target.value)}/>
                  <span style={{color:"rgba(232,245,232,.35)",fontSize:11}}>g</span>
                </div>
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:9,color:"rgba(74,222,128,.55)",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:4}}>Calorías totales</div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <input style={{...g.inp,marginBottom:0,flex:1,padding:"10px 8px",fontSize:13}} type="number" inputMode="numeric" placeholder="ej: 450 (se estima si hay macros)"
                  value={mealKcal} onChange={e=>setMealKcal(e.target.value)}/>
                <span style={{color:"rgba(232,245,232,.35)",fontSize:11}}>kcal</span>
              </div>
            </div>
            <button style={g.btnP} onClick={addMeal}>Guardar comida ✓</button>
          </div>
        </>}

        {screen==="addDrink"&&<>
          <button style={g.back} onClick={()=>setScreen("home")}>← Volver</button>
          <div style={{marginTop:6}}>
            <div style={{fontSize:18,fontWeight:900,marginBottom:20}}>💧 Añadir bebida</div>
            <label style={g.lbl}>Tipo</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:18}}>
              {DRINKS.map(d=>(
                <button key={d.id} onClick={()=>setDrinkId(d.id)} style={{padding:11,borderRadius:12,border:drinkId===d.id?`1px solid ${d.color}`:"1px solid rgba(255,255,255,.08)",background:drinkId===d.id?`${d.color}18`:"rgba(255,255,255,.03)",color:drinkId===d.id?d.color:"rgba(232,245,232,.45)",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:7}}>
                  <span>{d.icon}</span>{d.label}
                </button>))}
            </div>
            <label style={g.lbl}>Cantidad</label>
            <div style={{display:"flex",gap:8,marginBottom:18}}>
              <input style={{...g.inp,marginBottom:0,flex:1}} type="number" inputMode="decimal" placeholder="ej: 500" value={drinkAmt} onChange={e=>setDrinkAmt(e.target.value)}/>
              <select style={{...g.inp,marginBottom:0,width:95}} value={drinkUnit} onChange={e=>setDrinkUnit(e.target.value)}>
                {["ml","L","cl","copa","vaso","lata","botella"].map(u=><option key={u}>{u}</option>)}
              </select>
            </div>
            <button style={g.btnP} onClick={addDrink}>Guardar bebida ✓</button>
          </div>
        </>}

        {screen==="addExercise"&&<>
          <button style={g.back} onClick={()=>setScreen("home")}>← Volver</button>
          <div style={{marginTop:6}}>
            <div style={{fontSize:18,fontWeight:900,marginBottom:20}}>💪 {editingExerciseId?"Editar":"Añadir"} ejercicio</div>
            <label style={g.lbl}>Ejercicio</label>
            <input style={g.inp} placeholder="ej: Press banca" value={exName} onChange={e=>setExName(e.target.value)}/>
            {exerciseSuggestions.length>0&&(
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:-6,marginBottom:16}}>
                {exerciseSuggestions.map(n=>(
                  <button key={n} onClick={()=>setExName(n)} style={g.chip(false)}>{n}</button>
                ))}
              </div>
            )}
            <label style={g.lbl}>Series</label>
            {exSets.map((s,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                <div style={{width:18,fontSize:11,color:"rgba(232,245,232,.35)",flexShrink:0,textAlign:"center"}}>{i+1}</div>
                <div style={{flex:1,display:"flex",alignItems:"center",gap:4}}>
                  <input style={{...g.inp,marginBottom:0,flex:1}} type="number" inputMode="decimal" placeholder="peso"
                    value={s.weight} onChange={e=>updateExerciseSet(i,"weight",e.target.value)}/>
                  <span style={{color:"rgba(232,245,232,.35)",fontSize:11}}>kg</span>
                </div>
                <div style={{flex:1,display:"flex",alignItems:"center",gap:4}}>
                  <input style={{...g.inp,marginBottom:0,flex:1}} type="number" inputMode="numeric" placeholder="reps"
                    value={s.reps} onChange={e=>updateExerciseSet(i,"reps",e.target.value)}/>
                </div>
                {exSets.length>1&&<button style={g.rm} onClick={()=>removeExerciseSet(i)}>×</button>}
              </div>
            ))}
            <button style={{...g.btnS,marginTop:4}} onClick={addExerciseSet}>+ Añadir serie</button>
            <button style={g.btnP} onClick={saveExercise}>Guardar ejercicio ✓</button>
          </div>
        </>}

        {screen==="addSet"&&(()=>{
          const groupInfo = MUSCLE_GROUPS.find(m=>m.id===setGroupId);
          const catalogList = exerciseCatalog[setGroupId]||[];
          return <>
            <button style={g.back} onClick={()=>setScreen("home")}>← Volver</button>
            <div style={{marginTop:6}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
                {groupInfo&&<div style={{width:26,height:26,borderRadius:"50%",background:`${groupInfo.color}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:groupInfo.abbr.length>2?14:11,fontWeight:800,color:groupInfo.color,flexShrink:0}}>{groupInfo.abbr}</div>}
                <div style={{fontSize:18,fontWeight:900}}>Serie de {groupInfo?.label||""}</div>
              </div>

              <label style={g.lbl}>Ejercicio</label>
              {catalogList.length>0
                ? <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:12}}>
                    {catalogList.map(name=>(
                      <button key={name} style={g.chip(setExerciseName===name)}
                        onClick={()=>{ setSetExerciseName(name); setNewQuickExercise(""); }}>{name}</button>
                    ))}
                  </div>
                : <div style={{fontSize:12,color:"rgba(232,245,232,.35)",marginBottom:12}}>Todavía no hay ejercicios en este grupo — añade uno abajo.</div>
              }
              <input style={g.inp} placeholder="O escribe uno nuevo..." value={newQuickExercise}
                onChange={e=>{ setNewQuickExercise(e.target.value); setSetExerciseName(""); }}/>

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <label style={{...g.lbl,marginBottom:0}}>Peso</label>
                <div style={{display:"flex",borderRadius:10,overflow:"hidden",border:"1px solid rgba(74,222,128,.2)",flexShrink:0}}>
                  {["kg","lb"].map(u=>(
                    <button key={u} onClick={()=>setSetUnit(u)} style={{
                      padding:"4px 14px",border:"none",cursor:"pointer",fontWeight:700,fontSize:11,
                      background:setUnit===u?"rgba(74,222,128,.18)":"transparent",
                      color:setUnit===u?"#4ade80":"rgba(232,245,232,.4)",
                    }}>{u.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:18}}>
                <WheelPicker values={WEIGHT_WHEEL_VALUES} value={setWeight} onChange={setSetWeight} color={groupInfo?.color||"#4ade80"}/>
              </div>

              <label style={g.lbl}>Repeticiones</label>
              <div style={{marginBottom:18}}>
                <WheelPicker values={REPS_WHEEL_VALUES} value={setReps} onChange={setSetReps} color={groupInfo?.color||"#4ade80"}/>
              </div>

              <button style={g.btnP} onClick={saveSet}>Guardar serie ✓</button>
            </div>
          </>;
        })()}

        {screen==="result"&&<>
          <button style={g.back} onClick={()=>{
            if(window.speechSynthesis) window.speechSynthesis.cancel();
            setScreen("home");
          }}>← Inicio</button>
          <div style={{marginTop:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{fontSize:20,fontWeight:900}}>Análisis del día</div>
              {!loading&&aiText&&(()=>{
                const speaking = typeof window!=="undefined" && window.speechSynthesis?.speaking;
                return <button onClick={()=>{
                  if(!window.speechSynthesis) return;
                  if(window.speechSynthesis.speaking){ window.speechSynthesis.cancel(); return; }
                  const utt = new SpeechSynthesisUtterance(aiText.replace(/[🏋️🍽️💧⚡🎯📊💪🌅🍎🥜🌙➕]/g,""));
                  utt.lang="es-ES"; utt.rate=0.95; utt.pitch=1;
                  const voices = window.speechSynthesis.getVoices();
                  const esVoice = voices.find(v=>v.lang==="es-ES") || voices.find(v=>v.lang.startsWith("es"));
                  if(esVoice) utt.voice = esVoice;
                  window.speechSynthesis.speak(utt);
                }} style={{background:"rgba(74,222,128,.1)",border:"1px solid rgba(74,222,128,.3)",borderRadius:20,color:"#4ade80",fontSize:13,padding:"6px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                  ▶ Escuchar
                </button>;
              })()}
            </div>
            <div style={{fontSize:11,color:"rgba(232,245,232,.32)",marginBottom:20}}>{new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})}</div>
            {loading
              ?<div style={{textAlign:"center",padding:40}}><div style={{fontSize:32,marginBottom:12}}>⚡</div><div style={{color:"#4ade80",fontSize:13}}>Analizando tu día...</div></div>
              :<div style={g.fb}>
                {aiText.split("\n").filter(l=>l.trim()).map((line,i)=>(
                  <p key={i} style={{marginBottom:line.startsWith("🏋️")||line.startsWith("🍽️")||line.startsWith("💧")||line.startsWith("⚡")||line.startsWith("🎯")?12:6,
                    fontWeight:line.match(/^[🏋️🍽️💧⚡🎯]/u)?700:400,
                    fontSize:line.match(/^[🏋️🍽️💧⚡🎯]/u)?15:14}}>{line}</p>
                ))}
              </div>}
          </div>
        </>}

        {screen==="chat"&&(
          <div style={g.chatWrap}>
            <div style={{fontSize:16,fontWeight:800,marginBottom:14}}>Coach IA 🤖</div>
            <div style={g.chatScr}>
              {msgs.length===0&&<div style={g.bub(false)}>Hola Gus! 💪 Pregúntame lo que quieras sobre dieta, entrenamiento o tu progreso.</div>}
              {msgs.map((m,i)=>(<div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}><div style={g.bub(m.role==="user")}>{m.content}</div></div>))}
              {chatBusy&&<div style={{...g.bub(false),opacity:0.5}}>Escribiendo...</div>}
              <div ref={chatEnd}/>
            </div>
            <div style={g.chatRow}>
              <input style={g.chatInp} value={chatIn} onChange={e=>setChatIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Escribe algo..."/>
              <button style={g.send} onClick={sendChat}>↑</button>
            </div>
          </div>
        )}

        {screen==="stats"&&<>
          <div style={{fontSize:17,fontWeight:800,marginBottom:20}}>📊 Estadísticas</div>
          {(()=>{
            const imc = today.imc ? parseFloat(today.imc) : null;
            const sortedEntries = [...entries].sort((a,b)=>a.date.localeCompare(b.date));
            const mData = sortedEntries.filter(e=>e.today?.masa_muscular).slice(-30);
            const totalProt = today.meals.reduce((s,m)=>s+(m.prot||0),0);
            const totalCarb = today.meals.reduce((s,m)=>s+(m.carb||0),0);
            const totalFat  = today.meals.reduce((s,m)=>s+(m.fat||0),0);

            return <>
              <div style={g.card}>
                <MetricProgressChart entries={entries} todayStr={todayStr} target={parseFloat(goalWeight)||null} g={g}
                  label="⚖️ Peso" tableLabel="Peso" unit="kg" color="#4ade80" decimals={1} getValue={getWeightValue}/>
              </div>
              <div style={g.card}>
                <MetricProgressChart entries={entries} todayStr={todayStr} target={parseFloat(goalGrasa)||null} g={g}
                  label="🔥 % Grasa corporal" tableLabel="Grasa" unit="%" color="#fb923c" decimals={1} getValue={getGrasaValue}/>
              </div>
              {imc&&<div style={{...g.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={g.sec}>📐 IMC hoy</div><div style={{fontSize:28,fontWeight:900,color:imc<25?"#4ade80":imc<30?"#fbbf24":"#f87171"}}>{imc}</div></div>
                <div style={{fontSize:11,color:"rgba(232,245,232,.4)",textAlign:"right"}}>{imc<18.5?"Bajo peso":imc<25?"Normal":imc<30?"Sobrepeso":"Obesidad"}</div>
              </div>}

              {(totalProt>0||totalCarb>0||totalFat>0)&&<div style={g.card}>
                <div style={g.sec}>🥩 Macros de hoy</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  {[["Proteína",totalProt,"#4ade80"],["Carbos",totalCarb,"#38bdf8"],["Grasas",totalFat,"#fb923c"]].map(([lbl,val,col])=>(
                    <div key={lbl} style={{background:"rgba(255,255,255,.03)",borderRadius:12,padding:"12px 8px",textAlign:"center"}}>
                      <div style={{fontSize:20,fontWeight:900,color:col}}>{Math.round(val)}</div>
                      <div style={{fontSize:9,color:"rgba(232,245,232,.35)",marginTop:3,letterSpacing:".1em",textTransform:"uppercase"}}>{lbl} g</div>
                    </div>
                  ))}
                </div>
              </div>}

              <div style={g.card}>
                <div style={g.sec}>📅 Resumen últimos 7 días</div>
                {[...entries].slice(-7).reverse().map((e,i)=>{
                  const prot = (e.today?.meals||[]).reduce((s,m)=>s+(m.prot||0),0);
                  return <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600}}>{new Date(e.date+"T12:00:00").toLocaleDateString("es-ES",{weekday:"short",day:"numeric"})}</div>
                      {prot>0&&<div style={{fontSize:10,color:"rgba(74,222,128,.5)"}}>P: {Math.round(prot)}g</div>}
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:16,fontWeight:800,color:"#4ade80"}}>{e.today?.weight?`${e.today.weight}kg`:"—"}</div>
                      {e.today?.grasa&&<div style={{fontSize:10,color:"rgba(251,146,60,.7)"}}>{e.today.grasa}% grasa</div>}
                    </div>
                  </div>;
                })}
              </div>
            </>;
          })()}
        </>}

        {screen==="achievements"&&<>
          <div style={{fontSize:17,fontWeight:800,marginBottom:20}}>🏆 Logros</div>
          {(()=>{
            const streak = calcStreak(entries);
            const totalDays = entries.filter(e=>e.today?.weight||e.today?.meals?.length||e.today?.training||e.today?.muscleGroups?.length||e.today?.exercises?.length).length;

            return <>
              <div style={g.card}>
                <div style={g.sec}>🔥 Racha actual</div>
                <div style={{fontSize:48,fontWeight:900,color:"#4ade80",textAlign:"center",padding:"10px 0"}}>{streak}</div>
                <div style={{fontSize:13,color:"rgba(232,245,232,.4)",textAlign:"center",marginBottom:10}}>días consecutivos</div>
                <div style={{fontSize:11,color:"rgba(232,245,232,.3)",textAlign:"center"}}>Total de días registrados: {totalDays}</div>
              </div>

              <div style={g.card}>
                <div style={g.sec}>🎖️ Medallas</div>
                <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:4}}>
                  {BADGES.map(b=>{
                    const earned = streak >= b.days;
                    return (
                      <div key={b.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",borderRadius:14,
                        background:earned?"rgba(74,222,128,.08)":"rgba(255,255,255,.02)",
                        border:earned?"1px solid rgba(74,222,128,.25)":"1px solid rgba(255,255,255,.06)",
                        opacity:earned?1:0.5}}>
                        <div style={{fontSize:32,filter:earned?"none":"grayscale(1)"}}>{b.icon}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:14,fontWeight:700,color:earned?"#4ade80":"rgba(232,245,232,.5)"}}>{b.label}</div>
                          <div style={{fontSize:11,color:"rgba(232,245,232,.35)",marginTop:2}}>{b.desc}</div>
                        </div>
                        {earned
                          ? <div style={{fontSize:11,color:"#4ade80",fontWeight:700}}>✓ Conseguida</div>
                          : <div style={{fontSize:11,color:"rgba(232,245,232,.25)"}}>{b.days - streak} días</div>
                        }
                      </div>
                    );
                  })}
                </div>
              </div>
            </>;
          })()}
        </>}

        {screen==="settings"&&<>
          <div style={{fontSize:17,fontWeight:800,marginBottom:20}}>⚙️ Ajustes</div>

          <div style={g.card}>
            <div style={g.sec}>🔥 Objetivo de calorías diarias</div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <input style={{...g.inp,marginBottom:0,flex:1}} type="number" inputMode="numeric"
                value={kcalGoal} onChange={e=>setKcalGoal(parseInt(e.target.value)||0)}/>
              <span style={{color:"rgba(232,245,232,.4)",fontSize:13}}>kcal</span>
            </div>
            <button style={{...g.btnP,marginTop:12,marginBottom:0}} onClick={()=>saveSettings(kcalGoal,null)}>Guardar objetivo ✓</button>
          </div>

          <div style={g.card}>
            <div style={g.sec}>🎯 Objetivos corporales</div>
            <div style={{fontSize:12,color:"rgba(232,245,232,.45)",marginBottom:12,lineHeight:1.5}}>
              Se usan en Estadísticas para estimar cuándo llegarías a cada uno, con un margen realista en vez de una fecha exacta.
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:12,color:"rgba(232,245,232,.55)",width:56,flexShrink:0}}>Peso</span>
              <input style={{...g.inp,marginBottom:0,flex:1}} type="number" inputMode="decimal" placeholder="76"
                value={goalWeight} onChange={e=>setGoalWeight(e.target.value)}/>
              <span style={{color:"rgba(232,245,232,.4)",fontSize:13}}>kg</span>
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:12,color:"rgba(232,245,232,.55)",width:56,flexShrink:0}}>Grasa</span>
              <input style={{...g.inp,marginBottom:0,flex:1}} type="number" inputMode="decimal" placeholder="18"
                value={goalGrasa} onChange={e=>setGoalGrasa(e.target.value)}/>
              <span style={{color:"rgba(232,245,232,.4)",fontSize:13}}>%</span>
            </div>
            <button style={{...g.btnP,marginTop:12,marginBottom:0}} onClick={()=>{saveGoalWeight(goalWeight);saveGoalGrasa(goalGrasa);}}>Guardar objetivos ✓</button>
          </div>

          <div style={g.card}>
            <div style={g.sec}>💊 Mis suplementos</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
              {supplements.map((s,i)=>(
                <div key={s.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:"rgba(255,255,255,.03)",borderRadius:12,border:"1px solid rgba(255,255,255,.07)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:22}}>{s.icon}</span>
                    <span style={{fontSize:14,fontWeight:600}}>{s.label}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:10,color:"rgba(232,245,232,.4)"}}>Tomas:</span>
                      {[1,2,3,4].map(n=>(
                        <button key={n} onClick={()=>saveSettings(null,supplements.map((x,j)=>j===i?{...x,doses:n}:x))}
                          style={{width:24,height:24,borderRadius:"50%",border:s.doses===n?"1px solid #4ade80":"1px solid rgba(255,255,255,.15)",background:s.doses===n?"rgba(74,222,128,.15)":"rgba(255,255,255,.04)",color:s.doses===n?"#4ade80":"rgba(232,245,232,.4)",fontSize:11,cursor:"pointer",fontWeight:s.doses===n?700:400}}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <button onClick={()=>saveSettings(null,supplements.filter((_,j)=>j!==i))}
                      style={{background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.2)",borderRadius:8,color:"#f87171",fontSize:12,padding:"4px 10px",cursor:"pointer"}}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={g.sec}>Añadir suplemento</div>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <input style={{...g.inp,marginBottom:0,width:60,textAlign:"center",fontSize:20,padding:"10px 6px"}}
                placeholder="💊" value={newSupIcon} onChange={e=>setNewSupIcon(e.target.value)}/>
              <input style={{...g.inp,marginBottom:0,flex:1}} placeholder="Nombre (ej: Vitamina D)"
                value={newSupName} onChange={e=>setNewSupName(e.target.value)}/>
            </div>
            <button style={{...g.btnS,marginBottom:0}} onClick={()=>{
              if(!newSupName.trim()) return;
              const newS = [...supplements,{id:Date.now().toString(),label:newSupName.trim(),icon:newSupIcon||"💊",doses:1}];
              saveSettings(null,newS);
              setNewSupName(""); setNewSupIcon("💊");
            }}>+ Añadir suplemento</button>
          </div>

          <div style={g.card}>
            <div style={g.sec}>🏋️ Ejercicios</div>
            <div style={{fontSize:12,color:"rgba(232,245,232,.45)",marginBottom:14,lineHeight:1.5}}>
              Ejercicios disponibles por grupo muscular y tu unidad de peso preferida.
            </div>
            <div style={{fontSize:10,fontWeight:700,color:"rgba(74,222,128,.6)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>Unidad de peso</div>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {["kg","lb"].map(u=>(
                <button key={u} style={g.chip(weightUnit===u)} onClick={()=>saveWeightUnit(u)}>{u.toUpperCase()}</button>
              ))}
            </div>
            <button style={{...g.btnS,marginBottom:0}} onClick={()=>setScreen("exerciseCatalog")}>Gestionar catálogo de ejercicios →</button>
          </div>

          <div style={g.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={g.sec}>🔔 Notificaciones</div>
              {typeof Notification!=="undefined" && Notification.permission!=="granted" && (
                <button onClick={requestNotifications}
                  style={{background:"rgba(74,222,128,.1)",border:"1px solid rgba(74,222,128,.3)",borderRadius:9,color:"#4ade80",fontSize:11,fontWeight:700,padding:"5px 10px",cursor:"pointer"}}>
                  Dar permiso
                </button>
              )}
            </div>

            {[
              {key:"weight",      icon:"⚖️", label:"Peso diario",   multi:false},
              {key:"meals",       icon:"🍽️", label:"Comidas",       multi:true},
              {key:"supplements", icon:"💊", label:"Suplementos",   multi:false},
              {key:"motivational",icon:"⚡", label:"Motivación",    multi:false},
            ].map(({key,icon,label,multi})=>{
              const cfg = notifConfig[key] || {};
              return (
                <div key={key} style={{padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{fontSize:13,fontWeight:600}}>{icon} {label}</span>
                    <button onClick={()=>saveNotifConfig({...notifConfig,[key]:{...cfg,enabled:!cfg.enabled}})}
                      style={{width:44,height:24,borderRadius:99,border:"none",cursor:"pointer",padding:2,
                        background: cfg.enabled ? "linear-gradient(135deg,#4ade80,#22c55e)" : "rgba(255,255,255,.12)",
                        display:"flex",justifyContent: cfg.enabled ? "flex-end" : "flex-start",transition:"all .2s"}}>
                      <span style={{width:20,height:20,borderRadius:"50%",background:"#fff",display:"block"}}/>
                    </button>
                  </div>

                  {cfg.enabled && !multi && (
                    <input type="time" value={cfg.time||"09:00"}
                      onChange={e=>saveNotifConfig({...notifConfig,[key]:{...cfg,time:e.target.value}})}
                      style={{...g.inp,marginTop:10,marginBottom:0,width:"auto",padding:"8px 10px",fontSize:13,colorScheme:"dark"}}/>
                  )}

                  {cfg.enabled && multi && (
                    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10,alignItems:"center"}}>
                      {(cfg.times||[]).map((t,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
                          <input type="time" value={t}
                            onChange={e=>{
                              const times=[...cfg.times]; times[i]=e.target.value;
                              saveNotifConfig({...notifConfig,[key]:{...cfg,times}});
                            }}
                            style={{...g.inp,marginBottom:0,width:"auto",padding:"8px 10px",fontSize:13,colorScheme:"dark"}}/>
                          <button onClick={()=>saveNotifConfig({...notifConfig,[key]:{...cfg,times:cfg.times.filter((_,j)=>j!==i)}})}
                            style={{background:"none",border:"none",color:"#f87171",fontSize:15,cursor:"pointer",padding:"0 2px"}}>×</button>
                        </div>
                      ))}
                      <button onClick={()=>saveNotifConfig({...notifConfig,[key]:{...cfg,times:[...(cfg.times||[]),"12:00"]}})}
                        style={{background:"rgba(74,222,128,.1)",border:"1px solid rgba(74,222,128,.25)",borderRadius:9,color:"#4ade80",fontSize:12,padding:"7px 10px",cursor:"pointer"}}>+ Hora</button>
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{fontSize:11,color:"rgba(232,245,232,.3)",marginTop:12}}>
              Los avisos se programan en el service worker. Si cierras la app del todo, iOS puede retrasarlos.
            </div>
          </div>

          <div style={g.card}>
            <div style={g.sec}>👤 Cuenta</div>
            <div style={{fontSize:13,color:"rgba(232,245,232,.5)",marginBottom:14}}>{user?.email}</div>
            <button style={{...g.btnS,marginBottom:0,borderColor:"rgba(248,113,113,.2)",color:"#f87171"}} onClick={signOut}>Cerrar sesión</button>
          </div>
        </>}

        {screen==="exerciseCatalog"&&<>
          <button style={g.back} onClick={()=>setScreen("settings")}>← Volver</button>
          <div style={{marginTop:6}}>
            <div style={{fontSize:18,fontWeight:900,marginBottom:6}}>🏋️ Catálogo de ejercicios</div>
            <div style={{fontSize:12,color:"rgba(232,245,232,.4)",marginBottom:22,lineHeight:1.5}}>
              Añade o quita ejercicios por grupo muscular. Luego podrás elegir entre ellos al registrar una serie.
            </div>
            {["empuje","tiron","piernas","core"].map(cat=>(
              <div key={cat} style={{marginBottom:20}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(74,222,128,.5)",marginBottom:10}}>{CAT_LABELS[cat]}</div>
                {MUSCLE_GROUPS.filter(m=>m.cat===cat && m.id!=="descanso").map(m=>(
                  <div key={m.id} style={{...g.card,marginBottom:10,padding:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <div style={{width:22,height:22,borderRadius:"50%",background:`${m.color}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:m.abbr.length>2?12:9,fontWeight:800,color:m.color,flexShrink:0}}>{m.abbr}</div>
                      <div style={{fontSize:13,fontWeight:700}}>{m.label}</div>
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                      {(exerciseCatalog[m.id]||[]).length===0
                        ? <div style={{fontSize:11,color:"rgba(232,245,232,.25)"}}>Sin ejercicios todavía</div>
                        : (exerciseCatalog[m.id]||[]).map(name=>(
                          <div key={name} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 6px 5px 10px",borderRadius:16,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)"}}>
                            <span style={{fontSize:12}}>{name}</span>
                            <button style={{...g.rm,fontSize:15}} onClick={()=>removeCatalogExercise(m.id,name)}>×</button>
                          </div>
                        ))}
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <input style={{...g.inp,marginBottom:0,flex:1,padding:"9px 10px",fontSize:12}} placeholder="Nuevo ejercicio..."
                        value={newExerciseInputs[m.id]||""}
                        onChange={e=>setNewExerciseInputs(prev=>({...prev,[m.id]:e.target.value}))}
                        onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); addCatalogExercise(m.id); } }}/>
                      <button style={g.addBtn} onClick={()=>addCatalogExercise(m.id)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>}

        {screen==="history"&&(()=>{
          const entryMap = {};
          entries.forEach(e => { entryMap[e.date] = e; });

          const firstDay = new Date(calYear, calMonth, 1).getDay();
          const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
          const startOffset = (firstDay + 6) % 7;
          const cells = Array(startOffset).fill(null).concat(
            Array.from({length: daysInMonth}, (_,i) => i+1)
          );

          const monthStr = new Date(calYear, calMonth).toLocaleDateString("es-ES",{month:"long",year:"numeric"});
          const pad = n => String(n).padStart(2,"0");
          const selEntry = selDay ? entryMap[`${calYear}-${pad(calMonth+1)}-${pad(selDay)}`] : null;

          return <>
            <div style={{fontSize:17,fontWeight:800,marginBottom:4}}>Historial</div>

            {/* Legend */}
            <div style={{display:"flex",gap:14,marginBottom:18,flexWrap:"wrap"}}>
              {[["#4ade80","Peso"],["#818cf8","Entrenamiento"],["#fb923c","Comidas"]].map(([col,lbl])=>(
                <div key={lbl} style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:col}}/>
                  <span style={{fontSize:10,color:"rgba(232,245,232,.5)"}}>{lbl}</span>
                </div>
              ))}
            </div>

            {/* Month navigation */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <button onClick={()=>{ if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); setSelDay(null); }}
                style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,color:"#e8f5e8",padding:"6px 12px",cursor:"pointer",fontSize:13}}>←</button>
              <span style={{fontSize:13,fontWeight:700,textTransform:"capitalize"}}>{monthStr}</span>
              <button onClick={()=>{ if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); setSelDay(null); }}
                style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,color:"#e8f5e8",padding:"6px 12px",cursor:"pointer",fontSize:13}}>→</button>
            </div>

            {/* Day labels */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4}}>
              {["L","M","X","J","V","S","D"].map(d=>(
                <div key={d} style={{textAlign:"center",fontSize:9,color:"rgba(232,245,232,.3)",fontWeight:700,letterSpacing:".05em"}}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:20}}>
              {cells.map((day,i)=>{
                if(!day) return <div key={i}/>;
                const dateStr = `${calYear}-${pad(calMonth+1)}-${pad(day)}`;
                const entry = entryMap[dateStr];
                const hasWeight = !!(entry?.today?.weight);
                const hasTraining = !!(entry?.today?.training) || !!(entry?.today?.muscleGroups?.length) || !!(entry?.today?.exercises?.length);
                const hasMeals = !!(entry?.today?.meals?.length);
                const isToday = dateStr === todayStr;
                const isSel = selDay === day;
                return (
                  <div key={i} onClick={()=>setSelDay(isSel?null:day)}
                    style={{
                      borderRadius:10, padding:"7px 4px", textAlign:"center", cursor:"pointer",
                      background: isSel ? "rgba(74,222,128,.15)" : isToday ? "rgba(74,222,128,.08)" : "rgba(255,255,255,.025)",
                      border: isSel ? "1px solid rgba(74,222,128,.5)" : isToday ? "1px solid rgba(74,222,128,.2)" : "1px solid rgba(255,255,255,.05)",
                    }}>
                    <div style={{fontSize:11,fontWeight:isToday?800:500,color:isToday?"#4ade80":"rgba(232,245,232,.7)",marginBottom:4}}>{day}</div>
                    <div style={{display:"flex",justifyContent:"center",gap:2}}>
                      <div style={{width:5,height:5,borderRadius:"50%",background:hasWeight?"#4ade80":"rgba(255,255,255,.1)"}}/>
                      <div style={{width:5,height:5,borderRadius:"50%",background:hasTraining?"#818cf8":"rgba(255,255,255,.1)"}}/>
                      <div style={{width:5,height:5,borderRadius:"50%",background:hasMeals?"#fb923c":"rgba(255,255,255,.1)"}}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected day detail */}
            {selDay && (
              <div style={g.cardG}>
                <div style={{fontSize:12,fontWeight:700,color:"#4ade80",marginBottom:10}}>
                  {new Date(`${calYear}-${pad(calMonth+1)}-${pad(selDay)}T12:00:00`).toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})}
                </div>
                {selEntry ? <>
                  <div style={{display:"flex",gap:16,marginBottom:10}}>
                    {selEntry.today?.weight&&<div><div style={{fontSize:9,color:"rgba(74,222,128,.6)",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase"}}>Peso</div><div style={{fontSize:18,fontWeight:800,color:"#4ade80"}}>{selEntry.today.weight}kg</div></div>}
                    {selEntry.today?.grasa&&<div><div style={{fontSize:9,color:"rgba(74,222,128,.6)",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase"}}>Grasa</div><div style={{fontSize:18,fontWeight:800,color:"#fb923c"}}>{selEntry.today.grasa}%</div></div>}
                    {selEntry.today?.imc&&<div><div style={{fontSize:9,color:"rgba(74,222,128,.6)",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase"}}>IMC</div><div style={{fontSize:18,fontWeight:800,color:"rgba(232,245,232,.7)"}}>{selEntry.today.imc}</div></div>}
                  </div>
                  {selEntry.today?.exercises?.length>0&&<div style={{marginBottom:8}}>
                    {selEntry.today.exercises.map((ex,i)=>(
                      <div key={i} style={{fontSize:12,color:"rgba(129,140,248,.9)",marginBottom:2}}>
                        💪 {ex.name}: {ex.sets.map(s=>`${fmtSetVal(s.weight)}${s.unit||"kg"}×${fmtSetVal(s.reps)}`).join(", ")}
                      </div>
                    ))}
                  </div>}
                  {selEntry.today?.training&&<div style={{fontSize:12,color:"rgba(129,140,248,.9)",marginBottom:8}}>📝 {selEntry.today.training}</div>}
                  {selEntry.today?.meals?.length>0&&<div>
                    {selEntry.today.meals.map((m,i)=>{
                      const sl=MEALS.find(x=>x.id===m.slot);
                      return <div key={i} style={{fontSize:11,color:"rgba(232,245,232,.6)",marginBottom:3}}>{sl?.icon} {m.desc?.slice(0,60)}{m.desc?.length>60?"...":""}</div>;
                    })}
                  </div>}
                  {selEntry.feedback&&<div style={{fontSize:11,color:"rgba(232,245,232,.4)",marginTop:8,lineHeight:1.5,borderTop:"1px solid rgba(255,255,255,.07)",paddingTop:8}}>{selEntry.feedback.slice(0,120)}...</div>}
                </> : <div style={{fontSize:12,color:"rgba(232,245,232,.3)"}}>Sin registro para este día</div>}
              </div>
            )}

            {/* List grouped by month */}
            <div style={{fontSize:10,fontWeight:700,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(74,222,128,.4)",marginBottom:12}}>Registros por mes</div>
            {entries.length===0
              ? <div style={{textAlign:"center",padding:20,color:"rgba(232,245,232,.22)",fontSize:13}}>Aún no hay registros.</div>
              : (()=>{
                  const byMonth = {};
                  [...entries].reverse().forEach(e => {
                    const key = e.date.slice(0,7);
                    if (!byMonth[key]) byMonth[key] = [];
                    byMonth[key].push(e);
                  });
                  return Object.entries(byMonth).map(([monthKey, monthEntries]) => {
                    const isOpen = expandedMonths[monthKey];
                    const label = new Date(monthKey+"-15").toLocaleDateString("es-ES",{month:"long",year:"numeric"});
                    const avgWeight = (monthEntries.filter(e=>e.today?.weight).reduce((s,e)=>s+parseFloat(e.today.weight),0)/monthEntries.filter(e=>e.today?.weight).length)||0;
                    return (
                      <div key={monthKey} style={{marginBottom:8}}>
                        <div onClick={()=>setExpandedMonths(prev=>({...prev,[monthKey]:!prev[monthKey]}))}
                          style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",cursor:"pointer"}}>
                          <div>
                            <div style={{fontSize:13,fontWeight:700,textTransform:"capitalize"}}>{label}</div>
                            <div style={{fontSize:10,color:"rgba(232,245,232,.35)",marginTop:2}}>{monthEntries.length} días · {avgWeight>0?`media ${avgWeight.toFixed(1)}kg`:""}</div>
                          </div>
                          <span style={{color:"#4ade80",fontSize:16}}>{isOpen?"▲":"▼"}</span>
                        </div>
                        {isOpen && (
                          <div style={{borderLeft:"2px solid rgba(74,222,128,.15)",marginLeft:8,paddingLeft:12,marginTop:4}}>
                            {monthEntries.map((e,i)=>(
                              <div key={i} style={{padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.04)",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                                <div>
                                  <div style={{fontSize:12,fontWeight:700,marginBottom:2}}>{new Date(e.date+"T12:00:00").toLocaleDateString("es-ES",{weekday:"short",day:"numeric"})}</div>
                                  <div style={{fontSize:10,color:"rgba(232,245,232,.3)",lineHeight:1.5}}>
                                    {e.today?.meals?.length||0} comidas{e.today?.exercises?.length?` · ${e.today.exercises.length} ejerc.`:e.today?.training?` · ${e.today.training.slice(0,20)}`:""}
                                  </div>
                                </div>
                                <div style={{textAlign:"right"}}>
                                  <div style={{fontSize:15,fontWeight:800,color:"#4ade80"}}>{e.today?.weight?`${e.today.weight}kg`:"—"}</div>
                                  {e.today?.grasa&&<div style={{fontSize:10,color:"rgba(251,146,60,.7)"}}>{e.today.grasa}%</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()
            }
          </>;
        })()}
        </div>
      </div>

      {editingMealId&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.6)"}} onClick={()=>setEditingMealId(null)}/>
          <div style={{position:"relative",background:"#0f1a0f",borderRadius:"20px 20px 0 0",padding:"24px 24px 40px",border:"1px solid rgba(74,222,128,.2)"}}>
            <div style={{fontSize:15,fontWeight:800,marginBottom:4}}>✏️ Editar comida</div>
            <div style={{fontSize:12,color:"rgba(232,245,232,.4)",marginBottom:20}}>
              {today.meals.find(m=>m.id===editingMealId)?.desc?.slice(0,50)}
            </div>

            <div style={{fontSize:9,color:"rgba(74,222,128,.55)",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>Momento del día</div>
            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:22}}>
              {MEALS.map(mo=>(
                <button key={mo.id} onClick={()=>setEditingMealSlot(mo.id)}
                  style={{padding:"8px 12px",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:editingMealSlot===mo.id?700:400,
                    border:editingMealSlot===mo.id?"1px solid #4ade80":"1px solid rgba(255,255,255,.08)",
                    background:editingMealSlot===mo.id?"rgba(74,222,128,.15)":"rgba(255,255,255,.03)",
                    color:editingMealSlot===mo.id?"#4ade80":"rgba(232,245,232,.45)"}}>
                  {mo.icon} {mo.label}
                </button>
              ))}
            </div>

            <div style={{fontSize:9,color:"rgba(74,222,128,.55)",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>Hora</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:24}}>
              <button onClick={()=>{
                const [h,m]=editingMealTime.split(":").map(Number);
                const newM=m===0?30:0; const newH=m===0?h:h+1>=24?0:h+1;
                setEditingMealTime(`${String(newH).padStart(2,"0")}:${String(newM).padStart(2,"0")}`);
              }} style={{width:44,height:44,borderRadius:"50%",border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.05)",color:"#e8f5e8",fontSize:20,cursor:"pointer"}}>+</button>
              <div style={{fontSize:48,fontWeight:900,color:"#4ade80",letterSpacing:2,minWidth:120,textAlign:"center"}}>{editingMealTime||"12:00"}</div>
              <button onClick={()=>{
                const [h,m]=editingMealTime.split(":").map(Number);
                const newM=m===30?0:30; const newH=m===30?h:h-1<0?23:h-1;
                setEditingMealTime(`${String(newH).padStart(2,"0")}:${String(newM).padStart(2,"0")}`);
              }} style={{width:44,height:44,borderRadius:"50%",border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.05)",color:"#e8f5e8",fontSize:20,cursor:"pointer"}}>−</button>
            </div>
            <div style={{overflowX:"auto",display:"flex",gap:6,marginBottom:20,paddingBottom:4}}>
              {["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00"].map(t=>(
                <button key={t} onClick={()=>setEditingMealTime(t)}
                  style={{padding:"7px 10px",borderRadius:10,border:editingMealTime===t?"1px solid #4ade80":"1px solid rgba(255,255,255,.08)",
                    background:editingMealTime===t?"rgba(74,222,128,.15)":"rgba(255,255,255,.03)",
                    color:editingMealTime===t?"#4ade80":"rgba(232,245,232,.4)",fontSize:11,cursor:"pointer",flexShrink:0,fontWeight:editingMealTime===t?700:400}}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setEditingMealId(null)}
                style={{flex:1,padding:"14px",borderRadius:14,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"rgba(232,245,232,.5)",fontSize:14,cursor:"pointer"}}>
                Cancelar
              </button>
              <button onClick={()=>updateMeal(editingMealId,editingMealTime,editingMealSlot)}
                style={{flex:2,padding:"14px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#4ade80,#22c55e)",color:"#080b0f",fontSize:14,fontWeight:800,cursor:"pointer"}}>
                Guardar ✓
              </button>
            </div>
          </div>
        </div>
      )}
    {showNav&&(
      <div style={g.nav}>
        {[{id:"home",icon:"🏠",label:"Inicio"},{id:"stats",icon:"📊",label:"Stats"},{id:"achievements",icon:"🏆",label:"Logros"},{id:"history",icon:"📋",label:"Historial"},{id:"chat",icon:"💬",label:"Coach"},{id:"settings",icon:"⚙️",label:"Ajustes"}].map(n=>(
          <button key={n.id} style={g.nb(screen===n.id)} onClick={()=>goTo(n.id)}>
            <span style={{fontSize:20}}>{n.icon}</span>{n.label}
          </button>
        ))}
      </div>
    )}
  </div>
  );
}

export default function AppRoot() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
