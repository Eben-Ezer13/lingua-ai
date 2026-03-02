import { useState, useEffect, useRef, useCallback } from "react";

const LANGUAGES = [
  { code: "es", name: "Español", flag: "🇪🇸", color: "#E63946" },
  { code: "fr", name: "Français", flag: "🇫🇷", color: "#457B9D" },
  { code: "de", name: "Deutsch", flag: "🇩🇪", color: "#F4A261" },
  { code: "ja", name: "日本語", flag: "🇯🇵", color: "#E9C46A" },
  { code: "it", name: "Italiano", flag: "🇮🇹", color: "#2A9D8F" },
  { code: "pt", name: "Português", flag: "🇧🇷", color: "#264653" },
  { code: "zh", name: "中文", flag: "🇨🇳", color: "#E76F51" },
  { code: "ar", name: "العربية", flag: "🇸🇦", color: "#8338EC" },
];

const CEFR_LEVELS = [
  { id: "A1", label: "A1 — Débutant", color: "#6BCB77", xpRequired: 0, description: "Expressions très basiques, présentations simples" },
  { id: "A2", label: "A2 — Élémentaire", color: "#4D96FF", xpRequired: 100, description: "Phrases simples sur sujets familiers" },
  { id: "B1", label: "B1 — Intermédiaire", color: "#FFD166", xpRequired: 300, description: "Situations courantes de voyage et travail" },
  { id: "B2", label: "B2 — Intermédiaire avancé", color: "#F4A261", xpRequired: 600, description: "Textes complexes, discussion fluide" },
  { id: "C1", label: "C1 — Avancé", color: "#E76F51", xpRequired: 1000, description: "Expression spontanée et précise" },
  { id: "C2", label: "C2 — Maîtrise", color: "#E63946", xpRequired: 1500, description: "Compréhension totale, expression nuancée" },
];

const ALL_BADGES = [
  { id: "first_message", icon: "💬", label: "Premier mot", desc: "Envoyer votre premier message", condition: s => s.messages >= 1 },
  { id: "streak_5", icon: "🔥", label: "En feu !", desc: "5 messages dans une session", condition: s => s.messages >= 5 },
  { id: "streak_20", icon: "⚡", label: "Marathonien", desc: "20 messages envoyés", condition: s => s.messages >= 20 },
  { id: "level_A2", icon: "🥉", label: "Niveau A2", desc: "Atteindre le niveau A2", condition: s => s.xp >= 100 },
  { id: "level_B1", icon: "🥈", label: "Niveau B1", desc: "Atteindre le niveau B1", condition: s => s.xp >= 300 },
  { id: "level_B2", icon: "🥇", label: "Niveau B2", desc: "Atteindre le niveau B2", condition: s => s.xp >= 600 },
  { id: "level_C1", icon: "💎", label: "Niveau C1", desc: "Atteindre le niveau C1", condition: s => s.xp >= 1000 },
  { id: "level_C2", icon: "👑", label: "Maître", desc: "Atteindre le niveau C2", condition: s => s.xp >= 1500 },
  { id: "polyglot", icon: "🌍", label: "Polyglotte", desc: "Pratiquer 3 langues différentes", condition: s => (s.langsUsed || []).length >= 3 },
  { id: "goal_5", icon: "🎯", label: "Déterminé", desc: "Compléter 5 objectifs", condition: s => s.goalsCompleted >= 5 },
  { id: "test_pass", icon: "📝", label: "Testeur", desc: "Réussir un test de positionnement", condition: s => s.testsPassed >= 1 },
];

