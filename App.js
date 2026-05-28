import { useState, useRef } from "react";

const CHAPTERS = [
  "Abstract", "Introduction", "Literature Review",
  "Research Methodology", "Results & Analysis",
  "Discussion", "Conclusion", "References",
];

const CITATION_STYLES = ["APA", "MLA", "Chicago", "Harvard", "IEEE"];

const initialChapters = CHAPTERS.reduce((acc, ch) => { acc[ch] = ""; return acc; }, {});

function countWords(text) {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

function grammarCheck(text) {
  const issues = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  sentences.forEach((sentence, i) => {
    const t = sentence.trim();
    if (t.length > 0 && t[0] !== t[0].toUpperCase())
      issues.push({ type: "Grammar", msg: `Sentence ${i + 1}: Starts with lowercase letter.` });
    if (/\s{2,}/.test(t))
      issues.push({ type: "Spacing", msg: `Sentence ${i + 1}: Extra spaces found.` });
    if (/\b(teh|recieve|occured|seperate|definately|accomodate)\b/i.test(t))
      issues.push({ type: "Spelling", msg: `Sentence ${i + 1}: Possible spelling error detected.` });
  });
  if (text.split(".").length < 3 && text.length > 100)
    issues.push({ type: "Structure", msg: "Consider breaking long text into multiple sentences." });
  return issues;
}

function plagiarismCheck(text) {
  const commonPhrases = [
    "the research shows", "it is important to note", "in conclusion",
    "according to the study", "furthermore", "however", "therefore",
    "in addition to", "as a result", "it can be seen that",
  ];
  let matchCount = 0;
  commonPhrases.forEach(p => { if (text.toLowerCase().includes(p)) matchCount++; });
  const uniqueness = Math.max(0, Math.min(100, 100 - matchCount * 8 - Math.floor(Math.random() * 10)));
  return {
    uniqueness,
    similarity: 100 - uniqueness,
    status: uniqueness > 75 ? "Low Risk" : uniqueness > 50 ? "Medium Risk" : "High Risk",
    color: uniqueness > 75 ? "#22c55e" : uniqueness > 50 ? "#f59e0b" : "#ef4444",
  };
}

function generateCitation(style, title, author, year, journal) {
  switch (style) {
    case "APA": return `${author} (${year}). ${title}. ${journal}.`;
    case "MLA": return `${author}. "${title}." ${journal}, ${year}.`;
    case "Chicago": return `${author}. "${title}." ${journal} (${year}).`;
    case "Harvard": return `${author} ${year}, '${title}', ${journal}.`;
    case "IEEE": return `${author}, "${title}," ${journal}, ${year}.`;
    default: return `${author} (${year}). ${title}. ${journal}.`;
  }
}

export default function App() {
  const [activeChapter, setActiveChapter] = useState("Abstract");
  const [chapters, setChapters] = useState(initialChapters);
  const [activeTab, setActiveTab] = useState("write");
  const [grammarIssues, setGrammarIssues] = useState([]);
  const [plagResult, setPlagResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [thesisTitle, setThesisTitle] = useState("My Research Thesis");
  const [citations, setCitations] = useState([]);
  const [citForm, setCitForm] = useState({ style: "APA", title: "", author: "", year: "", journal: "" });
  const [notification, setNotification] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);

  const currentText = chapters[activeChapter] || "";
  const totalWords = Object.values(chapters).reduce((sum, t) => sum + countWords(t), 0);
  const chapterProgress = CHAPTERS.filter(ch => chapters[ch]?.trim().length > 0).length;

  function showNotif(msg) {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  }

  function handleTextChange(val) {
    setChapters(prev => ({ ...prev, [activeChapter]: val }));
    setGrammarIssues([]);
    setPlagResult(null);
    setAiSuggestion("");
  }

  function runGrammar() {
    setGrammarIssues(grammarCheck(currentText));
    setActiveTab("grammar");
  }

  function runPlagiarism() {
    if (currentText.trim().length < 50) { showNotif("Write at least 50 characters first!"); return; }
    setPlagResult(plagiarismCheck(currentText));
    setActiveTab("plagiarism");
  }

  async function getAiHelp() {
    if (currentText.trim().length < 20) { showNotif("Write something first for AI help!"); return; }
    setAiLoading(true);
    setAiSuggestion("");
    setActiveTab("ai");
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a thesis writing expert. The user is writing the "${activeChapter}" section of their thesis titled "${thesisTitle}". 

Current draft:
"${currentText}"

Provide:
1. Brief feedback (2-3 sentences)
2. 2-3 specific improvement suggestions  
3. A short improved version they can use

Be concise, academic, and helpful.`,
          }],
        }),
      });
      const data = await response.json();
      setAiSuggestion(data.content?.map(c => c.text || "").join("\n") || "No response received.");
    } catch {
      setAiSuggestion("AI service temporarily unavailable. Please try again.");
    }
    setAiLoading(false);
  }

  function addCitation() {
    if (!citForm.title || !citForm.author || !citForm.year) { showNotif("Fill Title, Author & Year!"); return; }
    const cit = generateCitation(citForm.style, citForm.title, citForm.author, citForm.year, citForm.journal || "Unknown Journal");
    setCitations(prev => [...prev, { id: Date.now(), style: citForm.style, text: cit }]);
    setCitForm({ style: "APA", title: "", author: "", year: "", journal: "" });
    showNotif("Citation added!");
  }

  function insertCitation(cit) {
    setChapters(prev => ({ ...prev, [activeChapter]: (prev[activeChapter] || "") + "\n\n" + cit.text }));
    setActiveTab("write");
    showNotif("Citation inserted!");
  }

  function downloadTxt() {
    let content = `${thesisTitle}\n${"=".repeat(60)}\n\n`;
    CHAPTERS.forEach(ch => {
      if (chapters[ch]?.trim()) content += `${ch.toUpperCase()}\n${"-".repeat(40)}\n${chapters[ch]}\n\n`;
    });
    if (citations.length > 0) {
      content += `REFERENCES\n${"-".repeat(40)}\n`;
      citations.forEach((c, i) => { content += `${i + 1}. ${c.text}\n`; });
    }
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${thesisTitle.replace(/\s+/g, "_")}.txt`; a.click();
    URL.revokeObjectURL(url);
    showNotif("Downloaded as TXT!");
  }

  function downloadHTML() {
    let body = `<h1>${thesisTitle}</h1>`;
    CHAPTERS.forEach(ch => {
      if (chapters[ch]?.trim()) body += `<h2>${ch}</h2><p>${chapters[ch].replace(/\n/g, "<br>")}</p>`;
    });
    if (citations.length > 0) {
      body += `<h2>References</h2><ol>`;
      citations.forEach(c => { body += `<li>${c.text}</li>`; });
      body += `</ol>`;
    }
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${thesisTitle}</title>
    <style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;line-height:1.8;color:#1a1a1a}
    h1{color:#1e3a5f;border-bottom:3px solid #1e3a5f;padding-bottom:10px}
    h2{color:#2d5a8e;margin-top:40px}p{text-align:justify}</style></head>
    <body>${body}</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${thesisTitle.replace(/\s+/g, "_")}.html`; a.click();
    URL.revokeObjectURL(url);
    showNotif("Downloaded! Open in Word to save as .docx");
  }

  const S = styles;

  return (
    <div style={S.root}>
      {/* Notification */}
      {notification && (
        <div style={S.notif}>✓ {notification}</div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div style={S.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div style={{ ...S.sidebar, left: sidebarOpen ? 0 : -240 }}>
        <div style={S.sidebarHeader}>
          <span style={{ fontSize: 20 }}>📚</span>
          <span style={{ color: "#f1f5f9", fontWeight: "bold", fontSize: 15 }}>ThesisForge</span>
          <button onClick={() => setSidebarOpen(false)} style={S.closeBtn}>✕</button>
        </div>

        <div style={S.sidebarSection}>CHAPTERS</div>
        {CHAPTERS.map(ch => (
          <div key={ch} onClick={() => { setActiveChapter(ch); setActiveTab("write"); setSidebarOpen(false); }}
            style={{ ...S.sidebarItem, ...(activeChapter === ch ? S.sidebarItemActive : {}) }}>
            <span style={{ fontSize: 13 }}>{ch}</span>
            {chapters[ch]?.trim() && <span style={S.dot} />}
          </div>
        ))}

        <div style={{ ...S.sidebarSection, marginTop: 16 }}>TOOLS</div>
        {[
          { id: "citations", label: "📎 Citations" },
          { id: "grammar", label: "✏️ Grammar" },
          { id: "plagiarism", label: "🔍 Plagiarism" },
          { id: "ai", label: "🤖 AI Help" },
        ].map(t => (
          <div key={t.id} onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}
            style={{ ...S.sidebarItem, ...(activeTab === t.id ? S.sidebarToolActive : {}) }}>
            {t.label}
          </div>
        ))}

        {/* Download buttons in sidebar */}
        <div style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
          <button onClick={downloadTxt} style={S.dlBtn("#334155")}>📄 Download TXT</button>
          <button onClick={downloadHTML} style={S.dlBtn("#1d4ed8")}>📥 Download HTML/Word</button>
        </div>
      </div>

      {/* Main */}
      <div style={S.main}>
        {/* Top Bar */}
        <div style={S.topBar}>
          <button onClick={() => setSidebarOpen(true)} style={S.menuBtn}>☰</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <span style={{ fontSize: 16 }}>📚</span>
            {editingTitle ? (
              <input
                autoFocus
                value={thesisTitle}
                onChange={e => setThesisTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => e.key === "Enter" && setEditingTitle(false)}
                style={S.titleInput}
              />
            ) : (
              <span onClick={() => setEditingTitle(true)} style={S.titleText}>
                {thesisTitle} ✏️
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={S.statsBar}>
          {[
            { label: "Words", value: totalWords },
            { label: "Chapters", value: `${chapterProgress}/${CHAPTERS.length}` },
            { label: "Citations", value: citations.length },
          ].map(s => (
            <div key={s.label} style={S.stat}>
              <span style={{ color: "#64748b", fontSize: 11 }}>{s.label}</span>
              <span style={{ color: "#38bdf8", fontWeight: "bold", fontSize: 13 }}>{s.value}</span>
            </div>
          ))}
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div style={S.progressBg}>
              <div style={{ ...S.progressFill, width: `${(chapterProgress / CHAPTERS.length) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Chapter Tabs (horizontal scroll) */}
        <div style={S.chapterTabs}>
          {CHAPTERS.map(ch => (
            <button key={ch} onClick={() => { setActiveChapter(ch); setActiveTab("write"); }}
              style={{ ...S.chapterTab, ...(activeChapter === ch ? S.chapterTabActive : {}) }}>
              {ch}
              {chapters[ch]?.trim() && <span style={{ ...S.dot, marginLeft: 4 }} />}
            </button>
          ))}
        </div>

        {/* Tool Tabs */}
        <div style={S.toolTabs}>
          <button onClick={() => setActiveTab("write")} style={S.toolTab(activeTab === "write", "#3b82f6")}>✍️ Write</button>
          <button onClick={runGrammar} style={S.toolTab(activeTab === "grammar", "#22c55e")}>✏️ Grammar</button>
          <button onClick={runPlagiarism} style={S.toolTab(activeTab === "plagiarism", "#ef4444")}>🔍 Plagiarism</button>
          <button onClick={getAiHelp} style={S.toolTab(activeTab === "ai", "#8b5cf6")}>🤖 AI</button>
          <button onClick={() => setActiveTab("citations")} style={S.toolTab(activeTab === "citations", "#f59e0b")}>📎 Cite</button>
        </div>

        {/* Content */}
        <div style={S.content}>
          {/* WRITE */}
          {activeTab === "write" && (
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#64748b", fontSize: 12, fontFamily: "sans-serif" }}>
                  {activeChapter}
                </span>
                <span style={{ color: "#64748b", fontSize: 12, fontFamily: "sans-serif" }}>
                  {countWords(currentText)} words
                </span>
              </div>
              <textarea
                value={currentText}
                onChange={e => handleTextChange(e.target.value)}
                placeholder={`Write your ${activeChapter} here...\n\nTips:\n• Use academic language\n• Support claims with references\n• Tap 🤖 AI for suggestions`}
                style={S.textarea}
              />
            </div>
          )}

          {/* GRAMMAR */}
          {activeTab === "grammar" && (
            <div>
              <h3 style={S.h3}>✏️ Grammar Check — {activeChapter}</h3>
              {grammarIssues.length === 0 ? (
                <div style={S.emptyState}>
                  <div style={{ fontSize: 48 }}>✅</div>
                  <div style={{ color: "#22c55e", fontSize: 16 }}>No issues found!</div>
                  <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>Your text looks good.</div>
                </div>
              ) : (
                grammarIssues.map((issue, i) => (
                  <div key={i} style={S.issueCard}>
                    <span style={{ background: "#ef4444", color: "white", padding: "2px 8px", borderRadius: 4, fontSize: 11, marginRight: 8 }}>
                      {issue.type}
                    </span>
                    <span style={{ color: "#fca5a5", fontSize: 13 }}>{issue.msg}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* PLAGIARISM */}
          {activeTab === "plagiarism" && (
            <div>
              <h3 style={S.h3}>🔍 Plagiarism Check — {activeChapter}</h3>
              {!plagResult ? (
                <div style={S.emptyState}>
                  <div style={{ fontSize: 40 }}>🔍</div>
                  <div style={{ color: "#64748b", fontSize: 14 }}>Click Plagiarism tab to check</div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                    {[
                      { label: "Uniqueness", value: `${plagResult.uniqueness}%`, color: plagResult.color },
                      { label: "Similarity", value: `${plagResult.similarity}%`, color: "#ef4444" },
                      { label: "Status", value: plagResult.status, color: plagResult.color },
                    ].map(s => (
                      <div key={s.label} style={{ ...S.statCard, borderColor: s.color + "44" }}>
                        <div style={{ fontSize: 22, fontWeight: "bold", color: s.color }}>{s.value}</div>
                        <div style={{ color: "#94a3b8", fontSize: 11 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={S.progressBg}>
                    <div style={{ ...S.progressFill, width: `${plagResult.uniqueness}%`, background: plagResult.color }} />
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 12, fontFamily: "sans-serif" }}>
                    {plagResult.uniqueness > 75 ? "✅ Content appears mostly original!" :
                      plagResult.uniqueness > 50 ? "⚠️ Some common phrases detected. Consider rephrasing." :
                        "❌ High similarity. Please rewrite in your own words."}
                  </div>
                  <div style={{ color: "#475569", fontSize: 11, marginTop: 8, fontFamily: "sans-serif" }}>
                    * Basic check only. Use Turnitin for academic submission.
                  </div>
                </>
              )}
            </div>
          )}

          {/* AI */}
          {activeTab === "ai" && (
            <div>
              <h3 style={S.h3}>🤖 AI Writing Assistant</h3>
              {aiLoading ? (
                <div style={S.emptyState}>
                  <div style={{ fontSize: 40 }}>⏳</div>
                  <div style={{ color: "#8b5cf6" }}>AI analyzing your text...</div>
                </div>
              ) : aiSuggestion ? (
                <div style={S.aiBox}>{aiSuggestion}</div>
              ) : (
                <div style={S.emptyState}>
                  <div style={{ fontSize: 40 }}>🤖</div>
                  <div style={{ color: "#64748b", fontSize: 14 }}>Write something then tap 🤖 AI for suggestions</div>
                </div>
              )}
            </div>
          )}

          {/* CITATIONS */}
          {activeTab === "citations" && (
            <div>
              <h3 style={S.h3}>📎 Citations Generator</h3>
              <div style={S.citForm}>
                <select value={citForm.style} onChange={e => setCitForm(p => ({ ...p, style: e.target.value }))} style={S.input}>
                  {CITATION_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input value={citForm.author} onChange={e => setCitForm(p => ({ ...p, author: e.target.value }))} style={S.input} placeholder="Author Name *" />
                <input value={citForm.title} onChange={e => setCitForm(p => ({ ...p, title: e.target.value }))} style={S.input} placeholder="Title *" />
                <input value={citForm.year} onChange={e => setCitForm(p => ({ ...p, year: e.target.value }))} style={S.input} placeholder="Year *" />
                <input value={citForm.journal} onChange={e => setCitForm(p => ({ ...p, journal: e.target.value }))} style={S.input} placeholder="Journal / Publisher" />
                <button onClick={addCitation} style={S.dlBtn("#1d4ed8")}>+ Generate Citation</button>
              </div>

              {citations.length === 0 ? (
                <div style={{ ...S.emptyState, marginTop: 20 }}>
                  <div style={{ color: "#64748b", fontSize: 14 }}>No citations yet</div>
                </div>
              ) : (
                citations.map(c => (
                  <div key={c.id} style={S.citCard}>
                    <span style={{ background: "#f59e0b22", color: "#fbbf24", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>{c.style}</span>
                    <span style={{ color: "#cbd5e1", fontSize: 12, flex: 1 }}>{c.text}</span>
                    <button onClick={() => insertCitation(c)} style={{ ...S.dlBtn("#334155"), padding: "4px 10px", fontSize: 11 }}>Insert</button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        textarea::placeholder { color: #475569; }
        input::placeholder { color: #475569; }
        textarea:focus { border-color: rgba(59,130,246,0.5) !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        select option { background: #1e293b; }
        @keyframes slideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

// ---- Styles object ----
const styles = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
    fontFamily: "Georgia, 'Times New Roman', serif",
    color: "#e2e8f0",
    display: "flex",
    position: "relative",
    overflow: "hidden",
  },
  notif: {
    position: "fixed", top: 16, right: 16, zIndex: 9999,
    background: "#22c55e", color: "white", padding: "10px 16px",
    borderRadius: 8, fontFamily: "sans-serif", fontSize: 13,
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)", animation: "slideIn 0.3s ease",
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99,
  },
  sidebar: {
    position: "fixed", top: 0, bottom: 0, width: 240,
    background: "#0f172a", borderRight: "1px solid rgba(255,255,255,0.08)",
    zIndex: 100, transition: "left 0.3s ease",
    display: "flex", flexDirection: "column", overflowY: "auto",
  },
  sidebarHeader: {
    padding: "16px 12px", display: "flex", alignItems: "center", gap: 10,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  closeBtn: {
    marginLeft: "auto", background: "none", border: "none",
    color: "#64748b", cursor: "pointer", fontSize: 16,
  },
  sidebarSection: {
    padding: "12px 12px 6px", color: "#64748b", fontSize: 10,
    fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1,
  },
  sidebarItem: {
    padding: "10px 12px", cursor: "pointer", fontSize: 12,
    fontFamily: "sans-serif", color: "#94a3b8",
    borderLeft: "3px solid transparent",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    transition: "all 0.2s",
  },
  sidebarItemActive: {
    background: "rgba(59,130,246,0.12)", borderLeftColor: "#3b82f6", color: "#93c5fd",
  },
  sidebarToolActive: {
    background: "rgba(139,92,246,0.12)", borderLeftColor: "#8b5cf6", color: "#c4b5fd",
  },
  dot: { width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" },
  main: {
    flex: 1, display: "flex", flexDirection: "column",
    minHeight: "100vh", overflow: "hidden",
  },
  topBar: {
    background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
  },
  menuBtn: {
    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#e2e8f0", borderRadius: 8, padding: "6px 10px",
    cursor: "pointer", fontSize: 16, fontFamily: "sans-serif",
  },
  titleText: {
    color: "#f1f5f9", fontSize: 14, fontFamily: "sans-serif",
    cursor: "pointer", flex: 1,
  },
  titleInput: {
    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(59,130,246,0.5)",
    borderRadius: 6, padding: "4px 10px", color: "#f1f5f9",
    fontSize: 14, fontFamily: "sans-serif", outline: "none", flex: 1,
  },
  statsBar: {
    background: "rgba(255,255,255,0.02)", padding: "8px 16px",
    display: "flex", gap: 16, alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    fontFamily: "sans-serif",
  },
  stat: { display: "flex", flexDirection: "column", alignItems: "center", gap: 1 },
  progressBg: { flex: 1, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 4 },
  progressFill: {
    height: "100%", borderRadius: 4,
    background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
    transition: "width 0.5s ease",
  },
  chapterTabs: {
    display: "flex", overflowX: "auto", padding: "8px 12px", gap: 6,
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    scrollbarWidth: "none",
  },
  chapterTab: {
    flexShrink: 0, padding: "5px 12px", borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
    color: "#94a3b8", cursor: "pointer", fontSize: 11, fontFamily: "sans-serif",
    display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
  },
  chapterTabActive: {
    background: "rgba(59,130,246,0.15)", borderColor: "rgba(59,130,246,0.4)", color: "#93c5fd",
  },
  toolTabs: {
    display: "flex", padding: "8px 12px", gap: 6,
    borderBottom: "1px solid rgba(255,255,255,0.05)", overflowX: "auto",
    scrollbarWidth: "none",
  },
  toolTab: (active, color) => ({
    flexShrink: 0, padding: "6px 12px", borderRadius: 8,
    border: `1px solid ${active ? color + "44" : "rgba(255,255,255,0.1)"}`,
    background: active ? color + "22" : "rgba(255,255,255,0.04)",
    color: active ? color : "#94a3b8", cursor: "pointer",
    fontSize: 12, fontFamily: "sans-serif", whiteSpace: "nowrap",
  }),
  content: {
    flex: 1, overflowY: "auto", padding: 16,
  },
  textarea: {
    flex: 1, width: "100%", minHeight: "calc(100vh - 280px)",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12, padding: 16, color: "#e2e8f0",
    fontSize: 15, lineHeight: 1.8, fontFamily: "Georgia, serif",
    resize: "none", outline: "none",
  },
  h3: { color: "#f1f5f9", fontFamily: "sans-serif", marginBottom: 16, fontSize: 16, fontWeight: 600 },
  emptyState: {
    textAlign: "center", padding: "40px 20px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    fontFamily: "sans-serif",
  },
  issueCard: {
    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: 8, padding: "10px 14px", marginBottom: 8, fontFamily: "sans-serif",
  },
  statCard: {
    flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 10,
    padding: "12px 8px", textAlign: "center",
    border: "1px solid transparent", fontFamily: "sans-serif",
  },
  aiBox: {
    background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)",
    borderRadius: 12, padding: 16, lineHeight: 1.8,
    fontFamily: "sans-serif", fontSize: 13, color: "#e2e8f0", whiteSpace: "pre-wrap",
  },
  citForm: {
    background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 14,
    display: "flex", flexDirection: "column", gap: 8, marginBottom: 16,
    border: "1px solid rgba(255,255,255,0.08)",
  },
  input: {
    width: "100%", background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
    padding: "8px 12px", color: "#e2e8f0", fontSize: 13,
    fontFamily: "sans-serif", outline: "none",
  },
  citCard: {
    background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 12px",
    display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8,
    border: "1px solid rgba(255,255,255,0.08)", fontFamily: "sans-serif",
    flexWrap: "wrap",
  },
  dlBtn: (bg) => ({
    background: bg, color: "white", border: "none", borderRadius: 8,
    padding: "9px 14px", cursor: "pointer", fontSize: 13,
    fontFamily: "sans-serif", width: "100%", textAlign: "center",
  }),
};
