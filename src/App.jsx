import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "gus_fitness_v2";

const systemPrompt = `Eres el coach personal de Gus, un hombre de 27 años, 170cm.
Su objetivo es recomposición corporal: bajar grasa manteniendo músculo.
Datos actuales (1 mayo 2026): 73.3kg, 20.6% grasa, 54.4kg músculo. Meta: 67.7kg.
Lleva 2+ meses de progreso consistente: bajó de 77.4kg y 23.8% grasa.

Tu rol al analizar el día completo:
- Evalúa el total de comidas: balance proteína/carbos/grasas estimado
- Comenta las bebidas: alcohol y refrescos afectan el progreso, sé honesto
- Evalúa el entrenamiento si lo hubo
- Da feedback concreto de máx 4-5 oraciones
- Sugiere un ajuste específico para mañana
- Habla en español, tutéalo, sé cercano pero directo
- NO seas genérico. Usa los datos reales del día.`;

const DRINK_TYPES = [
  { id: "water", label: "Agua", icon: "💧", color: "#38bdf8" },
  { id: "coffee", label: "Café", icon: "☕", color: "#92400e" },
  { id: "tea", label: "Té", icon: "🍵", color: "#86efac" },
  { id: "juice", label: "Zumo", icon: "🍊", color: "#fb923c" },
  { id: "soda", label: "Refresco", icon: "🥤", color: "#a78bfa" },
  { id: "beer", label: "Cerveza", icon: "🍺", color: "#fbbf24" },
  { id: "wine", label: "Vino", icon: "🍷", color: "#be123c" },
  { id: "spirits", label: "Licor", icon: "🥃", color: "#d97706" },
  { id: "milk", label: "Leche", icon: "🥛", color: "#e2e8f0" },
  { id: "shake", label: "Batido", icon: "🧃", color: "#4ade80" },
];

const MEAL_TIMES = [
  { id: "breakfast", label: "Desayuno", icon: "🌅" },
  { id: "midmorning", label: "Media mañana", icon: "🍎" },
  { id: "lunch", label: "Comida", icon: "🍽️" },
  { id: "snack", label: "Merienda", icon: "🥜" },
  { id: "dinner", label: "Cena", icon: "🌙" },
  { id: "other", label: "Otro", icon: "➕" },
];