const EXERCISES_BY_LEVEL = {
  A1: [
    { type: "translate", prompt: "Traduisez : 'Bonjour, comment vous appelez-vous ?'", answer: null },
    { type: "fill", prompt: "Complétez : 'Je ___ (s'appeler) Marie.'", answer: "m'appelle" },
    { type: "choose", prompt: "Choisissez la bonne réponse : 'Comment ___ vous ?'", options: ["allez", "alles", "aller"], answer: "allez" },
  ],
  A2: [
    { type: "translate", prompt: "Traduisez : 'J'habite à Paris depuis deux ans.'", answer: null },
    { type: "fill", prompt: "Complétez : 'Hier, il ___ (pleuvoir) toute la journée.'", answer: "a plu" },
    { type: "choose", prompt: "Quel temps est correct ? 'Hier je ___ au marché.'", options: ["vais", "suis allé", "allais"], answer: "suis allé" },
  ],
  B1: [
    { type: "translate", prompt: "Traduisez : 'If I had more time, I would learn Japanese.'", answer: null },
    { type: "fill", prompt: "Complétez : 'Bien ___ il soit fatigué, il a terminé son travail.'", answer: "que" },
    { type: "choose", prompt: "Choisissez : 'Il faut que vous ___ patient.'", options: ["êtes", "serez", "soyez"], answer: "soyez" },
  ],
  B2: [
    { type: "translate", prompt: "Traduisez une métaphore complexe en contexte formel.", answer: null },
    { type: "fill", prompt: "Complétez : 'À ___ de ses efforts, il n'a pas réussi.'", answer: "défaut" },
    { type: "choose", prompt: "Expression idiomatique : 'Avoir le ___ entre deux chaises'", options: ["pied", "cul", "dos"], answer: "cul" },
  ],
  C1: [
    { type: "translate", prompt: "Reformulez avec une périphrase soutenue : 'Ce texte est ambigu.'", answer: null },
    { type: "fill", prompt: "Complétez : 'Il n'est pas ___ que cette hypothèse soit vraie.'", answer: "certain" },
  ],
  C2: [
    { type: "translate", prompt: "Traduisez un extrait littéraire en préservant le style.", answer: null },
    { type: "fill", prompt: "Complétez avec un registre soutenu : 'Il ___ de souligner que…'", answer: "convient" },
  ],
};

function getCurrentLevel(xp) {
  let current = CEFR_LEVELS[0];
  for (const lvl of CEFR_LEVELS) {
    if (xp >= lvl.xpRequired) current = lvl;
  }
  return current;
}

function getNextLevel(xp) {
  return CEFR_LEVELS.find(l => l.xpRequired > xp) || null;
}

