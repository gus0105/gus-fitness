import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "gus_fitness_data";

const systemPrompt = `Eres el coach personal de Gus, un hombre de 27 años, 170cm. 
Su objetivo es recomposición corporal: bajar grasa manteniendo músculo.
Datos actuales (1 mayo 2026): 73.3kg, 20.6% grasa, 54.4kg músculo. Meta: 67.7kg.
Lleva 2+ meses de progreso consistente: bajó de 77.4kg y 23.8% grasa.

Tu rol:
- Analiza lo que come y entrena cada día
- Da feedback breve, directo y motivador (máx 3-4 oraciones)
- Si falta proteína, dilo. Si entrenó bien, reconócelo.
- Sugiere ajustes pequeños y concretos
- Habla en español, tutéalo, sé cercano pero profesional
- NO seas genérico. Recuerda su contexto y progreso real.`;

const QUESTIONS = [
  { id: "weight", text: "¿Cuánto pesaste hoy?", type: "number", placeholder: "ej: 73.1", icon: "⚖️", suffix: "kg" },
  { id: "meals", text: "¿Qué comiste hoy?", type: "text", placeholder: "ej: avena con proteína, pollo con arroz...", icon: "🍽️" },
  { id: "training", text: "¿Entrenaste hoy? ¿Qué hiciste?", type: "text", placeholder: "ej: pecho y tríceps 45min. O: descanso", icon: "💪" },
  { id: "water", text: "¿Cuánta agua tomaste?", type: "text", placeholder: "ej: 2 litros, bastante, poca...", icon: "💧" },
  { id: "feeling", text: "¿Cómo te sentiste hoy?", type: "text", placeholder: "ej: con energía, cansado, motivado...", icon: "🎯" },
];