function getTimeSlot() {
  const h = new Date().getHours();
  if (h >= 6 && h < 10) return "breakfast";
  if (h >= 10 && h < 12) return "midmorning";
  if (h >= 12 && h < 15) return "lunch";
  if (h >= 15 && h < 18) return "snack";
  if (h >= 18 && h < 22) return "dinner";
  return "other";
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [entries, setEntries] = useState([]);
  const [todayData, setTodayData] = useState({ meals: [], drinks: [], weight: "", training: "", feeling: "" });
  const [aiResponse, setAiResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [mealTime, setMealTime] = useState(getTimeSlot());
  const [mealDesc, setMealDesc] = useState("");
  const [mealPhoto, setMealPhoto] = useState(null);
  const [mealPhotoData, setMealPhotoData] = useState(null);
  const [drinkType, setDrinkType] = useState("water");
  const [drinkAmount, setDrinkAmount] = useState("");
  const [drinkUnit, setDrinkUnit] = useState("ml");
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setEntries(parsed.entries || []);
        if (parsed.todayData?.date === todayStr) setTodayData(parsed.todayData);
      }
    } catch {}
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const persist = (newEntries, newTodayData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        entries: newEntries ?? entries,
        todayData: { ...(newTodayData ?? todayData), date: todayStr }
      }));
    } catch {}
  };

  const updateToday = (updates) => {
    const updated = { ...todayData, ...updates };
    setTodayData(updated);
    persist(null, updated);
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMealPhoto(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = () => setMealPhotoData(reader.result.split(",")[1]);
    reader.readAsDataURL(file);
  };

  const addMeal = () => {
    if (!mealDesc.trim() && !mealPhoto) return;
    const meal = { id: Date.now(), time: mealTime, desc: mealDesc.trim(), photo: mealPhoto, photoData: mealPhotoData, timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) };
    updateToday({ meals: [...todayData.meals, meal] });
    setMealDesc(""); setMealPhoto(null); setMealPhotoData(null);
    setScreen("home");
  };

  const addDrink = () => {
    if (!drinkAmount.trim()) return;
    const drink = { id: Date.now(), type: drinkType, amount: drinkAmount, unit: drinkUnit, timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) };
    updateToday({ drinks: [...todayData.drinks, drink] });
    setDrinkAmount(""); setScreen("home");
  };

  const submitDayReview = async () => {
    setLoading(true); setScreen("result");
    const mealsSummary = todayData.meals.length > 0
      ? todayData.meals.map(m => { const sl = MEAL_TIMES.find(t => t.id === m.time); return `  - ${sl?.label} (${m.timestamp}): ${m.desc || "foto sin descripción"}`; }).join("\n")
      : "  Sin comidas registradas";
    const drinksSummary = todayData.drinks.length > 0
      ? todayData.drinks.map(d => { const dt = DRINK_TYPES.find(t => t.id === d.type); return `  - ${dt?.label}: ${d.amount}${d.unit}`; }).join("\n")
      : "  Sin bebidas registradas";
    const summary = `Resumen del día ${new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}:\n\nPESO: ${todayData.weight ? todayData.weight + "kg" : "no registrado"}\n\nCOMIDAS:\n${mealsSummary}\n\nBEBIDAS:\n${drinksSummary}\n\nENTRENAMIENTO: ${todayData.training || "no registrado"}\nESTADO: ${todayData.feeling || "no registrado"}\n\nAnaliza este día completo y dame feedback concreto.`;
    const hasPhotos = todayData.meals.some(m => m.photoData);
    const messageContent = hasPhotos
      ? [{ type: "text", text: summary + "\n\nAnaliza también las fotos:" }, ...todayData.meals.filter(m => m.photoData).map(m => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: m.photoData } }))]
      : summary;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages: [{ role: "user", content: messageContent }] }) });
      const data = await res.json();
      const text = data.content?.find(b => b.type === "text")?.text || "No se pudo obtener feedback.";
      setAiResponse(text);
      const newEntry = { date: todayStr, data: { ...todayData }, feedback: text, timestamp: Date.now() };
      const newEntries = [...entries.filter(e => e.date !== todayStr), newEntry].sort((a, b) => a.date.localeCompare(b.date));
      setEntries(newEntries); persist(newEntries, todayData);
    } catch { setAiResponse("Error al conectar. Tus datos se guardaron."); }
    setLoading(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim(); setChatInput("");
    const newMessages = [...chatMessages, { role: "user", content: userMsg }];
    setChatMessages(newMessages); setChatLoading(true);
    const context = entries.slice(-5).map(e => `${e.date}: ${e.data?.weight ? e.data.weight + "kg" : ""} | ${e.data?.meals?.length || 0} comidas | ${e.data?.training || ""}`).join("\n");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt + (context ? `\n\nRegistros recientes:\n${context}` : ""), messages: newMessages }) });
      const data = await res.json();
      const text = data.content?.find(b => b.type === "text")?.text || "Sin respuesta.";
      setChatMessages([...newMessages, { role: "assistant", content: text }]);
    } catch { setChatMessages([...newMessages, { role: "assistant", content: "Error de conexión." }]); }
    setChatLoading(false);
  };

  const todayEntry = entries.find(e => e.date === todayStr);
  const lastWeights = entries.filter(e => e.data?.weight).slice(-14);
  const weights = lastWeights.map(e => parseFloat(e.data.weight)).filter(Boolean);
  const minW = weights.length ? Math.min(...weights) - 0.5 : 68;
  const maxW = weights.length ? Math.max(...weights) + 0.5 : 78;
  const prevWeight = entries.filter(e => e.data?.weight && e.date !== todayStr).slice(-1)[0]?.data?.weight;
  const weightDiff = todayData.weight && prevWeight ? (parseFloat(todayData.weight) - parseFloat(prevWeight)).toFixed(1) : null;
  const totalWaterMl = todayData.drinks.filter(d => d.type === "water" && d.unit === "ml").reduce((s, d) => s + parseFloat(d.amount || 0), 0);
  const hasAlcohol = todayData.drinks.some(d => ["beer", "wine", "spirits"].includes(d.type));

  const s = {
    app: { minHeight: "100dvh", background: "linear-gradient(160deg,#080b0f 0%,#0a0f0a 60%,#080b0f 100%)", fontFamily: "'DM Sans',sans-serif", color: "#e8f5e8", position: "relative", overflow: "hidden" },
    glow1: { position: "fixed", top: "-15%", right: "-15%", width: "55vw", height: "55vw", borderRadius: "50%", background: "radial-gradient(circle,rgba(74,222,128,0.07) 0%,transparent 65%)", pointerEvents: "none", zIndex: 0 },
    glow2: { position: "fixed", bottom: "-20%", left: "-10%", width: "45vw", height: "45vw", borderRadius: "50%", background: "radial-gradient(circle,rgba(34,197,94,0.05) 0%,transparent 65%)", pointerEvents: "none", zIndex: 0 },
    wrap: { maxWidth: 480, margin: "0 auto", padding: "0 20px 100px", position: "relative", zIndex: 1 },
    header: { padding: "32px 0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    logo: { fontSize: 13, fontWeight: 800, letterSpacing: "0.3em", textTransform: "uppercase", color: "#4ade80" },
    dateLabel: { fontSize: 11, color: "rgba(232,245,232,0.3)", letterSpacing: "0.1em" },
    card: { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 20, marginBottom: 14 },
    cardGreen: { background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.18)", borderRadius: 20, padding: 20, marginBottom: 14 },
    sec: { fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(74,222,128,0.55)", marginBottom: 14 },
    statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 },
    statBox: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px 10px", textAlign: "center" },
    statVal: { fontSize: 22, fontWeight: 900, color: "#4ade80", lineHeight: 1 },
    statLab: { fontSize: 9, color: "rgba(232,245,232,0.35)", marginTop: 5, letterSpacing: "0.12em", textTransform: "uppercase" },
    btnP: { width: "100%", padding: "17px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#4ade80,#22c55e)", color: "#080b0f", fontSize: 15, fontWeight: 800, cursor: "pointer", marginBottom: 12 },
    btnS: { width: "100%", padding: "15px", borderRadius: 16, border: "1px solid rgba(74,222,128,0.2)", background: "rgba(74,222,128,0.04)", color: "#4ade80", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 12 },
    btnBack: { background: "none", border: "none", color: "rgba(232,245,232,0.35)", fontSize: 13, cursor: "pointer", padding: "6px 0", marginBottom: 8 },
    inp: { width: "100%", padding: "15px 16px", borderRadius: 14, border: "1px solid rgba(74,222,128,0.2)", background: "rgba(255,255,255,0.05)", color: "#e8f5e8", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 14, fontFamily: "'DM Sans',sans-serif" },
    lbl: { fontSize: 11, fontWeight: 700, color: "rgba(74,222,128,0.6)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8, display: "block" },
    chip: (active, color) => ({ padding: "8px 12px", borderRadius: 20, border: active ? `1px solid ${color || "#4ade80"}` : "1px solid rgba(255,255,255,0.1)", background: active ? `rgba(74,222,128,0.12)` : "rgba(255,255,255,0.03)", color: active ? (color || "#4ade80") : "rgba(232,245,232,0.5)", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }),
    feedbackBox: { background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.18)", borderRadius: 16, padding: 20, marginBottom: 20, fontSize: 15, lineHeight: 1.75, color: "#d1fae5" },
    chartWrap: { height: 72, display: "flex", alignItems: "flex-end", gap: 3 },
    bar: (h, today) => ({ flex: 1, borderRadius: "3px 3px 0 0", minWidth: 0, height: `${Math.max(8, h)}%`, background: today ? "linear-gradient(180deg,#4ade80,#22c55e)" : "rgba(74,222,128,0.22)", transition: "height 0.5s ease" }),
    chatWrap: { display: "flex", flexDirection: "column", height: "calc(100dvh - 120px)" },
    chatScroll: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", paddingBottom: 8 },
    bubble: (u) => ({ maxWidth: "86%", padding: "12px 16px", marginBottom: 10, fontSize: 14, lineHeight: 1.65, borderRadius: u ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: u ? "linear-gradient(135deg,#4ade80,#22c55e)" : "rgba(255,255,255,0.06)", color: u ? "#080b0f" : "#e8f5e8", border: u ? "none" : "1px solid rgba(255,255,255,0.08)", alignSelf: u ? "flex-end" : "flex-start" }),
    chatRow: { display: "flex", gap: 10, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.07)" },
    chatInp: { flex: 1, padding: "14px 16px", borderRadius: 14, border: "1px solid rgba(74,222,128,0.2)", background: "rgba(255,255,255,0.05)", color: "#e8f5e8", fontSize: 14, outline: "none", fontFamily: "'DM Sans',sans-serif" },
    sendBtn: { padding: "14px 18px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#4ade80,#22c55e)", color: "#080b0f", fontWeight: 900, fontSize: 18, cursor: "pointer" },
    bottomNav: { position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(8,11,15,0.96)", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-around", padding: "12px 0 20px", zIndex: 100, backdropFilter: "blur(20px)" },
    navItem: (active) => ({ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", color: active ? "#4ade80" : "rgba(232,245,232,0.3)", cursor: "pointer", padding: "4px 16px", fontSize: 10, fontWeight: 600 }),
    addCardBtn: { background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 10, color: "#4ade80", fontSize: 12, fontWeight: 700, padding: "6px 12px", cursor: "pointer" },
    removeBtn: { background: "none", border: "none", color: "rgba(232,245,232,0.2)", fontSize: 20, cursor: "pointer", padding: "0 2px", flexShrink: 0 },
  };

  const renderChart = () => {
    if (weights.length < 2) return <p style={{ color: "rgba(232,245,232,0.25)", fontSize: 12, textAlign: "center", padding: "16px 0" }}>Registra al menos 2 días</p>;
    return <>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "rgba(232,245,232,0.25)" }}>{maxW.toFixed(1)}kg</span>
        <span style={{ fontSize: 10, color: "rgba(232,245,232,0.25)" }}>{minW.toFixed(1)}kg</span>
      </div>
      <div style={s.chartWrap}>
        {lastWeights.map((e, i) => { const w = parseFloat(e.data?.weight); if (!w) return <div key={i} style={{ flex: 1 }} />; const h = 100 - ((w - minW) / (maxW - minW)) * 80; return <div key={i} style={s.bar(h, e.date === todayStr)} />; })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 10, color: "rgba(232,245,232,0.2)" }}>{lastWeights[0]?.date?.slice(5)}</span>
        <span style={{ fontSize: 10, color: "#4ade80" }}>hoy</span>
      </div>
    </>;
  };

  const showNav = ["home", "history", "chat"].includes(screen);

  return (
    <div style={s.app}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <div style={s.glow1} /><div style={s.glow2} />
      <div style={s.wrap}>
        <div style={s.header}>
          <span style={s.logo}>Gus Coach</span>
          <span style={s.dateLabel}>{new Date().toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
        </div>

        {/* HOME */}
        {screen === "home" && <>
          <div style={s.statGrid}>
            <div style={s.statBox}><div style={s.statVal}>{todayData.weight || "—"}</div><div style={s.statLab}>kg hoy</div></div>
            <div style={s.statBox}><div style={{ ...s.statVal, color: weightDiff < 0 ? "#4ade80" : weightDiff > 0 ? "#f87171" : "#4ade80" }}>{weightDiff ? (weightDiff > 0 ? `+${weightDiff}` : weightDiff) : "—"}</div><div style={s.statLab}>vs ayer</div></div>
            <div style={s.statBox}><div style={s.statVal}>{todayData.meals.length}</div><div style={s.statLab}>comidas</div></div>
          </div>

          {/* Weight */}
          {!todayData.weight
            ? <div style={s.cardGreen}>
              <div style={s.sec}>⚖️ Peso de hoy</div>
              <div style={{ display: "flex", gap: 10 }}>
                <input style={{ ...s.inp, marginBottom: 0, flex: 1 }} type="number" placeholder="ej: 73.1" value={todayData.weight} onChange={e => updateToday({ weight: e.target.value })} />
                <span style={{ color: "rgba(232,245,232,0.4)", alignSelf: "center", fontSize: 14 }}>kg</span>
              </div>
            </div>
            : <div style={{ ...s.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={s.sec}>⚖️ Peso registrado</div><div style={{ fontSize: 28, fontWeight: 900, color: "#4ade80" }}>{todayData.weight} <span style={{ fontSize: 14, fontWeight: 600 }}>kg</span></div></div>
              <button style={s.btnBack} onClick={() => updateToday({ weight: "" })}>✏️</button>
            </div>
          }

          {/* Meals */}
          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={s.sec}>🍽️ Comidas de hoy</div>
              <button style={s.addCardBtn} onClick={() => { setMealTime(getTimeSlot()); setMealDesc(""); setMealPhoto(null); setMealPhotoData(null); setScreen("addMeal"); }}>+ Añadir</button>
            </div>
            {todayData.meals.length === 0
              ? <p style={{ color: "rgba(232,245,232,0.25)", fontSize: 13 }}>Sin comidas registradas aún</p>
              : todayData.meals.map(m => { const sl = MEAL_TIMES.find(t => t.id === m.time); return (
                <div key={m.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {m.photo && <img src={m.photo} style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 700, marginBottom: 3 }}>{sl?.icon} {sl?.label} · {m.timestamp}</div>
                    <div style={{ fontSize: 13, color: "rgba(232,245,232,0.7)", lineHeight: 1.4 }}>{m.desc || "Sin descripción"}</div>
                  </div>
                  <button style={s.removeBtn} onClick={() => updateToday({ meals: todayData.meals.filter(x => x.id !== m.id) })}>×</button>
                </div>
              ); })
            }
          </div>

          {/* Drinks */}
          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={s.sec}>
                💧 Bebidas {totalWaterMl > 0 && <span style={{ color: "#38bdf8" }}>· {(totalWaterMl / 1000).toFixed(1)}L</span>}
                {hasAlcohol && <span> 🍺</span>}
              </div>
              <button style={s.addCardBtn} onClick={() => { setDrinkType("water"); setDrinkAmount(""); setDrinkUnit("ml"); setScreen("addDrink"); }}>+ Añadir</button>
            </div>
            {todayData.drinks.length === 0
              ? <p style={{ color: "rgba(232,245,232,0.25)", fontSize: 13 }}>Sin bebidas registradas aún</p>
              : todayData.drinks.map(d => { const dt = DRINK_TYPES.find(t => t.id === d.type); return (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize: 14 }}>{dt?.icon} <span style={{ color: "rgba(232,245,232,0.7)" }}>{dt?.label}</span> <span style={{ color: "rgba(232,245,232,0.3)", fontSize: 12 }}>{d.timestamp}</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: dt?.color || "#4ade80", fontWeight: 700, fontSize: 14 }}>{d.amount}{d.unit}</span>
                    <button style={s.removeBtn} onClick={() => updateToday({ drinks: todayData.drinks.filter(x => x.id !== d.id) })}>×</button>
                  </div>
                </div>
              ); })
            }
          </div>

          {/* Training */}
          <div style={s.card}>
            <div style={s.sec}>💪 Entrenamiento</div>
            <input style={{ ...s.inp, marginBottom: 0 }} placeholder="ej: pecho y tríceps 45min. O: descanso" value={todayData.training} onChange={e => updateToday({ training: e.target.value })} />
          </div>

          {/* Chart */}
          <div style={s.card}><div style={s.sec}>📈 Evolución peso</div>{renderChart()}</div>

          {/* Day review */}
          <div style={s.cardGreen}>
            <div style={{ fontSize: 12, color: "#4ade80", fontWeight: 700, marginBottom: 6 }}>{todayEntry ? "✅ Análisis completado" : "🌙 Análisis del día"}</div>
            <div style={{ fontSize: 13, color: "rgba(232,245,232,0.5)", marginBottom: 16, lineHeight: 1.6 }}>
              {todayEntry ? todayEntry.feedback?.slice(0, 120) + "..." : "Cuando termines el día, el coach analiza todo junto: comidas, bebidas y entrenamiento."}
            </div>
            {todayEntry
              ? <button style={s.btnS} onClick={() => { setAiResponse(todayEntry.feedback); setScreen("result"); }}>Ver feedback completo</button>
              : <button style={s.btnP} onClick={submitDayReview}>Analizar mi día →</button>
            }
          </div>
        </>}

        {/* ADD MEAL */}
        {screen === "addMeal" && <>
          <button style={s.btnBack} onClick={() => setScreen("home")}>← Volver</button>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 24 }}>🍽️ Añadir comida</div>
            <label style={s.lbl}>Momento del día</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {MEAL_TIMES.map(t => <button key={t.id} style={s.chip(mealTime === t.id)} onClick={() => setMealTime(t.id)}>{t.icon} {t.label}</button>)}
            </div>
            <label style={s.lbl}>Foto (opcional)</label>
            <div onClick={() => fileInputRef.current?.click()} style={{ width: "100%", height: 160, borderRadius: 14, border: "2px dashed rgba(74,222,128,0.2)", background: "rgba(255,255,255,0.03)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: 14, overflow: "hidden" }}>
              {mealPhoto ? <img src={mealPhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <><div style={{ fontSize: 30, marginBottom: 6 }}>📷</div><div style={{ color: "rgba(232,245,232,0.3)", fontSize: 13 }}>Toca para añadir foto</div></>}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhoto} />
            <label style={s.lbl}>Descripción</label>
            <textarea style={{ ...s.inp, minHeight: 85, resize: "none" }} placeholder="ej: 150g pechuga, ensalada, arroz..." value={mealDesc} onChange={e => setMealDesc(e.target.value)} />
            <button style={s.btnP} onClick={addMeal}>Guardar comida ✓</button>
          </div>
        </>}

        {/* ADD DRINK */}
        {screen === "addDrink" && <>
          <button style={s.btnBack} onClick={() => setScreen("home")}>← Volver</button>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 24 }}>💧 Añadir bebida</div>
            <label style={s.lbl}>Tipo</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
              {DRINK_TYPES.map(d => (
                <button key={d.id} onClick={() => setDrinkType(d.id)} style={{ padding: "12px", borderRadius: 14, border: drinkType === d.id ? `1px solid ${d.color}` : "1px solid rgba(255,255,255,0.08)", background: drinkType === d.id ? `${d.color}18` : "rgba(255,255,255,0.03)", color: drinkType === d.id ? d.color : "rgba(232,245,232,0.5)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{d.icon}</span>{d.label}
                </button>
              ))}
            </div>
            <label style={s.lbl}>Cantidad</label>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <input style={{ ...s.inp, marginBottom: 0, flex: 1 }} type="number" placeholder="ej: 500" value={drinkAmount} onChange={e => setDrinkAmount(e.target.value)} />
              <select style={{ ...s.inp, marginBottom: 0, width: 95 }} value={drinkUnit} onChange={e => setDrinkUnit(e.target.value)}>
                {["ml", "L", "cl", "copa", "vaso", "lata", "botella"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <button style={s.btnP} onClick={addDrink}>Guardar bebida ✓</button>
          </div>
        </>}

        {/* RESULT */}
        {screen === "result" && <>
          <button style={s.btnBack} onClick={() => setScreen("home")}>← Inicio</button>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>Análisis del día</div>
            <div style={{ fontSize: 12, color: "rgba(232,245,232,0.35)", marginBottom: 24 }}>{new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</div>
            {loading
              ? <div style={{ textAlign: "center", padding: 48 }}><div style={{ fontSize: 36, marginBottom: 16 }}>⚡</div><div style={{ color: "#4ade80", fontSize: 14 }}>Analizando tu día completo...</div></div>
              : <div style={s.feedbackBox}>{aiResponse}</div>
            }
          </div>
        </>}

        {/* CHAT */}
        {screen === "chat" && <>
          <div style={s.chatWrap}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>Coach IA 🤖</div>
            <div style={s.chatScroll}>
              {chatMessages.length === 0 && <div style={s.bubble(false)}>Hola Gus! 💪 Pregúntame lo que quieras sobre dieta, entrenamiento o tu progreso.</div>}
              {chatMessages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={s.bubble(m.role === "user")}>{m.content}</div>
                </div>
              ))}
              {chatLoading && <div style={{ ...s.bubble(false), opacity: 0.5 }}>Escribiendo...</div>}
              <div ref={chatEndRef} />
            </div>
            <div style={s.chatRow}>
              <input style={s.chatInp} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Escribe algo..." />
              <button style={s.sendBtn} onClick={sendChat}>↑</button>
            </div>
          </div>
        </>}

        {/* HISTORY */}
        {screen === "history" && <>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Historial</div>
          {entries.length === 0
            ? <div style={{ textAlign: "center", padding: 48, color: "rgba(232,245,232,0.25)", fontSize: 13 }}>Aún no hay registros.</div>
            : [...entries].reverse().map((e, i) => (
              <div key={i} style={{ padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{new Date(e.date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}</div>
                  <div style={{ fontSize: 12, color: "rgba(232,245,232,0.35)", lineHeight: 1.5 }}>{e.data?.meals?.length || 0} comidas · {e.data?.drinks?.length || 0} bebidas{e.data?.training ? ` · ${e.data.training.slice(0, 28)}` : ""}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#4ade80" }}>{e.data?.weight ? `${e.data.weight}kg` : "—"}</div>
              </div>
            ))
          }
        </>}
      </div>

      {showNav && (
        <div style={s.bottomNav}>
          {[{ id: "home", icon: "🏠", label: "Inicio" }, { id: "history", icon: "📋", label: "Historial" }, { id: "chat", icon: "💬", label: "Coach" }].map(n => (
            <button key={n.id} style={s.navItem(screen === n.id)} onClick={() => setScreen(n.id)}>
              <span style={{ fontSize: 22 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
