import { useState } from "react";

const stages = [
  {
    id: 1,
    name: "Scene Classification",
    file: "vision_pipeline.py",
    fn: "classify_scene()",
    color: "from-violet-600 to-purple-700",
    accent: "violet",
    icon: "🔍",
    problem: "Old code skipped this entirely — every image got the same prompt regardless of content.",
    solution: "A dedicated Gemini call categorises the image into: full_body | half_body | face_only | flat_lay | product_shot | group | no_person | unclear",
    output: `SceneContext {\n  scene_type: "full_body",\n  visibility: "high",\n  lighting: "natural daylight",\n  background: "street",\n  confidence: 0.91,\n  garments_present: ["hoodie","jeans","sneakers"]\n}`,
    why: "Without knowing what you're looking at, you can't pick the right prompt. A flat lay is judged differently from a group photo."
  },
  {
    id: 2,
    name: "Visibility Gate",
    file: "vision_pipeline.py",
    fn: "check_visibility()",
    color: "from-amber-500 to-orange-600",
    accent: "amber",
    icon: "🚦",
    problem: "Old code silently returned garbage for face-only selfies, dark images, or scenes with no person.",
    solution: "Hard gate: blocks analysis if scene_type is no_person / face_only, or if visibility is LOW + confidence < 0.4. Returns a friendly, actionable error message instead.",
    output: `# Blocked:\n(can_analyse=False, reason="face_only")\n→ graceful result returned\n\n# Passed:\n(can_analyse=True, reason="ok")\n→ pipeline continues`,
    why: "Garbage-in, garbage-out. A score of 50 for an empty room is worse than a clear 'show us your fit!' message."
  },
  {
    id: 3,
    name: "Clothing Segmentation",
    file: "vision_pipeline.py",
    fn: "segment_clothing()",
    color: "from-teal-500 to-cyan-600",
    accent: "teal",
    icon: "👕",
    problem: "Old code asked 'what's the outfit like?' in one shot. The model had no structured list of items to reason about.",
    solution: "A focused segmentation prompt extracts every garment item with: category, colour, material, fit, condition. Also extracts dominant_palette and overall_coordination.",
    output: `{\n  "items": [\n    {"category":"top","description":"oversized cream crewneck, cotton, relaxed","condition":"clean"},\n    {"category":"bottom","description":"wide-leg dark olive cargos","condition":"pristine"},\n    {"category":"shoes","description":"white leather low-top sneakers","condition":"clean"}\n  ],\n  "dominant_palette": ["#FFFFF0","#556B2F","#FFFFFF"],\n  "overall_coordination": "well-coordinated earthy tones"\n}`,
    why: "Structured item data forces the deep-analysis prompt to reason about specifics instead of vibes. Strengths/mistakes now reference real garments."
  },
  {
    id: 4,
    name: "Conditional Deep Analysis",
    file: "vision_pipeline.py",
    fn: "deep_analysis()",
    color: "from-rose-500 to-pink-600",
    accent: "rose",
    icon: "🧠",
    problem: "One universal prompt tried to handle full-body, flat lays, product shots, and groups identically. Output was shallow and inconsistent.",
    solution: "Five specialised prompt branches, each injected with the segmentation data as structured context:\n• full_body → holistic proportions + cohesion\n• half_body → partial-visibility caveat\n• flat_lay → curation / mood-board lens\n• product_shot → single-item deep dive (max 80 score)\n• group → collective aesthetic energy",
    output: `{\n  "drip_score": 78,\n  "archetype": "Earthy Streetwear Scholar",\n  "strengths": [\n    "Cream crewneck + olive cargos is a clean earthy palette",\n    "Relaxed silhouette is on-trend and intentional",\n    "White sneakers ground the tonal look perfectly"\n  ],\n  "mistakes": [\n    "No accessories — a subtle chain or cap would elevate"\n  ],\n  "verdict": "TOAST",\n  "commentary": "You're building an outfit, not just wearing clothes. Respect. Add one accessory and this is gallery-worthy."\n}`,
    why: "Context-specific prompts + structured garment input = opinions grounded in what's actually there, not hallucinated guesses."
  },
  {
    id: 5,
    name: "Output Normalisation",
    file: "vision_pipeline.py",
    fn: "normalise_output()",
    color: "from-emerald-500 to-green-600",
    accent: "emerald",
    icon: "✅",
    problem: "Old code had scattered fallbacks and no consistent validation. A parse failure produced a silent 50/Mystery Fashionista default.",
    solution: "Deterministic normalisation layer: clamps drip_score 0-100, sanity-checks verdict vs score (no TOASTing a 20), ensures strengths/mistakes are non-empty lists, appends visibility caveats for partial images.",
    output: `PipelineResult {\n  drip_score: 78,\n  archetype: "Earthy Streetwear Scholar",\n  strengths: [...],  # max 4\n  mistakes: [...],   # max 3\n  verdict: "TOAST",\n  commentary: "...",\n  analysis_mode: "full_body",\n  scene_context: SceneContext {...}\n}`,
    why: "Frontend contract is always honoured. No more silent failures, no contradictory TOAST on a score of 15."
  }
];