export default function App() {
  const [screen, setScreen] = useState("home");
  const [entries, setEntries] = useState([]);
  const [currentAnswers, setCurrentAnswers] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [aiResponse, setAiResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setEntries(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const saveEntries = (newEntries) => {
    setEntries(newEntries);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries)); } catch {}
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const todayEntry = entries.find(e => e.date === todayStr);
  const lastWeightEntries = entries.filter(e => e.answers?.weight).slice(-14);

  const handleAnswer = (value) => {
    setCurrentAnswers(prev => ({ ...prev, [QUESTIONS[currentStep].id]: value }));
  };

  const nextStep = async () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      await submitCheckin();
    }
  };

  const submitCheckin = async () => {
    setLoading(true);
    setScreen("result");

    const summary = `Check-in de hoy (${new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}):
- Peso: ${currentAnswers.weight || "no registrado"}kg
- Comida: ${currentAnswers.meals || "no registrado"}
- Entrenamiento: ${currentAnswers.training || "no registrado"}
- Agua: ${currentAnswers.water || "no registrado"}
- Estado: ${currentAnswers.feeling || "no registrado"}

Dame feedback concreto sobre este día.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: summary }]
        })
      });
      const data = await res.json();
      const text = data.content?.find(b => b.type === "text")?.text || "No se pudo obtener feedback.";
      setAiResponse(text);
      const newEntry = { date: todayStr, answers: currentAnswers, feedback: text, timestamp: Date.now() };
      const updated = [...entries.filter(e => e.date !== todayStr), newEntry].sort((a, b) => a.date.localeCompare(b.date));
      saveEntries(updated);
    } catch {
      setAiResponse("Error al conectar con el coach. Tus datos se guardaron igualmente.");
    }
    setLoading(false);
  };

  const startCheckin = () => {
    setCurrentAnswers({});
    setCurrentStep(0);
    setAiResponse("");
    setScreen("checkin");
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const newMessages = [...chatMessages, { role: "user", content: userMsg }];
    setChatMessages(newMessages);
    setChatLoading(true);

    const context = entries.slice(-7).map(e =>
      `${e.date}: ${e.answers?.weight ? e.answers.weight + "kg" : ""} | ${e.answers?.meals || ""} | ${e.answers?.training || ""}`
    ).join("\n");

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt + (context ? `\n\nRegistros recientes de Gus:\n${context}` : ""),
          messages: newMessages
        })
      });
      const data = await res.json();
      const text = data.content?.find(b => b.type === "text")?.text || "Sin respuesta.";
      setChatMessages([...newMessages, { role: "assistant", content: text }]);
    } catch {
      setChatMessages([...newMessages, { role: "assistant", content: "Error de conexión. Intenta de nuevo." }]);
    }
    setChatLoading(false);
  };

  const weights = lastWeightEntries.map(e => parseFloat(e.answers?.weight)).filter(Boolean);
  const minW = weights.length ? Math.min(...weights) - 0.5 : 68;
  const maxW = weights.length ? Math.max(...weights) + 0.5 : 78;

  const todayWeight = todayEntry?.answers?.weight;
  const prevWeight = entries.filter(e => e.answers?.weight && e.date !== todayStr).slice(-1)[0]?.answers?.weight;
  const weightDiff = todayWeight && prevWeight ? (parseFloat(todayWeight) - parseFloat(prevWeight)).toFixed(1) : null;

  const s = {
    app: {
      minHeight: "100vh", minHeight: "100dvh",
      background: "linear-gradient(160deg, #080b0f 0%, #0a0f0a 60%, #080b0f 100%)",
      fontFamily: "'DM Sans', sans-serif", color: "#e8f5e8",
      position: "relative", overflow: "hidden",
    },
    glow1: {
      position: "fixed", top: "-15%", right: "-15%", width: "55vw", height: "55vw",
      borderRadius: "50%", background: "radial-gradient(circle, rgba(74,222,128,0.07) 0%, transparent 65%)",
      pointerEvents: "none", zIndex: 0,
    },
    glow2: {
      position: "fixed", bottom: "-20%", left: "-10%", width: "45vw", height: "45vw",
      borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 65%)",
      pointerEvents: "none", zIndex: 0,
    },
    wrap: { maxWidth: 480, margin: "0 auto", padding: "0 20px 60px", position: "relative", zIndex: 1 },
    header: { padding: "32px 0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    logo: { fontSize: 13, fontWeight: 800, letterSpacing: "0.3em", textTransform: "uppercase", color: "#4ade80" },
    dateLabel: { fontSize: 11, color: "rgba(232,245,232,0.3)", letterSpacing: "0.1em" },
    card: {
      background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 20, padding: 24, marginBottom: 14, backdropFilter: "blur(12px)",
    },
    cardGreen: {
      background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.18)",
      borderRadius: 20, padding: 24, marginBottom: 14,
    },
    statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 },
    statBox: {
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16, padding: "18px 10px", textAlign: "center",
    },
    statVal: { fontSize: 24, fontWeight: 900, color: "#4ade80", lineHeight: 1 },
    statLabel: { fontSize: 9, color: "rgba(232,245,232,0.35)", marginTop: 5, letterSpacing: "0.12em", textTransform: "uppercase" },
    sectionTitle: { fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(74,222,128,0.55)", marginBottom: 16 },
    btnPrimary: {
      width: "100%", padding: "18px", borderRadius: 16, border: "none",
      background: "linear-gradient(135deg, #4ade80 0%, #22c55e 100%)",
      color: "#080b0f", fontSize: 15, fontWeight: 800, letterSpacing: "0.04em",
      cursor: "pointer", marginBottom: 12, transition: "opacity 0.15s",
    },
    btnSecondary: {
      width: "100%", padding: "16px", borderRadius: 16,
      border: "1px solid rgba(74,222,128,0.2)", background: "rgba(74,222,128,0.04)",
      color: "#4ade80", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 12,
    },
    btnBack: {
      background: "none", border: "none", color: "rgba(232,245,232,0.35)",
      fontSize: 13, cursor: "pointer", padding: "6px 0", marginBottom: 8,
    },
    qIcon: { fontSize: 40, display: "block", marginBottom: 14 },
    qText: { fontSize: 22, fontWeight: 800, marginBottom: 28, lineHeight: 1.3, color: "#e8f5e8" },
    input: {
      width: "100%", padding: "17px 16px", borderRadius: 14,
      border: "1px solid rgba(74,222,128,0.2)", background: "rgba(255,255,255,0.05)",
      color: "#e8f5e8", fontSize: 16, outline: "none", boxSizing: "border-box",
      marginBottom: 20, fontFamily: "'DM Sans', sans-serif",
    },
    progressRow: { display: "flex", gap: 6, marginBottom: 36 },
    dot: (active, done) => ({
      flex: 1, height: 3, borderRadius: 3,
      background: done ? "#4ade80" : active ? "rgba(74,222,128,0.45)" : "rgba(255,255,255,0.08)",
      transition: "background 0.3s",
    }),
    feedbackBox: {
      background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.18)",
      borderRadius: 16, padding: "20px", marginBottom: 20, fontSize: 15, lineHeight: 1.75, color: "#d1fae5",
    },
    chartWrap: { height: 80, display: "flex", alignItems: "flex-end", gap: 3 },
    bar: (h, today) => ({
      flex: 1, borderRadius: "4px 4px 0 0", minWidth: 0,
      height: `${Math.max(8, h)}%`,
      background: today ? "linear-gradient(180deg,#4ade80,#22c55e)" : "rgba(74,222,128,0.22)",
      transition: "height 0.5s ease",
    }),
    chatWrap: { display: "flex", flexDirection: "column", height: "calc(100dvh - 130px)" },
    chatScroll: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", paddingBottom: 8 },
    bubble: (user) => ({
      maxWidth: "86%", padding: "12px 16px", marginBottom: 10, fontSize: 14, lineHeight: 1.65,
      borderRadius: user ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
      background: user ? "linear-gradient(135deg,#4ade80,#22c55e)" : "rgba(255,255,255,0.06)",
      color: user ? "#080b0f" : "#e8f5e8",
      border: user ? "none" : "1px solid rgba(255,255,255,0.08)",
      alignSelf: user ? "flex-end" : "flex-start",
    }),
    chatRow: { display: "flex", gap: 10, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)" },
    chatInp: {
      flex: 1, padding: "14px 16px", borderRadius: 14,
      border: "1px solid rgba(74,222,128,0.2)", background: "rgba(255,255,255,0.05)",
      color: "#e8f5e8", fontSize: 14, outline: "none", fontFamily: "'DM Sans', sans-serif",
    },
    sendBtn: {
      padding: "14px 18px", borderRadius: 14, border: "none",
      background: "linear-gradient(135deg,#4ade80,#22c55e)",
      color: "#080b0f", fontWeight: 900, fontSize: 18, cursor: "pointer",
    },
    histItem: {
      padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    },
  };

  const renderChart = () => {
    if (weights.length < 2) return (
      <p style={{ color: "rgba(232,245,232,0.25)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>
        Registra al menos 2 días para ver el gráfico
      </p>
    );
    return (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: "rgba(232,245,232,0.25)" }}>{maxW.toFixed(1)}kg</span>
          <span style={{ fontSize: 10, color: "rgba(232,245,232,0.25)" }}>{minW.toFixed(1)}kg</span>
        </div>
        <div style={s.chartWrap}>
          {lastWeightEntries.map((e, i) => {
            const w = parseFloat(e.answers?.weight);
            if (!w) return <div key={i} style={{ flex: 1 }} />;
            const h = 100 - ((w - minW) / (maxW - minW)) * 80;
            return <div key={i} style={s.bar(h, e.date === todayStr)} title={`${e.date}: ${w}kg`} />;
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 10, color: "rgba(232,245,232,0.2)" }}>{lastWeightEntries[0]?.date?.slice(5)}</span>
          <span style={{ fontSize: 10, color: "#4ade80" }}>hoy</span>
        </div>
      </>
    );
  };

  return (
    <div style={s.app}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900&display=swap" rel="stylesheet" />
      <div style={s.glow1} /><div style={s.glow2} />

      <div style={s.wrap}>
        <div style={s.header}>
          <span style={s.logo}>Gus Coach</span>
          <span style={s.dateLabel}>{new Date().toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>

        {/* ── HOME ── */}
        {screen === "home" && <>
          <div style={s.statGrid}>
            <div style={s.statBox}>
              <div style={s.statVal}>{todayWeight || "—"}</div>
              <div style={s.statLabel}>kg hoy</div>
            </div>
            <div style={s.statBox}>
              <div style={{ ...s.statVal, color: weightDiff < 0 ? "#4ade80" : weightDiff > 0 ? "#f87171" : "#4ade80" }}>
                {weightDiff ? (weightDiff > 0 ? `+${weightDiff}` : weightDiff) : "—"}
              </div>
              <div style={s.statLabel}>vs ayer</div>
            </div>
            <div style={s.statBox}>
              <div style={s.statVal}>{entries.length}</div>
              <div style={s.statLabel}>días</div>
            </div>
          </div>

          <div style={s.card}>
            <div style={s.sectionTitle}>Evolución — últimas 2 semanas</div>
            {renderChart()}
          </div>

          {!todayEntry ? (
            <div style={s.cardGreen}>
              <div style={{ fontSize: 12, color: "#4ade80", fontWeight: 700, marginBottom: 6 }}>Check-in pendiente ⏰</div>
              <div style={{ fontSize: 14, color: "rgba(232,245,232,0.55)", marginBottom: 20 }}>¿Cómo estuvo el día de hoy?</div>
              <button style={s.btnPrimary} onClick={startCheckin}>Hacer check-in de hoy →</button>
            </div>
          ) : (
            <div style={s.cardGreen}>
              <div style={{ fontSize: 12, color: "#4ade80", fontWeight: 700, marginBottom: 6 }}>✅ Check-in completado</div>
              <div style={{ fontSize: 13, color: "rgba(232,245,232,0.5)", marginBottom: 20, lineHeight: 1.6 }}>
                {todayEntry.feedback?.slice(0, 130)}...
              </div>
              <button style={s.btnSecondary} onClick={() => { setAiResponse(todayEntry.feedback); setScreen("result"); }}>
                Ver feedback completo
              </button>
            </div>
          )}

          <button style={s.btnSecondary} onClick={() => { setChatMessages([]); setScreen("chat"); }}>
            💬 Hablar con el coach
          </button>
          <button style={s.btnSecondary} onClick={() => setScreen("history")}>
            📋 Ver historial
          </button>
        </>}

        {/* ── CHECK-IN ── */}
        {screen === "checkin" && <>
          <button style={s.btnBack} onClick={() => setScreen("home")}>← Volver</button>
          <div style={{ marginTop: 12 }}>
            <div style={s.progressRow}>
              {QUESTIONS.map((_, i) => <div key={i} style={s.dot(i === currentStep, i < currentStep)} />)}
            </div>
            <span style={s.qIcon}>{QUESTIONS[currentStep].icon}</span>
            <div style={s.qText}>{QUESTIONS[currentStep].text}</div>
            <input
              style={s.input}
              type={QUESTIONS[currentStep].type}
              placeholder={QUESTIONS[currentStep].placeholder}
              value={currentAnswers[QUESTIONS[currentStep].id] || ""}
              onChange={e => handleAnswer(e.target.value)}
              onKeyDown={e => e.key === "Enter" && nextStep()}
              autoFocus
            />
            <button style={s.btnPrimary} onClick={nextStep}>
              {currentStep < QUESTIONS.length - 1 ? "Siguiente →" : "Enviar al coach ✓"}
            </button>
            {currentStep > 0 && <button style={s.btnBack} onClick={() => setCurrentStep(s => s - 1)}>← Anterior</button>}
          </div>
        </>}

        {/* ── RESULT ── */}
        {screen === "result" && <>
          <button style={s.btnBack} onClick={() => setScreen("home")}>← Inicio</button>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>Feedback de hoy</div>
            <div style={{ fontSize: 12, color: "rgba(232,245,232,0.35)", marginBottom: 28 }}>
              {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            {loading ? (
              <div style={{ textAlign: "center", padding: 48 }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>⚡</div>
                <div style={{ color: "#4ade80", fontSize: 14 }}>Analizando tu día...</div>
              </div>
            ) : <>
              <div style={s.feedbackBox}>{aiResponse}</div>
              <div style={s.card}>
                <div style={s.sectionTitle}>Tu registro</div>
                {QUESTIONS.map(q => {
                  const val = currentAnswers[q.id] || todayEntry?.answers?.[q.id];
                  if (!val) return null;
                  return (
                    <div key={q.id} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: "rgba(74,222,128,0.55)", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>
                        {q.icon} {q.id}
                      </div>
                      <div style={{ fontSize: 14, color: "rgba(232,245,232,0.75)" }}>{val}{q.id === "weight" ? " kg" : ""}</div>
                    </div>
                  );
                })}
              </div>
            </>}
          </div>
        </>}

        {/* ── CHAT ── */}
        {screen === "chat" && <>
          <button style={s.btnBack} onClick={() => setScreen("home")}>← Inicio</button>
          <div style={{ ...s.chatWrap, marginTop: 8 }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 20 }}>Coach IA 🤖</div>
            <div style={s.chatScroll}>
              {chatMessages.length === 0 && (
                <div style={s.bubble(false)}>
                  Hola Gus! 💪 Puedo ver tu progreso y ayudarte con dudas sobre dieta, entrenamiento o cómo vas. ¿Qué necesitas?
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={s.bubble(m.role === "user")}>{m.content}</div>
                </div>
              ))}
              {chatLoading && <div style={{ ...s.bubble(false), opacity: 0.5 }}>Escribiendo...</div>}
              <div ref={chatEndRef} />
            </div>
            <div style={s.chatRow}>
              <input
                style={s.chatInp}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()}
                placeholder="Escribe algo..."
              />
              <button style={s.sendBtn} onClick={sendChat}>↑</button>
            </div>
          </div>
        </>}

        {/* ── HISTORY ── */}
        {screen === "history" && <>
          <button style={s.btnBack} onClick={() => setScreen("home")}>← Inicio</button>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 24 }}>Historial</div>
            {entries.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: "rgba(232,245,232,0.25)", fontSize: 13 }}>
                Aún no hay registros.<br />Haz tu primer check-in.
              </div>
            ) : [...entries].reverse().map((e, i) => (
              <div key={i} style={s.histItem}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                    {new Date(e.date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(232,245,232,0.35)", maxWidth: 240, lineHeight: 1.5 }}>
                    {e.answers?.training?.slice(0, 50) || "Sin entrenamiento registrado"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#4ade80" }}>
                    {e.answers?.weight ? `${e.answers.weight}` : "—"}
                    {e.answers?.weight && <span style={{ fontSize: 13, fontWeight: 600 }}>kg</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>}
      </div>
    </div>
  );
}
