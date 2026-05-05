import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

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

const COACH_SYSTEM = `Eres el coach personal de Gus, 27 años, 170cm. Objetivo: recomposición corporal (bajar grasa, mantener músculo). Estado actual (mayo 2026): 73.3kg, 20.6% grasa, 54.4kg músculo. Meta: 67.7kg. Progreso: bajó de 77.4kg y 23.8% grasa en 2 meses. Habla en español, tutéalo, sé directo y concreto. Máximo 5 oraciones.`;

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

const EMPTY = { meals: [], drinks: [], weight: "", grasa: "", imc: "", training: "" };

async function callClaude(userPrompt) {
  const response = await fetch("/api/coach", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: userPrompt, system: COACH_SYSTEM }),
  });
  const json = await response.json();
  if (json.error) throw new Error(json.error);
  return json.text ?? "Sin respuesta.";
}

export default function App() {
  const [screen, setScreen]       = useState("home");
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
  const [mealProt, setMealProt]   = useState("");
  const [mealCarb, setMealCarb]   = useState("");
  const [mealFat, setMealFat]     = useState("");
  const [mealPhoto, setMealPhoto]   = useState(null);
  const [mealPhotoB64, setPhotoB64] = useState(null);
  const [analyzingPhoto, setAnPh]   = useState(false);
  const fileRef = useRef(null);
  const chatEnd = useRef(null);
  const todayStr = new Date().toISOString().split("T")[0];

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setEntries([]);
    setTodayRaw(EMPTY);
    setWInput(""); setGInput(""); setImcInput("");
  };

  const loadData = async (userId) => {
    try {
      const { data } = await supabase
        .from("entries")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: true });
      if (data?.length) {
        const allEntries = data.map(r => ({ date: r.date, today: r.data, feedback: r.feedback }));
        setEntries(allEntries);
        const td = allEntries.find(e => e.date === todayStr);
        if (td) {
          setTodayRaw(td.today);
          setWInput(td.today.weight || "");
          setGInput(td.today.grasa || "");
          setImcInput(td.today.imc || "");
          if (td.today?.analyses) setAnalyses(td.today.analyses);
          else if (td.feedback) setAnalyses([{ time: "—", text: td.feedback, type: "summary" }]);
        }
      }
    } catch {}
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadData(session.user.id);
      }
      setReady(true);
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await loadData(session.user.id);
      } else {
        setUser(null);
        setEntries([]);
        setTodayRaw(EMPTY);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
    const TIMES = ["08:00", "16:00", "21:00"];
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        if (Notification.permission === "granted") {
          reg.active?.postMessage({ type: "SCHEDULE_NOTIFICATIONS", times: TIMES });
        }
      } catch {}
    };
    register();
  }, []);

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

  const persist = async (newEntries, newToday) => {
    try {
      const t = newToday ?? todayRef.current;
      await supabase.from("entries").upsert({
        user_id: user?.id || "gus",
        date: todayStr,
        data: t,
        feedback: t.feedback ?? null,
      }, { onConflict: "user_id,date" });
      if (newEntries) setEntries(newEntries);
    } catch {}
  };

  const setT = (patch) => {
    const updated = { ...todayRef.current, ...patch };
    setTodayRaw(updated);
    persist(null, updated);
  };

  const saveWeight = () => { if (wInput) setT({ weight: wInput, grasa: gInput, imc: imcInput }); };

  const analyzePhoto = async (b64) => {
    setAnPh(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          image: b64,
          prompt: "Analiza esta foto de comida y estima los macronutrientes. Responde SOLO con un JSON así, sin texto extra: {\"desc\":\"descripción breve del plato\",\"prot\":25,\"carb\":40,\"fat\":12}. Usa gramos enteros. Si no puedes estimar, pon 0.",
          system: "Eres un nutricionista experto. Analizas fotos de comida y estimas macronutrientes con precisión. Respondes siempre en JSON puro sin markdown."
        }),
      });
      const json = await res.json();
      const raw = json.text?.replace(/```json|```/g,"").trim();
      const data = JSON.parse(raw);
      if (data.desc && !mealDesc) setMealDesc(data.desc);
      if (data.prot) setMealProt(String(data.prot));
      if (data.carb) setMealCarb(String(data.carb));
      if (data.fat)  setMealFat(String(data.fat));
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

  const addMeal = () => {
    if (!mealDesc.trim()) return;
    const meal = { id: Date.now(), slot: mealSlot, desc: mealDesc.trim(), time: nowTime(), photo: mealPhoto };
    if (mealProt) meal.prot = parseFloat(mealProt);
    if (mealCarb) meal.carb = parseFloat(mealCarb);
    if (mealFat)  meal.fat  = parseFloat(mealFat);
    setT({ meals: [...today.meals, meal] });
    setMealDesc(""); setMealProt(""); setMealCarb(""); setMealFat(""); setMealPhoto(null); setPhotoB64(null); setScreen("home");
  };

  const addDrink = () => {
    if (!drinkAmt.trim()) return;
    setT({ drinks: [...today.drinks, { id: Date.now(), type: drinkId, amount: drinkAmt, unit: drinkUnit, time: nowTime() }] });
    setDrinkAmt(""); setScreen("home");
  };

  const buildContext = () => {
    const mealTxt = today.meals.length
      ? today.meals.map(m => { const macros = [m.prot?`P:${m.prot}g`:"",m.carb?`C:${m.carb}g`:"",m.fat?`G:${m.fat}g`:""].filter(Boolean).join(" "); return `- ${MEALS.find(x=>x.id===m.slot)?.label} (${m.time}): ${m.desc}${macros?" ["+macros+"]":""}`; }).join("\n")
      : "Sin comidas";
    const drinkTxt = today.drinks.length
      ? today.drinks.map(d => `- ${DRINKS.find(x => x.id === d.type)?.label}: ${d.amount}${d.unit}`).join("\n")
      : "Sin bebidas";
    return { mealTxt, drinkTxt };
  };

  const saveAnalysis = async (text, type, newAnalyses) => {
    const updatedToday = { ...todayRef.current, analyses: newAnalyses };
    setTodayRaw(updatedToday);
    todayRef.current = updatedToday;
    const lastFeedback = [...newAnalyses].reverse().find(a => a.type === "summary")?.text
      || newAnalyses[newAnalyses.length - 1]?.text || text;
    try {
      await supabase.from("entries").upsert({
        user_id: user?.id || "gus", date: todayStr,
        data: updatedToday,
        feedback: lastFeedback,
      }, { onConflict: "user_id,date" });
      const entry = { date: todayStr, today: updatedToday, feedback: lastFeedback };
      const all = [...entries.filter(e => e.date !== todayStr), entry].sort((a, b) => a.date.localeCompare(b.date));
      setEntries(all);
    } catch {}
  };

  const analyzeNow = async () => {
    setLoading(true); setScreen("result");
    const { mealTxt, drinkTxt } = buildContext();
    const prompt = `Análisis rápido (${nowTime()}, ${new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long" })}):\nPESO: ${today.weight || "no registrado"}kg${today.grasa ? " | Grasa: "+today.grasa+"%" : ""}${today.imc ? " | IMC: "+today.imc : ""}\nCOMIDAS HASTA AHORA:\n${mealTxt}\nBEBIDAS:\n${drinkTxt}\nENTRENAMIENTO: ${today.training || "ninguno"}\nDame feedback breve sobre lo que llevo hasta ahora.`;
    try {
      const text = await callClaude(prompt);
      setAiText(text);
      const newAnalyses = [...analyses, { time: nowTime(), text, type: "quick" }];
      setAnalyses(newAnalyses);
      await saveAnalysis(text, "quick", newAnalyses);
    } catch (e) { setAiText("Error: " + e.message); }
    setLoading(false);
  };

  const analyzeDay = async () => {
    setLoading(true); setScreen("result");
    const { mealTxt, drinkTxt } = buildContext();
    const prompt = `Resumen final del día (${new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}):\nPESO: ${today.weight || "no registrado"}kg${today.grasa ? " | Grasa: "+today.grasa+"%" : ""}${today.imc ? " | IMC: "+today.imc : ""}\nCOMIDAS:\n${mealTxt}\nBEBIDAS:\n${drinkTxt}\nENTRENAMIENTO: ${today.training || "ninguno"}\nEste es el resumen completo del día. Dame un análisis detallado y un ajuste concreto para mañana.`;
    try {
      const text = await callClaude(prompt);
      setAiText(text);
      const newAnalyses = [...analyses, { time: nowTime(), text, type: "summary" }];
      setAnalyses(newAnalyses);
      await saveAnalysis(text, "summary", newAnalyses);
    } catch (e) { setAiText("Error: " + e.message); }
    setLoading(false);
  };

  const sendChat = async () => {
    if (!chatIn.trim() || chatBusy) return;
    const text = chatIn.trim(); setChatIn("");
    const next = [...msgs, { role: "user", content: text }];
    setMsgs(next); setChatBusy(true);
    const ctx = entries.slice(-5).map(e => `${e.date}: ${e.today?.weight || "?"}kg | ${e.today?.meals?.length || 0} comidas | ${e.today?.training || "-"}`).join("\n");
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

  const g = {
    page:     { minHeight:"100vh", background:"linear-gradient(160deg,#080b0f,#091209 60%,#080b0f)", fontFamily:"'DM Sans',sans-serif", color:"#e8f5e8" },
    wrap:     { maxWidth:440, margin:"0 auto", padding:"0 18px 90px" },
    hdr:      { padding:"28px 0 16px", display:"flex", justifyContent:"space-between", alignItems:"center" },
    logo:     { fontSize:11, fontWeight:800, letterSpacing:".3em", textTransform:"uppercase", color:"#4ade80" },
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
    bar:      (h,t) => ({ flex:1, borderRadius:"3px 3px 0 0", minWidth:0, height:`${Math.max(8,h)}%`, background: t?"linear-gradient(180deg,#4ade80,#22c55e)":"rgba(74,222,128,.2)" }),
    nav:      { position:"fixed", bottom:0, left:0, right:0, background:"rgba(8,11,15,.97)", borderTop:"1px solid rgba(255,255,255,.07)", display:"flex", justifyContent:"space-around", padding:"10px 0 18px", zIndex:100 },
    nb:       (a) => ({ display:"flex", flexDirection:"column", alignItems:"center", gap:2, background:"none", border:"none", color: a?"#4ade80":"rgba(232,245,232,.28)", cursor:"pointer", padding:"3px 16px", fontSize:9, fontWeight:600 }),
    chatWrap: { display:"flex", flexDirection:"column", height:"calc(100vh - 110px)" },
    chatScr:  { flex:1, overflowY:"auto", display:"flex", flexDirection:"column", paddingBottom:6 },
    bub:      (u) => ({ maxWidth:"85%", padding:"11px 15px", marginBottom:8, fontSize:13, lineHeight:1.65, borderRadius: u?"16px 16px 3px 16px":"16px 16px 16px 3px", background: u?"linear-gradient(135deg,#4ade80,#22c55e)":"rgba(255,255,255,.06)", color: u?"#080b0f":"#e8f5e8", border: u?"none":"1px solid rgba(255,255,255,.08)", alignSelf: u?"flex-end":"flex-start" }),
    chatRow:  { display:"flex", gap:8, paddingTop:10, borderTop:"1px solid rgba(255,255,255,.07)" },
    chatInp:  { flex:1, padding:"13px 14px", borderRadius:12, border:"1px solid rgba(74,222,128,.2)", background:"rgba(255,255,255,.05)", color:"#e8f5e8", fontSize:13, outline:"none", fontFamily:"'DM Sans',sans-serif" },
    send:     { padding:"13px 16px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#4ade80,#22c55e)", color:"#080b0f", fontWeight:900, fontSize:16, cursor:"pointer" },
  };

  const Chart = () => {
    if (wVals.length < 2) return <p style={{ color:"rgba(232,245,232,.22)", fontSize:12, textAlign:"center", padding:"12px 0" }}>Registra al menos 2 días</p>;
    return <>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:9, color:"rgba(232,245,232,.22)" }}>{wMax.toFixed(1)}kg</span>
        <span style={{ fontSize:9, color:"rgba(232,245,232,.22)" }}>{wMin.toFixed(1)}kg</span>
      </div>
      <div style={g.chart}>
        {wHistory.map((e,i) => { const w=parseFloat(e.today?.weight); if(!w) return <div key={i} style={{flex:1}}/>; const h=100-((w-wMin)/(wMax-wMin))*80; return <div key={i} style={g.bar(h,e.date===todayStr)} title={`${w}kg`}/>; })}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
        <span style={{ fontSize:9, color:"rgba(232,245,232,.2)" }}>{wHistory[0]?.date?.slice(5)}</span>
        <span style={{ fontSize:9, color:"#4ade80" }}>hoy</span>
      </div>
    </>;
  };

  if (!ready) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#080b0f,#091209)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}><div style={{ fontSize:32, marginBottom:10 }}>⚡</div><div style={{ color:"#4ade80", fontSize:13 }}>Cargando...</div></div>
    </div>
  );

  if (!user) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#080b0f,#091209 60%,#080b0f)", fontFamily:"'DM Sans',sans-serif", color:"#e8f5e8", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
      <div style={{ maxWidth:360, width:"100%", padding:"0 24px", textAlign:"center" }}>
        <div style={{ fontSize:64, marginBottom:16 }}>💪</div>
        <div style={{ fontSize:28, fontWeight:900, color:"#4ade80", marginBottom:8 }}>Gus Coach</div>
        <div style={{ fontSize:14, color:"rgba(232,245,232,.45)", marginBottom:48, lineHeight:1.6 }}>Tu coach personal de fitness con IA</div>
        <button onClick={signInWithGoogle} style={{ width:"100%", padding:"16px", borderRadius:14, border:"1px solid rgba(255,255,255,.15)", background:"rgba(255,255,255,.06)", color:"#e8f5e8", fontSize:15, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:12 }}>
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Entrar con Google
        </button>
      </div>
    </div>
  );

  const showNav = ["home","stats","history","chat"].includes(screen);

  return (
    <div style={g.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
      <div style={g.wrap}>
        <div style={g.hdr}>
          <span style={g.logo}>Gus Coach</span>
          <span style={g.dt}>{new Date().toLocaleDateString("es-ES",{day:"numeric",month:"short"})}</span>
        </div>

        {screen==="home" && <>
          <div style={g.g3}>
            <div style={g.sbox}><div style={g.sv}>{today.weight||"—"}</div><div style={g.sl}>kg hoy</div></div>
            <div style={g.sbox}><div style={{...g.sv,color:wDiff<0?"#4ade80":wDiff>0?"#f87171":"#4ade80"}}>{wDiff?(wDiff>0?`+${wDiff}`:wDiff):"—"}</div><div style={g.sl}>vs ayer</div></div>
            <div style={g.sbox}><div style={g.sv}>{today.meals.length}</div><div style={g.sl}>comidas</div></div>
          </div>

          {!today.weight ? (
            <div style={g.cardG}>
              <div style={g.sec}>⚖️ Medición de hoy</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                <div>
                  <div style={{fontSize:9,color:"rgba(74,222,128,.6)",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:5}}>Peso</div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <input style={{...g.inp,marginBottom:0,flex:1,padding:"10px 8px",fontSize:13}} type="number" inputMode="decimal" placeholder="73.1"
                      value={wInput} onChange={e=>setWInput(e.target.value)}/>
                    <span style={{color:"rgba(232,245,232,.35)",fontSize:11}}>kg</span>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:9,color:"rgba(74,222,128,.6)",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:5}}>% Grasa</div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <input style={{...g.inp,marginBottom:0,flex:1,padding:"10px 8px",fontSize:13}} type="number" inputMode="decimal" placeholder="20.6"
                      value={gInput} onChange={e=>setGInput(e.target.value)}/>
                    <span style={{color:"rgba(232,245,232,.35)",fontSize:11}}>%</span>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:9,color:"rgba(74,222,128,.6)",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:5}}>IMC</div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <input style={{...g.inp,marginBottom:0,flex:1,padding:"10px 8px",fontSize:13}} type="number" inputMode="decimal" placeholder="25.4"
                      value={imcInput} onChange={e=>setImcInput(e.target.value)}/>
                  </div>
                </div>
              </div>
              {wInput!==""&&<button style={{...g.btnP,marginBottom:0}} onClick={saveWeight}>Guardar medición ✓</button>}
            </div>
          ):(
            <div style={{...g.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",gap:20,alignItems:"center"}}>
                <div><div style={g.sec}>⚖️ Peso</div><div style={{fontSize:24,fontWeight:900,color:"#4ade80"}}>{today.weight}<span style={{fontSize:12,fontWeight:600}}>kg</span></div></div>
                {today.grasa&&<div><div style={g.sec}>Grasa</div><div style={{fontSize:18,fontWeight:700,color:"rgba(74,222,128,.8)"}}>{today.grasa}<span style={{fontSize:11}}>%</span></div></div>}
                {today.imc&&<div><div style={g.sec}>IMC</div><div style={{fontSize:18,fontWeight:700,color:"rgba(74,222,128,.8)"}}>{today.imc}</div></div>}
              </div>
              <button style={g.back} onClick={()=>{setT({weight:"",grasa:"",imc:""});setWInput("");setGInput("");setImcInput("");}}>✏️</button>
            </div>
          )}

          <div style={g.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={g.sec}>🍽️ Comidas de hoy</div>
              <button style={g.addBtn} onClick={()=>{setMealSlot(timeSlot());setMealDesc("");setScreen("addMeal");}}>+ Añadir</button>
            </div>
            {today.meals.length===0?<p style={{color:"rgba(232,245,232,.22)",fontSize:12}}>Sin comidas registradas aún</p>
              :today.meals.map(m=>{const sl=MEALS.find(x=>x.id===m.slot);return(
              <div key={m.id} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:"#4ade80",fontWeight:700,marginBottom:2}}>{sl?.icon} {sl?.label} · {m.time}</div>
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
            <div style={g.sec}>💪 Entrenamiento</div>
            <input style={{...g.inp,marginBottom:0}} placeholder="ej: pecho y tríceps 45min. O: descanso"
              value={today.training} onChange={e=>setT({training:e.target.value})}/>
          </div>

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

          <div style={{...g.card, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div>
              <div style={g.sec}>🔔 Notificaciones</div>
              <div style={{fontSize:12,color:"rgba(232,245,232,.45)"}}>
                {typeof Notification!=="undefined"&&Notification.permission==="granted"?"Activadas — 8:00, 16:00, 21:00":"Recibe avisos para registrar comidas"}
              </div>
            </div>
            <button onClick={requestNotifications} style={{background:"rgba(74,222,128,.1)",border:"1px solid rgba(74,222,128,.3)",borderRadius:10,color:"#4ade80",fontSize:12,fontWeight:700,padding:"8px 14px",cursor:"pointer",flexShrink:0}}>
              {typeof Notification!=="undefined"&&Notification.permission==="granted"?"✅ Activas":"Activar"}
            </button>
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
            <label style={g.lbl}>Foto del plato (opcional)</label>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handlePhotoChange}/>
            {!mealPhoto ? (
              <div onClick={()=>fileRef.current?.click()} style={{width:"100%",height:130,borderRadius:14,border:"2px dashed rgba(74,222,128,.2)",background:"rgba(255,255,255,.03)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",marginBottom:14}}>
                <div style={{fontSize:28,marginBottom:6}}>📷</div>
                <div style={{fontSize:12,color:"rgba(232,245,232,.3)"}}>Toca para añadir foto</div>
                <div style={{fontSize:10,color:"rgba(74,222,128,.4)",marginTop:3}}>Claude estimará los macros automáticamente</div>
              </div>
            ) : (
              <div style={{position:"relative",marginBottom:14}}>
                <img src={mealPhoto} style={{width:"100%",height:160,objectFit:"cover",borderRadius:14}}/>
                {analyzingPhoto && (
                  <div style={{position:"absolute",inset:0,background:"rgba(8,11,15,.7)",borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
                    <div style={{fontSize:24}}>⚡</div>
                    <div style={{fontSize:12,color:"#4ade80"}}>Analizando macros...</div>
                  </div>
                )}
                <button onClick={()=>{setMealPhoto(null);setPhotoB64(null);}} style={{position:"absolute",top:8,right:8,background:"rgba(8,11,15,.8)",border:"none",borderRadius:20,color:"#e8f5e8",width:28,height:28,cursor:"pointer",fontSize:14}}>×</button>
              </div>
            )}
            <label style={g.lbl}>¿Qué comiste?</label>
            <textarea style={{...g.inp,minHeight:80,resize:"none"}} placeholder="ej: 150g pechuga, ensalada, arroz..." value={mealDesc} onChange={e=>setMealDesc(e.target.value)}/>
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

        {screen==="result"&&<>
          <button style={g.back} onClick={()=>setScreen("home")}>← Inicio</button>
          <div style={{marginTop:12}}>
            <div style={{fontSize:20,fontWeight:900,marginBottom:4}}>Análisis del día</div>
            <div style={{fontSize:11,color:"rgba(232,245,232,.32)",marginBottom:20}}>{new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})}</div>
            {loading
              ?<div style={{textAlign:"center",padding:40}}><div style={{fontSize:32,marginBottom:12}}>⚡</div><div style={{color:"#4ade80",fontSize:13}}>Analizando tu día...</div></div>
              :<div style={g.fb}>{aiText}</div>}
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
            const wData = [...entries].filter(e=>e.today?.weight).slice(-30);
            const gData = [...entries].filter(e=>{
              if(e.today?.grasa) return true;
              if(e.feedback&&e.feedback.includes("Grasa corporal:")) return true;
              return false;
            }).slice(-30).map(e=>{
              if(e.today?.grasa) return e;
              const match = e.feedback?.match(/Grasa corporal: ([\d.]+)%/);
              if(match) return {...e, today:{...e.today, grasa: match[1]}};
              return e;
            });
            const mData = entries.filter(e=>e.today?.masa_muscular).slice(-30);
            const totalProt = today.meals.reduce((s,m)=>s+(m.prot||0),0);
            const totalCarb = today.meals.reduce((s,m)=>s+(m.carb||0),0);
            const totalFat  = today.meals.reduce((s,m)=>s+(m.fat||0),0);

            const MiniChart = ({data,key1,color,label,unit,decimals=1})=>{
              if(data.length<2) return <p style={{color:"rgba(232,245,232,.22)",fontSize:11,textAlign:"center",padding:"10px 0"}}>Pocos datos</p>;
              const vals = data.map(e=>parseFloat(e.today[key1])).filter(Boolean);
              const mn = Math.min(...vals)-0.5; const mx = Math.max(...vals)+0.5;
              const first = vals[0]; const last = vals[vals.length-1];
              const diff = (last-first).toFixed(decimals);
              const diffColor = (key1==="weight"||key1==="grasa") ? (diff<0?"#4ade80":"#f87171") : (diff>0?"#4ade80":"#f87171");
              return <div style={{marginBottom:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={g.sec}>{label}</div>
                  <div style={{fontSize:11,color:diffColor,fontWeight:700}}>{diff>0?"+":""}{diff}{unit}</div>
                </div>
                <div style={{height:60,display:"flex",alignItems:"flex-end",gap:2}}>
                  {data.map((e,i)=>{
                    const v=parseFloat(e.today[key1]); if(!v) return <div key={i} style={{flex:1}}/>;
                    const h=100-((v-mn)/(mx-mn))*80;
                    const isLast=i===data.length-1;
                    return <div key={i} style={{flex:1,borderRadius:"2px 2px 0 0",minWidth:0,height:`${Math.max(6,h)}%`,background:isLast?color:`${color}55`}}/>;
                  })}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                  <span style={{fontSize:9,color:"rgba(232,245,232,.2)"}}>{data[0]?.date?.slice(5)}</span>
                  <span style={{fontSize:11,fontWeight:700,color:color}}>{last.toFixed(decimals)}{unit}</span>
                </div>
              </div>;
            };

            return <>
              <div style={g.card}>
                <MiniChart data={wData} key1="weight" color="#4ade80" label="⚖️ Peso — últimos 30 días" unit="kg"/>
              </div>
              <div style={g.card}>
                <MiniChart data={gData} key1="grasa" color="#fb923c" label="🔥 % Grasa corporal — últimos 30 días" unit="%" decimals={1}/>
                {gData.length>=2&&(()=>{
                  const vals=gData.map(e=>parseFloat(e.today.grasa)).filter(Boolean);
                  const first=vals[0]; const last=vals[vals.length-1];
                  const perdida=(first-last).toFixed(1);
                  return perdida>0?<div style={{fontSize:11,color:"#4ade80",marginTop:8}}>✅ Has bajado {perdida}% de grasa desde {gData[0]?.date?.slice(5)}</div>:null;
                })()}
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
                const hasTraining = !!(entry?.today?.training);
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
                  {selEntry.today?.training&&<div style={{fontSize:12,color:"rgba(129,140,248,.9)",marginBottom:8}}>💪 {selEntry.today.training}</div>}
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
                                    {e.today?.meals?.length||0} comidas{e.today?.training?` · ${e.today.training.slice(0,20)}`:""}
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

      {showNav&&(
        <div style={g.nav}>
          {[{id:"home",icon:"🏠",label:"Inicio"},{id:"stats",icon:"📊",label:"Stats"},{id:"history",icon:"📋",label:"Historial"},{id:"chat",icon:"💬",label:"Coach"}].map(n=>(
            <button key={n.id} style={g.nb(screen===n.id)} onClick={()=>setScreen(n.id)}>
              <span style={{fontSize:20}}>{n.icon}</span>{n.label}
            </button>))}
        </div>
      )}
    </div>
  );
}