const gracefulCases = [
  { trigger: "no_person", score: 0, archetype: "The Invisible Fashionista", note: "Background game is strong though" },
  { trigger: "face_only", score: 0, archetype: "The Portrait", note: "Show us the fit!" },
  { trigger: "no_clothing_visible", score: 0, archetype: "Mystery", note: "Invisible fashion detected" },
  { trigger: "too_occluded", score: 25, archetype: "Shadowy Silhouette", note: "Lighting upgrade needed" },
];

const improvements = [
  { label: "Prompt specificity", before: "1 universal prompt", after: "5 scene-type prompts + 1 segmentation prompt", win: true },
  { label: "JSON robustness", before: "Try/except → silent 50 default", after: "Regex extraction + normalisation layer", win: true },
  { label: "Garment grounding", before: "Model hallucinates item list", after: "Segmentation stage extracts real items first", win: true },
  { label: "Bad image handling", before: "Garbage output (face gets 50/Mystery)", after: "Visibility gate → friendly actionable error", win: true },
  { label: "Verdict consistency", before: "TOAST/ROAST not validated vs score", after: "Sanity check: no TOAST < 40, no ROAST > 75", win: true },
  { label: "API calls per analysis", before: "1 call", after: "3 calls (classify → segment → analyse)", win: false },
  { label: "Latency", before: "~1s", after: "~3-4s (3 sequential Gemini calls)", win: false },
  { label: "Frontend schema", before: "AnalysisData", after: "AnalysisData (unchanged ✓)", win: true },
];