function XPBar({ xp, color }) {
  const current = getCurrentLevel(xp);
  const next = getNextLevel(xp);
  const progress = next ? ((xp - current.xpRequired) / (next.xpRequired - current.xpRequired)) * 100 : 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", fontFamily: "monospace", marginBottom: 4 }}>
        <span style={{ color: current.color, fontWeight: 700 }}>{current.id}</span>
        <span>{xp} XP{next ? ` / ${next.xpRequired}` : " (Max)"}</span>
        {next && <span style={{ color: next.color }}>{next.id}</span>}
      </div>
      <div style={{ background: "#1a1a2e", borderRadius: 6, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, ${current.color}, ${next?.color || current.color})`, borderRadius: 6, transition: "width 0.6s ease", boxShadow: `0 0 8px ${current.color}66` }} />
      </div>
    </div>
  );
}

function BadgeGrid({ stats, earnedIds }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {ALL_BADGES.map(b => {
        const earned = earnedIds.includes(b.id);
        return (
          <div key={b.id} style={{
            background: earned ? `${b.id.includes("level") ? "#FFD16620" : "#4ECDC420"}` : "#1a1a2e",
            border: `1px solid ${earned ? "#FFD16660" : "#2a2a4a"}`,
            borderRadius: 10, padding: "10px 8px", textAlign: "center", opacity: earned ? 1 : 0.35,
            transition: "all 0.3s"
          }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{b.icon}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: earned ? "#e0e0e0" : "#555" }}>{b.label}</div>
            <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>{b.desc}</div>
          </div>
        );
      })}
    </div>
  );
}

function PlacementTest({ lang, onFinish }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [input, setInput] = useState("");

  const questions = [
    { q: `Traduisez en ${lang.name} : "Hello, my name is..."`, type: "text" },
    { q: `Dites en ${lang.name} comment vous avez passé votre week-end.`, type: "text" },
    { q: `En ${lang.name}, expliquez la différence entre passé et futur.`, type: "text" },
    { q: `Rédigez un court paragraphe en ${lang.name} sur un sujet de société.`, type: "text" },
  ];

  const submit = async () => {
    if (!input.trim()) return;
    const newAnswers = [...answers, input.trim()];
    setAnswers(newAnswers);
    setInput("");
    if (step < questions.length - 1) { setStep(s => s + 1); return; }
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 600,
          messages: [{
            role: "user",
            content: `Tu es un examinateur CECRL. Évalue ces 4 réponses en ${lang.name} et donne un niveau A1/A2/B1/B2/C1/C2 précis.
Réponses : ${newAnswers.map((a, i) => `Q${i + 1}: ${a}`).join(" | ")}
Réponds UNIQUEMENT en JSON : {"level":"B1","score":58,"feedback":"Explication courte en français","strengths":["point1","point2"],"improvements":["point1","point2"]}`
          }]
        })
      });
      const data = await res.json();
      const text = data.content[0]?.text || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      setResult(JSON.parse(clean));
    } catch { setResult({ level: "A2", score: 40, feedback: "Évaluation indisponible.", strengths: [], improvements: [] }); }
    setLoading(false);
  };

  if (result) return (
    <div style={{ padding: 20 }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 48 }}>{lang.flag}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: CEFR_LEVELS.find(l => l.id === result.level)?.color || "#4ECDC4", marginTop: 8 }}>{result.level}</div>
        <div style={{ fontSize: 14, color: "#888", marginTop: 4 }}>Score estimé : {result.score}/100</div>
      </div>
      <div style={{ background: "#1a1a2e", borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 13, lineHeight: 1.6, color: "#ccc" }}>{result.feedback}</div>
      {result.strengths?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#4ECDC4", fontFamily: "monospace", marginBottom: 6 }}>✓ POINTS FORTS</div>
          {result.strengths.map((s, i) => <div key={i} style={{ fontSize: 12, color: "#aaa", padding: "3px 0" }}>• {s}</div>)}
        </div>
      )}
      {result.improvements?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#FFD166", fontFamily: "monospace", marginBottom: 6 }}>↑ À AMÉLIORER</div>
          {result.improvements.map((s, i) => <div key={i} style={{ fontSize: 12, color: "#aaa", padding: "3px 0" }}>• {s}</div>)}
        </div>
      )}
      <button onClick={() => onFinish(result.level)} style={{ width: "100%", padding: "12px", background: lang.color, border: "none", borderRadius: 10, color: "#0d0d1a", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
        Appliquer ce niveau et commencer →
      </button>
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontSize: 12, color: "#666", fontFamily: "monospace", marginBottom: 4 }}>TEST DE POSITIONNEMENT — {step + 1}/{questions.length}</div>
      <div style={{ background: "#1a1a2e", borderRadius: 8, height: 4, marginBottom: 16 }}>
        <div style={{ width: `${((step + 1) / questions.length) * 100}%`, height: "100%", background: lang.color, borderRadius: 8, transition: "width 0.3s" }} />
      </div>
      <div style={{ fontSize: 14, color: "#e0e0e0", marginBottom: 14, lineHeight: 1.6 }}>{questions[step].q}</div>
      <textarea value={input} onChange={e => setInput(e.target.value)} rows={4}
        placeholder="Votre réponse..."
        style={{ width: "100%", background: "#0d0d1a", border: `1px solid ${lang.color}50`, borderRadius: 8, padding: "10px 12px", color: "#e0e0e0", fontSize: 13, outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
      <button onClick={submit} disabled={loading || !input.trim()} style={{
        marginTop: 10, width: "100%", padding: "11px", background: input.trim() ? lang.color : "#2a2a4a",
        border: "none", borderRadius: 10, color: "#0d0d1a", fontWeight: 700, cursor: "pointer", fontSize: 13
      }}>
        {loading ? "Analyse en cours…" : step < questions.length - 1 ? "Suivant →" : "Voir mon niveau"}
      </button>
    </div>
  );
}

function ExercisePanel({ lang, cefrLevel, stats }) {
  const exercises = EXERCISES_BY_LEVEL[cefrLevel] || EXERCISES_BY_LEVEL["A1"];
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const ex = exercises[idx];

  const checkAnswer = async () => {
    if (!answer.trim()) return;
    if (ex.type === "choose" || ex.type === "fill") {
      setFeedback({ ok: answer.toLowerCase().trim() === ex.answer?.toLowerCase(), msg: answer.toLowerCase().trim() === ex.answer?.toLowerCase() ? `✓ Correct ! La réponse est bien "${ex.answer}"` : `✗ La bonne réponse était "${ex.answer}"` });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          messages: [{ role: "user", content: `Exercice niveau ${cefrLevel} en ${lang.name}. Consigne: "${ex.prompt}". Réponse de l'apprenant: "${answer}". Évalue brièvement en français (2 phrases max) et dis si c'est correct. JSON: {"ok":true/false,"msg":"feedback"}` }]
        })
      });
      const data = await res.json();
      const text = data.content[0]?.text?.replace(/```json|```/g, "").trim();
      setFeedback(JSON.parse(text));
    } catch { setFeedback({ ok: false, msg: "Impossible d'évaluer pour le moment." }); }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#666", fontFamily: "monospace" }}>EXERCICE {idx + 1}/{exercises.length} — {cefrLevel}</div>
        <div style={{ display: "flex", gap: 4 }}>
          {exercises.map((_, i) => (
            <div key={i} onClick={() => { setIdx(i); setAnswer(""); setFeedback(null); }} style={{ width: 20, height: 20, borderRadius: "50%", background: i === idx ? lang.color : "#2a2a4a", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#0d0d1a", fontWeight: 700 }}>{i + 1}</div>
          ))}
        </div>
      </div>
      <div style={{ background: "#1a1a2e", borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 13, color: "#ccc", lineHeight: 1.6 }}>{ex.prompt}</div>
      {ex.type === "choose" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {ex.options.map(opt => (
            <div key={opt} onClick={() => setAnswer(opt)} style={{
              padding: "10px 14px", borderRadius: 8, border: `1px solid ${answer === opt ? lang.color : "#2a2a4a"}`,
              background: answer === opt ? `${lang.color}20` : "#1a1a2e", cursor: "pointer", fontSize: 13, color: "#e0e0e0"
            }}>{opt}</div>
          ))}
        </div>
      ) : (
        <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={3} placeholder="Votre réponse..."
          style={{ width: "100%", background: "#0d0d1a", border: `1px solid ${lang.color}40`, borderRadius: 8, padding: "10px 12px", color: "#e0e0e0", fontSize: 13, outline: "none", resize: "none", fontFamily: "inherit", marginBottom: 12, boxSizing: "border-box" }} />
      )}
      {feedback && (
        <div style={{ padding: "10px 12px", borderRadius: 8, background: feedback.ok ? "#4ECDC420" : "#FF6B6B20", border: `1px solid ${feedback.ok ? "#4ECDC460" : "#FF6B6B60"}`, fontSize: 13, color: "#e0e0e0", marginBottom: 12 }}>
          {feedback.msg}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={checkAnswer} disabled={loading || !answer.trim()} style={{ flex: 1, padding: "10px", background: answer.trim() ? lang.color : "#2a2a4a", border: "none", borderRadius: 8, color: "#0d0d1a", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
          {loading ? "…" : "Vérifier"}
        </button>
        {feedback && idx < exercises.length - 1 && (
          <button onClick={() => { setIdx(i => i + 1); setAnswer(""); setFeedback(null); }} style={{ flex: 1, padding: "10px", background: "#2a2a4a", border: "none", borderRadius: 8, color: "#e0e0e0", cursor: "pointer", fontSize: 13 }}>
            Suivant →
          </button>
        )}
      </div>
    </div>
  );
}

export default function LanguageTutor() {
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("casual");
  const [feedback, setFeedback] = useState([]);
  const [goals, setGoals] = useState([
    { id: 1, text: "Maîtriser les salutations de base", done: false },
    { id: 2, text: "Apprendre les chiffres 1-100", done: false },
    { id: 3, text: "Vocabulaire alimentaire essentiel", done: false },
  ]);
  const [newGoal, setNewGoal] = useState("");
  const [stats, setStats] = useState({ messages: 0, xp: 0, goalsCompleted: 0, testsPassed: 0, langsUsed: ["es"] });
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [newBadge, setNewBadge] = useState(null);
  const [sidebarTab, setSidebarTab] = useState("chat");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [cefrLevel, setCefrLevel] = useState("A1");
  const messagesEndRef = useRef(null);
  const lang = selectedLang;

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Check badges on stats change
  useEffect(() => {
    ALL_BADGES.forEach(b => {
      if (!earnedBadges.includes(b.id) && b.condition(stats)) {
        setEarnedBadges(prev => [...prev, b.id]);
        setNewBadge(b);
        setTimeout(() => setNewBadge(null), 3500);
      }
    });
  }, [stats]);

  const getSystemPrompt = useCallback(() => {
    const lvl = CEFR_LEVELS.find(l => l.id === cefrLevel);
    return `Tu es un tuteur expert en ${lang.name}, spécialisé niveau CECRL ${cefrLevel} (${lvl?.description}).
Mode : ${mode === "casual" ? "conversation naturelle" : "leçon structurée"}.
Réponds TOUJOURS en ${lang.name} d'abord, puis traduction anglaise en italique sur nouvelle ligne "_(Translation: ...)_".
Corrige les erreurs entre parenthèses : (correction).
Adapte la complexité exactement au niveau ${cefrLevel}.
Après ta réponse ajoute :
---FEEDBACK---
{"type":"success|warning|error|info","text":"feedback court en français"}
---END---`;
  }, [lang, mode, cefrLevel]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input, ts: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: getSystemPrompt(),
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await response.json();
      const raw = data.content?.[0]?.text || "";
      const fMatch = raw.match(/---FEEDBACK---([\s\S]*?)---END---/);
      let newFb = [];
      const cleanText = raw.replace(/---FEEDBACK---[\s\S]*?---END---/, "").trim();
      if (fMatch) fMatch[1].trim().split("\n").filter(Boolean).forEach(l => { try { newFb.push(JSON.parse(l)); } catch {} });
      setFeedback(newFb);
      setMessages(prev => [...prev, { role: "assistant", content: cleanText, ts: Date.now() }]);
      setStats(prev => ({
        ...prev,
        messages: prev.messages + 1,
        xp: prev.xp + (newFb.some(f => f.type === "success") ? 15 : 10),
        langsUsed: [...new Set([...(prev.langsUsed || []), lang.code])]
      }));
      // Auto-update CEFR from XP
      const newXp = stats.xp + (newFb.some(f => f.type === "success") ? 15 : 10);
      setCefrLevel(getCurrentLevel(newXp).id);
      setSidebarTab("chat");
    } catch {}
    setLoading(false);
  };

  const startSession = async () => {
    setMessages([]);
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 250,
          system: getSystemPrompt(),
          messages: [{ role: "user", content: `Démarre la session avec un message de bienvenue adapté au niveau ${cefrLevel}.` }]
        })
      });
      const data = await res.json();
      const cleanText = (data.content?.[0]?.text || "").replace(/---FEEDBACK---[\s\S]*?---END---/, "").trim();
      setMessages([{ role: "assistant", content: cleanText, ts: Date.now() }]);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { startSession(); }, [selectedLang, mode]);

  const formatMessage = (text) => {
    return text.split(/(_\(Translation:.*?\)_)/gs).map((p, i) =>
      p.match(/^_\(Translation:/) ? <em key={i} style={{ color: "#777", fontSize: 12, display: "block", marginTop: 6 }}>{p.slice(1, -1)}</em> : <span key={i}>{p}</span>
    );
  };

  const currentLevel = getCurrentLevel(stats.xp);
  const nextLevel = getNextLevel(stats.xp);

  const SIDEBAR_TABS = [
    { id: "chat", icon: "💬", label: "Retour" },
    { id: "exercises", icon: "📝", label: "Exercices" },
    { id: "badges", icon: "🏆", label: "Badges" },
    { id: "goals", icon: "🎯", label: "Objectifs" },
    { id: "progress", icon: "📊", label: "Progrès" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", color: "#e0e0e0", fontFamily: "Georgia, serif", display: "flex", flexDirection: "column" }}>

      {/* Badge Toast */}
      {newBadge && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 1000,
          background: "linear-gradient(135deg, #1a1a2e, #2a2a4a)",
          border: `2px solid ${lang.color}`, borderRadius: 16, padding: "14px 20px",
          display: "flex", alignItems: "center", gap: 12, boxShadow: `0 8px 32px ${lang.color}44`,
          animation: "slideIn 0.4s ease"
        }}>
          <div style={{ fontSize: 32 }}>{newBadge.icon}</div>
          <div>
            <div style={{ fontSize: 11, color: lang.color, fontFamily: "monospace", marginBottom: 2 }}>BADGE DÉBLOQUÉ !</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{newBadge.label}</div>
            <div style={{ fontSize: 11, color: "#888" }}>{newBadge.desc}</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#0d0d1a", borderBottom: "1px solid #2a2a4a", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 24 }}>🎓</span>
          <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, background: `linear-gradient(90deg, ${lang.color}, #A8DADC)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LinguaAI</div>
        </div>

        {/* Language */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowLangMenu(!showLangMenu)} style={{ background: "#1a1a2e", border: `1px solid ${lang.color}50`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "#e0e0e0", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "monospace" }}>
            {lang.flag} {lang.name} ▼
          </button>
          {showLangMenu && (
            <div style={{ position: "absolute", top: "110%", left: 0, zIndex: 100, background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 32px #00000080", minWidth: 160 }}>
              {LANGUAGES.map(l => (
                <div key={l.code} onClick={() => { setSelectedLang(l); setShowLangMenu(false); setStats(prev => ({ ...prev, langsUsed: [...new Set([...(prev.langsUsed || []), l.code])] })); }}
                  style={{ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, background: l.code === lang.code ? "#2a2a4a" : "transparent", fontSize: 13, fontFamily: "monospace" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#252540"}
                  onMouseLeave={e => e.currentTarget.style.background = l.code === lang.code ? "#2a2a4a" : "transparent"}>
                  {l.flag} {l.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mode */}
        <div style={{ display: "flex", background: "#1a1a2e", borderRadius: 8, border: "1px solid #2a2a4a", overflow: "hidden" }}>
          {["casual", "structured"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: "6px 12px", border: "none", cursor: "pointer", fontSize: 11, fontFamily: "monospace", background: mode === m ? lang.color : "transparent", color: mode === m ? "#0d0d1a" : "#888", fontWeight: mode === m ? 700 : 400 }}>
              {m === "casual" ? "💬 Casual" : "📚 Structuré"}
            </button>
          ))}
        </div>

        {/* CEFR Level */}
        <div style={{ background: `${currentLevel.color}20`, border: `1px solid ${currentLevel.color}50`, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontFamily: "monospace", color: currentLevel.color, fontWeight: 700 }}>
          {currentLevel.id} — {stats.xp} XP
        </div>

        {/* Test Button */}
        <button onClick={() => setShowTest(true)} style={{ background: "#1a1a2e", border: `1px solid ${lang.color}50`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: lang.color, fontSize: 12, fontFamily: "monospace" }}>
          📝 Test de niveau
        </button>

        {/* Badges count */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888", fontFamily: "monospace" }}>
          🏆 {earnedBadges.length}/{ALL_BADGES.length}
        </div>
      </div>

      {/* Test Modal */}
      {showTest && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0f0f20", border: "1px solid #2a2a4a", borderRadius: 16, width: 480, maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #2a2a4a" }}>
              <div style={{ fontFamily: "monospace", fontSize: 13, color: lang.color }}>📝 TEST DE POSITIONNEMENT — {lang.flag} {lang.name}</div>
              <button onClick={() => setShowTest(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 18 }}>×</button>
            </div>
            <PlacementTest lang={lang} onFinish={(level) => {
              setCefrLevel(level);
              setStats(prev => ({ ...prev, testsPassed: prev.testsPassed + 1 }));
              setShowTest(false);
            }} />
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", maxHeight: "calc(100vh - 65px)" }}>
        {/* Chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* XP Bar */}
          <div style={{ padding: "8px 20px", borderBottom: "1px solid #1a1a2e" }}>
            <XPBar xp={stats.xp} color={currentLevel.color} />
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role === "assistant" && (
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${lang.color}, #1a1a2e)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, marginRight: 8, marginTop: 4 }}>{lang.flag}</div>
                )}
                <div style={{ maxWidth: "68%", padding: "11px 14px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: msg.role === "user" ? `linear-gradient(135deg, ${lang.color}cc, ${lang.color}88)` : "#1a1a2e", border: msg.role === "assistant" ? "1px solid #2a2a4a" : "none", fontSize: 13, lineHeight: 1.7 }}>
                  {msg.role === "assistant" ? formatMessage(msg.content) : msg.content}
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 4, textAlign: "right" }}>{new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${lang.color}, #1a1a2e)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{lang.flag}</div>
                <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 16, padding: "12px 16px", display: "flex", gap: 5 }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: lang.color, animation: "bounce 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s`, opacity: 0.7 }} />)}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 20px", borderTop: "1px solid #2a2a4a", background: "#0d0d1a" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder={`Niveau ${cefrLevel} — Écrivez en ${lang.name}…`} rows={2}
                style={{ flex: 1, background: "#1a1a2e", border: `1px solid ${input ? lang.color + "60" : "#2a2a4a"}`, borderRadius: 10, padding: "10px 14px", color: "#e0e0e0", fontSize: 13, resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.5 }} />
              <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ background: input.trim() && !loading ? lang.color : "#2a2a4a", border: "none", borderRadius: 10, width: 44, height: 50, cursor: "pointer", fontSize: 18 }}>→</button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: 300, borderLeft: "1px solid #2a2a4a", background: "#0f0f20", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ display: "flex", borderBottom: "1px solid #2a2a4a", overflowX: "auto" }}>
            {SIDEBAR_TABS.map(t => (
              <button key={t.id} onClick={() => setSidebarTab(t.id)} style={{ flex: 1, padding: "10px 4px", border: "none", cursor: "pointer", background: sidebarTab === t.id ? "#1a1a2e" : "transparent", color: sidebarTab === t.id ? lang.color : "#555", borderBottom: sidebarTab === t.id ? `2px solid ${lang.color}` : "2px solid transparent", fontSize: 10, fontFamily: "monospace", whiteSpace: "nowrap", minWidth: 50 }}>
                <div style={{ fontSize: 14, marginBottom: 1 }}>{t.icon}</div>{t.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
            {sidebarTab === "chat" && (
              <div>
                <div style={{ fontSize: 11, color: "#666", fontFamily: "monospace", marginBottom: 10 }}>RETOUR EN TEMPS RÉEL</div>
                {feedback.length === 0 ? <div style={{ color: "#444", fontSize: 12, textAlign: "center", marginTop: 24 }}>Envoyez un message pour recevoir du retour.</div>
                  : feedback.map((f, i) => {
                    const colors = { success: "#4ECDC4", warning: "#FFD166", error: "#FF6B6B", info: "#A8DADC" };
                    const icons = { success: "✓", warning: "⚠", error: "✗", info: "ℹ" };
                    return (
                      <div key={i} style={{ background: `${colors[f.type]}15`, border: `1px solid ${colors[f.type]}40`, borderLeft: `3px solid ${colors[f.type]}`, borderRadius: 8, padding: "9px 11px", marginBottom: 8, fontSize: 12 }}>
                        <span style={{ color: colors[f.type], fontWeight: 700 }}>{icons[f.type]} </span><span style={{ color: "#e0e0e0" }}>{f.text}</span>
                      </div>
                    );
                  })}
              </div>
            )}

            {sidebarTab === "exercises" && (
              <div>
                <div style={{ fontSize: 11, color: "#666", fontFamily: "monospace", marginBottom: 10 }}>EXERCICES NIVEAU {cefrLevel}</div>
                <ExercisePanel lang={lang} cefrLevel={cefrLevel} stats={stats} />
              </div>
            )}

            {sidebarTab === "badges" && (
              <div>
                <div style={{ fontSize: 11, color: "#666", fontFamily: "monospace", marginBottom: 10 }}>BADGES — {earnedBadges.length}/{ALL_BADGES.length} DÉBLOQUÉS</div>
                <BadgeGrid stats={stats} earnedIds={earnedBadges} />
              </div>
            )}

            {sidebarTab === "goals" && (
              <div>
                <div style={{ fontSize: 11, color: "#666", fontFamily: "monospace", marginBottom: 10 }}>OBJECTIFS</div>
                {goals.map(goal => (
                  <div key={goal.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, padding: "9px 10px", borderRadius: 8, background: goal.done ? `${lang.color}15` : "#1a1a2e", border: `1px solid ${goal.done ? lang.color + "40" : "#2a2a4a"}` }}>
                    <input type="checkbox" checked={goal.done} onChange={() => {
                      setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, done: !g.done } : g));
                      if (!goal.done) setStats(prev => ({ ...prev, goalsCompleted: prev.goalsCompleted + 1 }));
                    }} style={{ marginTop: 2, accentColor: lang.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, lineHeight: 1.4, textDecoration: goal.done ? "line-through" : "none", color: goal.done ? "#666" : "#e0e0e0", flex: 1 }}>{goal.text}</span>
                    <button onClick={() => setGoals(prev => prev.filter(g => g.id !== goal.id))} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 13, flexShrink: 0 }}>×</button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <input value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => e.key === "Enter" && newGoal.trim() && (setGoals(prev => [...prev, { id: Date.now(), text: newGoal.trim(), done: false }]), setNewGoal(""))} placeholder="Nouvel objectif…" style={{ flex: 1, background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 7, padding: "7px 9px", color: "#e0e0e0", fontSize: 12, outline: "none", fontFamily: "inherit" }} />
                  <button onClick={() => { if (newGoal.trim()) { setGoals(prev => [...prev, { id: Date.now(), text: newGoal.trim(), done: false }]); setNewGoal(""); } }} style={{ background: lang.color, border: "none", borderRadius: 7, padding: "7px 11px", color: "#0d0d1a", cursor: "pointer", fontWeight: 700 }}>+</button>
                </div>
              </div>
            )}

            {sidebarTab === "progress" && (
              <div>
                <div style={{ fontSize: 11, color: "#666", fontFamily: "monospace", marginBottom: 10 }}>PROGRESSION CECRL</div>
                {CEFR_LEVELS.map((lvl, i) => {
                  const achieved = stats.xp >= lvl.xpRequired;
                  const isCurrent = currentLevel.id === lvl.id;
                  return (
                    <div key={lvl.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "8px 10px", borderRadius: 8, background: isCurrent ? `${lvl.color}20` : "#1a1a2e", border: `1px solid ${isCurrent ? lvl.color + "60" : achieved ? lvl.color + "30" : "#2a2a4a"}`, opacity: achieved ? 1 : 0.4 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: achieved ? lvl.color : "#2a2a4a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: achieved ? "#0d0d1a" : "#555", flexShrink: 0 }}>{lvl.id}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? lvl.color : "#ccc" }}>{lvl.label}</div>
                        <div style={{ fontSize: 10, color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lvl.description}</div>
                      </div>
                      {achieved && <span style={{ fontSize: 14 }}>✓</span>}
                      {isCurrent && <span style={{ fontSize: 10, color: lvl.color, fontFamily: "monospace" }}>●</span>}
                    </div>
                  );
                })}
                <div style={{ background: "#1a1a2e", borderRadius: 10, padding: 12, marginTop: 12, border: "1px solid #2a2a4a" }}>
                  {[["XP Total", stats.xp], ["Messages", stats.messages], ["Badges", earnedBadges.length + "/" + ALL_BADGES.length], ["Tests réussis", stats.testsPassed], ["Objectifs", goals.filter(g => g.done).length]].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #2a2a4a", fontSize: 12 }}>
                      <span style={{ color: "#888" }}>{k}</span>
                      <span style={{ color: lang.color, fontFamily: "monospace", fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-7px)} }
        @keyframes slideIn { from{transform:translateX(100px);opacity:0} to{transform:translateX(0);opacity:1} }
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#2a2a4a;border-radius:2px}
      `}</style>
    </div>
  );
}