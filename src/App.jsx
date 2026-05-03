import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const USER_ID = "gus";

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

const EMPTY = { meals: [], drinks: [], weight: "", training: "" };

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
  const chatEnd = useRef(null);
  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("entries")
          .select("*")
          .eq("user_id", USER_ID)
          .order("date", { ascending: true });
        if (data?.length) {
          const allEntries = data.map(r => ({ date: r.date, today: r.data, feedback: r.feedback }));
          setEntries(allEntries);
          const td = allEntries.find(e => e.date === todayStr);
          if (td) { setTodayRaw(td.today); setWInput(td.today.weight || ""); }
        }
      } catch {}
      setReady(true);
    })();
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
        user_id: USER_ID,
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

  const saveWeight = () => { if (wInput) setT({ weight: wInput }); };

  const addMeal = () => {
    if (!mealDesc.trim()) return;
    setT({ meals: [...today.meals, { id: Date.now(), slot: mealSlot, desc: mealDesc.trim(), time: nowTime() }] });
    setMealDesc(""); setScreen("home");
  };

  const addDrink = () => {
    if (!drinkAmt.trim()) return;
    setT({ drinks: [...today.drinks, { id: Date.now(), type: drinkId, amount: drinkAmt, unit: drinkUnit, time: nowTime() }] });
    setDrinkAmt(""); setScreen("home");
  };

  const analyzeDay = async () => {
    setLoading(true); setScreen("result");
    const mealTxt = today.meals.length
      ? today.meals.map(m => `- ${MEALS.find(x => x.id === m.slot)?.label} (${m.time}): ${m.desc}`).join("\n")
      : "Sin comidas";
    const drinkTxt = today.drinks.length
      ? today.drinks.map(d => `- ${DRINKS.find(x => x.id === d.type)?.label}: ${d.amount}${d.unit}`).join("\n")
      : "Sin bebidas";
    const prompt = `Analiza mi día (${new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}):\nPESO: ${today.weight || "no registrado"}kg\nCOMIDAS:\n${mealTxt}\nBEBIDAS:\n${drinkTxt}\nENTRENAMIENTO: ${today.training || "ninguno"}\nDame feedback concreto y un ajuste para mañana.`;
    try {
      const text = await callClaude(prompt);
      setAiText(text);
      const entry = { date: todayStr, today: { ...today }, feedback: text };
      const all = [...entries.filter(e => e.date !== todayStr), entry].sort((a, b) => a.date.localeCompare(b.date));
      setEntries(all);
      try {
        await supabase.from("entries").upsert({
          user_id: USER_ID, date: todayStr,
          data: { ...today }, feedback: text,
        }, { onConflict: "user_id,date" });
      } catch {}
    } catch (e) {
      setAiText("Error: " + e.message);
    }
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

  if (!ready) return <div style={{ ...g.page, display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{ textAlign:"center" }}><div style={{ fontSize:32, marginBottom:10 }}>⚡</div><div style={{ color:"#4ade80", fontSize:13 }}>Cargando...</div></div></div>;

  const showNav = ["home","history","chat"].includes(screen);

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
              <div style={g.sec}>⚖️ Peso de hoy</div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:wInput?10:0}}>
                <input style={{...g.inp,marginBottom:0,flex:1}} type="number" inputMode="decimal" placeholder="ej: 73.1"
                  value={wInput} onChange={e=>setWInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveWeight()}/>
                <span style={{color:"rgba(232,245,232,.4)",fontSize:13}}>kg</span>
              </div>
              {wInput!==""&&<button style={{...g.btnP,marginBottom:0,marginTop:10}} onClick={saveWeight}>Guardar ✓</button>}
            </div>
          ):(
            <div style={{...g.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={g.sec}>⚖️ Peso</div><div style={{fontSize:26,fontWeight:900,color:"#4ade80"}}>{today.weight}<span style={{fontSize:13,fontWeight:600}}>kg</span></div></div>
              <button style={g.back} onClick={()=>{setT({weight:""});setWInput("");}}>✏️</button>
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

          <div style={g.cardG}>
            <div style={{fontSize:11,color:"#4ade80",fontWeight:700,marginBottom:5}}>{todayEntry?"✅ Análisis completado":"🌙 Análisis del día"}</div>
            <div style={{fontSize:12,color:"rgba(232,245,232,.48)",marginBottom:14,lineHeight:1.6}}>
              {todayEntry?todayEntry.feedback?.slice(0,110)+"...":"Cuando termines, el coach analiza comidas, bebidas y entrenamiento."}
            </div>
            {todayEntry
              ?<button style={g.btnS} onClick={()=>{setAiText(todayEntry.feedback);setScreen("result");}}>Ver feedback</button>
              :<button style={g.btnP} onClick={analyzeDay}>Analizar mi día →</button>}
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
            <label style={g.lbl}>¿Qué comiste?</label>
            <textarea style={{...g.inp,minHeight:80,resize:"none"}} placeholder="ej: 150g pechuga, ensalada, arroz..." value={mealDesc} onChange={e=>setMealDesc(e.target.value)}/>
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

        {screen==="history"&&<>
          <div style={{fontSize:17,fontWeight:800,marginBottom:18}}>Historial</div>
          {entries.length===0
            ?<div style={{textAlign:"center",padding:40,color:"rgba(232,245,232,.22)",fontSize:13}}>Aún no hay registros.</div>
            :[...entries].reverse().map((e,i)=>(
              <div key={i} style={{padding:"14px 0",borderBottom:"1px solid rgba(255,255,255,.05)",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:3}}>{new Date(e.date+"T12:00:00").toLocaleDateString("es-ES",{weekday:"short",day:"numeric",month:"short"})}</div>
                  <div style={{fontSize:11,color:"rgba(232,245,232,.32)",lineHeight:1.5}}>{e.today?.meals?.length||0} comidas · {e.today?.drinks?.length||0} bebidas{e.today?.training?` · ${e.today.training.slice(0,25)}`:""}</div>
                </div>
                <div style={{fontSize:18,fontWeight:900,color:"#4ade80"}}>{e.today?.weight?`${e.today.weight}kg`:"—"}</div>
              </div>))}
        </>}
      </div>

      {showNav&&(
        <div style={g.nav}>
          {[{id:"home",icon:"🏠",label:"Inicio"},{id:"history",icon:"📋",label:"Historial"},{id:"chat",icon:"💬",label:"Coach"}].map(n=>(
            <button key={n.id} style={g.nb(screen===n.id)} onClick={()=>setScreen(n.id)}>
              <span style={{fontSize:20}}>{n.icon}</span>{n.label}
            </button>))}
        </div>
      )}
    </div>
  );
}
