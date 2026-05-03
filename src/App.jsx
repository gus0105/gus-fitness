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
  { id: "weight", text: "¿Cuánto pesaste hoy? (kg)", type: "number", placeholder: "ej: 73.1", icon: "⚖️" },
  { id: "meals", text: "¿Qué comiste hoy?", type: "text", placeholder: "ej: avena con proteína, pollo con arroz...", icon: "🍽️" },
  { id: "training", text: "¿Entrenaste hoy? ¿Qué hiciste?", type: "text", placeholder: "ej: pecho y tríceps, 45min. O: descanso", icon: "💪" },
  { id: "water", text: "¿Cuánta agua tomaste aproximadamente?", type: "text", placeholder: "ej: 2 litros, bastante, poca...", icon: "💧" },
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
  const inputRef = useRef(null);

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
  const minW = weights.length ? Math.min(...weights) - 1 : 68;
  const maxW = weights.length ? Math.max(...weights) + 1 : 78;

  const styles = {
    app: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0f0a 100%)",
      fontFamily: "'DM Sans', sans-serif",
      color: "#e8f5e8",
      position: "relative",
      overflow: "hidden",
    },
    noise: {
      position: "fixed", inset: 0, opacity: 0.03, zIndex: 0,
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
      pointerEvents: "none",
    },
    glow1: {
      position: "fixed", top: "-20%", right: "-10%", width: "50vw", height: "50vw",
      borderRadius: "50%", background: "radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 70%)",
      pointerEvents: "none", zIndex: 0,
    },
    glow2: {
      position: "fixed", bottom: "-20%", left: "-10%", width: "40vw", height: "40vw",
      borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.04) 0%, transparent 70%)",
      pointerEvents: "none", zIndex: 0,
    },
    container: { maxWidth: 480, margin: "0 auto", padding: "0 20px 40px", position: "relative", zIndex: 1 },
    header: {
      padding: "28px 0 20px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    },
    logo: {
      fontSize: 13, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase",
      color: "#4ade80", opacity: 0.9,
    },
    date: { fontSize: 12, color: "rgba(232,245,232,0.35)", letterSpacing: "0.1em" },

    // Cards
    card: {
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(74,222,128,0.1)",
      borderRadius: 20, padding: "24px", marginBottom: 16,
      backdropFilter: "blur(10px)",
    },
    cardGreen: {
      background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)",
      borderRadius: 20, padding: "24px", marginBottom: 16,
    },

    // Stats row
    statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 },
    statBox: {
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16, padding: "16px 12px", textAlign: "center",
    },
    statVal: { fontSize: 22, fontWeight: 800, color: "#4ade80", lineHeight: 1 },
    statLabel: { fontSize: 10, color: "rgba(232,245,232,0.4)", marginTop: 4, letterSpacing: "0.1em", textTransform: "uppercase" },

    // Buttons
    btnPrimary: {
      width: "100%", padding: "18px", borderRadius: 16, border: "none",
      background: "linear-gradient(135deg, #4ade80, #22c55e)",
      color: "#0a0a0f", fontSize: 15, fontWeight: 800, letterSpacing: "0.05em",
      cursor: "pointer", transition: "all 0.2s", marginBottom: 12,
    },
    btnSecondary: {
      width: "100%", padding: "16px", borderRadius: 16,
      border: "1px solid rgba(74,222,128,0.25)",
      background: "rgba(74,222,128,0.05)",
      color: "#4ade80", fontSize: 14, fontWeight: 600,
      cursor: "pointer", transition: "all 0.2s", marginBottom: 12,
    },
    btnBack: {
      background: "none", border: "none", color: "rgba(232,245,232,0.4)",
      fontSize: 13, cursor: "pointer", padding: "8px 0", display: "flex", alignItems: "center", gap: 6,
    },

    // Checkin
    questionIcon: { fontSize: 36, marginBottom: 12, display: "block" },
    questionText: { fontSize: 20, fontWeight: 700, marginBottom: 24, lineHeight: 1.3, color: "#e8f5e8" },
    input: {
      width: "100%", padding: "16px", borderRadius: 14,
      border: "1px solid rgba(74,222,128,0.2)", background: "rgba(255,255,255,0.05)",
      color: "#e8f5e8", fontSize: 16, outline: "none",
      boxSizing: "border-box", marginBottom: 20,
      fontFamily: "'DM Sans', sans-serif",
    },
    progress: {
      display: "flex", gap: 6, marginBottom: 32,
    },
    progressDot: (active, done) => ({
      flex: 1, height: 3, borderRadius: 3,
      background: done ? "#4ade80" : active ? "rgba(74,222,128,0.5)" : "rgba(255,255,255,0.1)",
      transition: "all 0.3s",
    }),

    // Feedback
    feedbackBox: {
      background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)",
      borderRadius: 16, padding: 20, marginBottom: 20,
      fontSize: 15, lineHeight: 1.7, color: "#d1fae5",
    },

    // Chart
    chartArea: { height: 80, display: "flex", alignItems: "flex-end", gap: 3, padding: "0 4px" },
    chartBar: (h, isToday) => ({
      flex: 1, height: `${h}%`, borderRadius: "4px 4px 0 0",
      background: isToday ? "#4ade80" : "rgba(74,222,128,0.25)",
      transition: "height 0.5s ease",
      minWidth: 0,
    }),

    // History
    historyItem: {
      padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    },

    // Chat
    chatContainer: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)" },
    chatMessages: { flex: 1, overflowY: "auto", paddingBottom: 16 },
    chatBubble: (isUser) => ({
      maxWidth: "85%", padding: "12px 16px", borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
      background: isUser ? "linear-gradient(135deg, #4ade80, #22c55e)" : "rgba(255,255,255,0.06)",
      color: isUser ? "#0a0a0f" : "#e8f5e8",
      fontSize: 14, lineHeight: 1.6, marginBottom: 12,
      alignSelf: isUser ? "flex-end" : "flex-start",
      border: isUser ? "none" : "1px solid rgba(255,255,255,0.08)",
    }),
    chatInputRow: {
      display: "flex", gap: 10, paddingTop: 12,
      borderTop: "1px solid rgba(255,255,255,0.07)",
    },
    chatInput: {
      flex: 1, padding: "14px 16px", borderRadius: 14,
      border: "1px solid rgba(74,222,128,0.2)", background: "rgba(255,255,255,0.05)",
      color: "#e8f5e8", fontSize: 14, outline: "none",
      fontFamily: "'DM Sans', sans-serif",
    },
    chatSend: {
      padding: "14px 18px", borderRadius: 14, border: "none",
      background: "linear-gradient(135deg, #4ade80, #22c55e)",
      color: "#0a0a0f", fontWeight: 800, fontSize: 18, cursor: "pointer",
    },

    sectionTitle: {
      fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
      color: "rgba(74,222,128,0.6)", marginBottom: 16,
    },
    navBar: {
      display: "flex", gap: 8, marginBottom: 28,
    },
    navBtn: (active) => ({
      flex: 1, padding: "10px", borderRadius: 12, border: "none",
      background: active ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.03)",
      color: active ? "#4ade80" : "rgba(232,245,232,0.4)",
      fontSize: 12, fontWeight: 600, cursor: "pointer",
      borderBottom: active ? "2px solid #4ade80" : "2px solid transparent",
      transition: "all 0.2s",
    }),
  };

  // Mini chart
  const renderChart = () => {
    if (weights.length < 2) return <p style={{ color: "rgba(232,245,232,0.3)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Registra al menos 2 días para ver el gráfico</p>;
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "rgba(232,245,232,0.3)" }}>{maxW.toFixed(1)}kg</span>
          <span style={{ fontSize: 11, color: "rgba(232,245,232,0.3)" }}>{minW.toFixed(1)}kg</span>
        </div>
        <div style={styles.chartArea}>
          {lastWeightEntries.map((e, i) => {
            const w = parseFloat(e.answers?.weight);
            if (!w) return <div key={i} style={{ flex: 1 }} />;
            const h = 100 - ((w - minW) / (maxW - minW)) * 80;
            const isToday = e.date === todayStr;
            return <div key={i} style={styles.chartBar(Math.max(10, h), isToday)} title={`${e.date}: ${w}kg`} />;
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          {lastWeightEntries.length > 0 && (
            <>
              <span style={{ fontSize: 10, color: "rgba(232,245,232,0.25)" }}>
                {lastWeightEntries[0]?.date?.slice(5)}
              </span>
              <span style={{ fontSize: 10, color: "#4ade80" }}>hoy</span>
            </>
          )}
        </div>
      </div>
    );
  };

  const todayWeight = todayEntry?.answers?.weight;
  const prevWeight = entries.filter(e => e.answers?.weight && e.date !== todayStr).slice(-1)[0]?.answers?.weight;
  const weightDiff = todayWeight && prevWeight ? (parseFloat(todayWeight) - parseFloat(prevWeight)).toFixed(1) : null;

  return (
    <div style={styles.app}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <div style={styles.noise} />
      <div style={styles.glow1} />
      <div style={styles.glow2} />

      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.logo}>Gus Coach</span>
          <span style={styles.date}>{new Date().toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
        </div>

        {/* HOME */}
        {screen === "home" && (
          <>
            {/* Stats */}
            <div style={styles.statGrid}>
              <div style={styles.statBox}>
                <div style={styles.statVal}>{todayWeight ? `${todayWeight}` : "—"}</div>
                <div style={styles.statLabel}>kg hoy</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ ...styles.statVal, color: weightDiff < 0 ? "#4ade80" : weightDiff > 0 ? "#f87171" : "#4ade80" }}>
                  {weightDiff ? (weightDiff > 0 ? `+${weightDiff}` : weightDiff) : "—"}
                </div>
                <div style={styles.statLabel}>vs ayer</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statVal}>{entries.length}</div>
                <div style={styles.statLabel}>días</div>
              </div>
            </div>

            {/* Chart */}
            <div style={styles.card}>
              <div style={styles.sectionTitle}>Peso — últimas 2 semanas</div>
              {renderChart()}
            </div>

            {/* CTA */}
            {!todayEntry ? (
              <div style={styles.cardGreen}>
                <div style={{ fontSize: 13, color: "#4ade80", marginBottom: 8, fontWeight: 600 }}>
                  Check-in pendiente ⏰
                </div>
                <div style={{ fontSize: 14, color: "rgba(232,245,232,0.6)", marginBottom: 20 }}>
                  ¿Cómo estuvo el día de hoy?
                </div>
                <button style={styles.btnPrimary} onClick={startCheckin}>
                  Hacer check-in de hoy →
                </button>
              </div>
            ) : (
              <div style={styles.cardGreen}>
                <div style={{ fontSize: 13, color: "#4ade80", marginBottom: 8, fontWeight: 600 }}>
                  ✅ Check-in completado
                </div>
                <div style={{ fontSize: 14, color: "rgba(232,245,232,0.6)", marginBottom: 20, lineHeight: 1.6 }}>
                  {todayEntry.feedback?.slice(0, 120)}...
                </div>
                <button style={styles.btnSecondary} onClick={() => setScreen("result")}>
                  Ver feedback completo
                </button>
              </div>
            )}

            <button style={styles.btnSecondary} onClick={() => { setChatMessages([]); setScreen("chat"); }}>
              💬 Hablar con el coach
            </button>
            <button style={styles.btnSecondary} onClick={() => setScreen("history")}>
              📋 Ver historial
            </button>
          </>
        )}

        {/* CHECK-IN */}
        {screen === "checkin" && (
          <>
            <button style={styles.btnBack} onClick={() => setScreen("home")}>← Volver</button>
            <div style={{ marginTop: 16 }}>
              <div style={styles.progress}>
                {QUESTIONS.map((_, i) => (
                  <div key={i} style={styles.progressDot(i === currentStep, i < currentStep)} />
                ))}
              </div>
              <span style={styles.questionIcon}>{QUESTIONS[currentStep].icon}</span>
              <div style={styles.questionText}>{QUESTIONS[currentStep].text}</div>
              <input
                ref={inputRef}
                style={styles.input}
                type={QUESTIONS[currentStep].type}
                placeholder={QUESTIONS[currentStep].placeholder}
                value={currentAnswers[QUESTIONS[currentStep].id] || ""}
                onChange={e => handleAnswer(e.target.value)}
                onKeyDown={e => e.key === "Enter" && nextStep()}
                autoFocus
              />
              <button style={styles.btnPrimary} onClick={nextStep}>
                {currentStep < QUESTIONS.length - 1 ? "Siguiente →" : "Enviar al coach ✓"}
              </button>
              {currentStep > 0 && (
                <button style={styles.btnBack} onClick={() => setCurrentStep(s => s - 1)}>← Anterior</button>
              )}
            </div>
          </>
        )}

        {/* RESULT */}
        {screen === "result" && (
          <>
            <button style={styles.btnBack} onClick={() => setScreen("home")}>← Inicio</button>
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Feedback de hoy</div>
              <div style={{ fontSize: 13, color: "rgba(232,245,232,0.4)", marginBottom: 24 }}>
                {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 32, marginBottom: 16 }}>⚡</div>
                  <div style={{ color: "#4ade80", fontSize: 14 }}>Analizando tu día...</div>
                </div>
              ) : (
                <>
                  <div style={styles.feedbackBox}>{aiResponse || todayEntry?.feedback}</div>
                  <div style={styles.card}>
                    <div style={styles.sectionTitle}>Tu registro de hoy</div>
                    {QUESTIONS.map(q => {
                      const val = (currentAnswers[q.id] || todayEntry?.answers?.[q.id]);
                      if (!val) return null;
                      return (
                        <div key={q.id} style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, color: "rgba(74,222,128,0.6)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>
                            {q.icon} {q.id}
                          </div>
                          <div style={{ fontSize: 14, color: "rgba(232,245,232,0.8)" }}>{val}{q.id === "weight" ? " kg" : ""}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* CHAT */}
        {screen === "chat" && (
          <>
            <button style={styles.btnBack} onClick={() => setScreen("home")}>← Inicio</button>
            <div style={{ ...styles.chatContainer, marginTop: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Coach IA 🤖</div>
              <div style={{ ...styles.chatMessages, display: "flex", flexDirection: "column" }}>
                {chatMessages.length === 0 && (
                  <div style={{ ...styles.chatBubble(false) }}>
                    Hola Gus! 💪 Puedo ver tu progreso reciente y ayudarte con lo que necesites — dudas sobre dieta, entrenamiento, o analizar cómo vas. ¿Qué quieres saber?
                  </div>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={styles.chatBubble(m.role === "user")}>{m.content}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ ...styles.chatBubble(false), opacity: 0.6 }}>Escribiendo...</div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div style={styles.chatInputRow}>
                <input
                  style={styles.chatInput}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendChat()}
                  placeholder="Escribe algo..."
                />
                <button style={styles.chatSend} onClick={sendChat}>↑</button>
              </div>
            </div>
          </>
        )}

        {/* HISTORY */}
        {screen === "history" && (
          <>
            <button style={styles.btnBack} onClick={() => setScreen("home")}>← Inicio</button>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Historial</div>
              {entries.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: "rgba(232,245,232,0.3)", fontSize: 14 }}>
                  Aún no hay registros.<br />Haz tu primer check-in.
                </div>
              )}
              {[...entries].reverse().map((e, i) => (
                <div key={i} style={styles.historyItem}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                      {new Date(e.date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(232,245,232,0.4)", maxWidth: 260, lineHeight: 1.5 }}>
                      {e.answers?.meals?.slice(0, 60) || "Sin detalle"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#4ade80" }}>
                      {e.answers?.weight ? `${e.answers.weight}kg` : "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(232,245,232,0.3)" }}>{e.answers?.training?.slice(0, 20) || ""}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