export default function App() {
  const [activeStage, setActiveStage] = useState(null);
  const [tab, setTab] = useState("pipeline");

  const active = stages.find(s => s.id === activeStage);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#0a0a0f", minHeight: "100vh", color: "#e2e8f0", padding: "24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🧠💧</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, background: "linear-gradient(135deg,#a78bfa,#f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Dripcheck Vision Pipeline
          </h1>
          <p style={{ color: "#94a3b8", marginTop: 8, fontSize: 14 }}>
            Multi-stage refactor — click any stage to explore
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28, justifyContent: "center" }}>
          {["pipeline", "graceful", "tradeoffs"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: tab === t ? "linear-gradient(135deg,#7c3aed,#db2777)" : "#1e1e2e",
              color: tab === t ? "#fff" : "#94a3b8", transition: "all 0.2s"
            }}>
              {t === "pipeline" ? "🔬 Pipeline Stages" : t === "graceful" ? "🚦 Graceful Degradation" : "⚖️ Trade-offs"}
            </button>
          ))}
        </div>

        {/* PIPELINE TAB */}
        {tab === "pipeline" && (
          <>
            {/* Stage cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {stages.map((stage, i) => (
                <div key={stage.id}>
                  <div onClick={() => setActiveStage(activeStage === stage.id ? null : stage.id)}
                    style={{
                      background: activeStage === stage.id ? "#1e1e2e" : "#13131f",
                      border: `1px solid ${activeStage === stage.id ? "#7c3aed" : "#2d2d3d"}`,
                      borderRadius: 12, padding: "16px 20px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 16,
                      transition: "all 0.2s"
                    }}>
                    {/* Stage number + icon */}
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                      background: `linear-gradient(135deg,${stage.color.replace("from-","").replace(" to-",",").split(",")[0] === "violet-600" ? "#7c3aed,#6d28d9" : stage.color.includes("amber") ? "#f59e0b,#ea580c" : stage.color.includes("teal") ? "#14b8a6,#0891b2" : stage.color.includes("rose") ? "#f43f5e,#db2777" : "#10b981,#059669"})`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
                    }}>
                      {stage.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>Stage {stage.id}: {stage.name}</span>
                        <code style={{ fontSize: 11, background: "#2d2d3d", padding: "2px 8px", borderRadius: 4, color: "#a78bfa" }}>{stage.fn}</code>
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{stage.file}</div>
                    </div>
                    <div style={{ color: "#64748b", fontSize: 18, transform: activeStage === stage.id ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</div>
                  </div>

                  {/* Expanded detail */}
                  {activeStage === stage.id && (
                    <div style={{ background: "#0f0f1a", border: "1px solid #2d2d3d", borderTop: "none", borderRadius: "0 0 12px 12px", padding: 20 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>❌ Old problem</div>
                          <div style={{ fontSize: 13, color: "#fca5a5", background: "#1a0a0a", padding: 12, borderRadius: 8, border: "1px solid #7f1d1d" }}>{stage.problem}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>✅ New solution</div>
                          <div style={{ fontSize: 13, color: "#86efac", background: "#0a1a0a", padding: 12, borderRadius: 8, border: "1px solid #14532d", whiteSpace: "pre-line" }}>{stage.solution}</div>
                        </div>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>📤 Sample output</div>
                        <pre style={{ background: "#090912", border: "1px solid #2d2d3d", borderRadius: 8, padding: 14, fontSize: 12, color: "#7dd3fc", margin: 0, overflowX: "auto", whiteSpace: "pre-wrap" }}>{stage.output}</pre>
                      </div>
                      <div style={{ background: "#1e1830", border: "1px solid #4c1d95", borderRadius: 8, padding: 12 }}>
                        <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700 }}>💡 WHY THIS MATTERS: </span>
                        <span style={{ fontSize: 13, color: "#c4b5fd" }}>{stage.why}</span>
                      </div>
                    </div>
                  )}

                  {/* Connector arrow */}
                  {i < stages.length - 1 && (
                    <div style={{ textAlign: "center", color: "#4b5563", fontSize: 20, lineHeight: 1.2 }}>↓</div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* GRACEFUL DEGRADATION TAB */}
        {tab === "graceful" && (
          <div>
            <div style={{ background: "#13131f", border: "1px solid #2d2d3d", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 8px", color: "#f8fafc", fontSize: 15 }}>When the Visibility Gate blocks analysis</h3>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>
                Instead of returning a silent 50/Mystery score, the pipeline returns a tailored, actionable response for each failure mode.
                All responses are still valid <code style={{ background: "#2d2d3d", padding: "1px 6px", borderRadius: 4, color: "#a78bfa" }}>AnalysisData</code> — the frontend never breaks.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {gracefulCases.map(c => (
                <div key={c.trigger} style={{ background: "#13131f", border: "1px solid #2d2d3d", borderRadius: 12, padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <code style={{ fontSize: 12, background: "#2d2d3d", padding: "3px 8px", borderRadius: 4, color: "#fbbf24" }}>{c.trigger}</code>
                    <span style={{ fontSize: 20, fontWeight: 700, color: c.score === 0 ? "#ef4444" : "#f59e0b" }}>{c.score}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#e2e8f0", marginBottom: 6 }}>{c.archetype}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>{c.note}</div>
                  <div style={{ marginTop: 10, padding: "6px 10px", background: "#1a0a2e", borderRadius: 6, fontSize: 11, color: "#a78bfa" }}>
                    verdict: ROAST — but with a helpful call-to-action
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRADE-OFFS TAB */}
        {tab === "tradeoffs" && (
          <div style={{ background: "#13131f", border: "1px solid #2d2d3d", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1e1e2e" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Dimension</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "#ef4444", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Before</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "#22c55e", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>After</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontSize: 12, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Win?</th>
                </tr>
              </thead>
              <tbody>
                {improvements.map((item, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #2d2d3d", background: i % 2 === 0 ? "transparent" : "#0f0f1a" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, fontSize: 13, color: "#e2e8f0" }}>{item.label}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#fca5a5" }}>{item.before}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#86efac" }}>{item.after}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 18 }}>{item.win ? "✅" : "⚠️"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: 16, borderTop: "1px solid #2d2d3d", background: "#1e1830" }}>
              <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700 }}>⚠️ LATENCY NOTE: </span>
              <span style={{ fontSize: 12, color: "#c4b5fd" }}>
                3 sequential Gemini calls adds ~2-3s. To mitigate: run classify + segment concurrently with <code style={{ background: "#2d2d3d", padding: "1px 5px", borderRadius: 3 }}>asyncio.gather()</code>, or cache scene classification results by image hash.
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 32, padding: 16, background: "#13131f", borderRadius: 10, border: "1px solid #2d2d3d", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Files delivered: <code style={{ color: "#a78bfa" }}>vision_pipeline.py</code> (new) · <code style={{ color: "#a78bfa" }}>ai.py</code> (updated) · Frontend schema unchanged ✓
          </div>
        </div>
      </div>
    </div>
  );
}
