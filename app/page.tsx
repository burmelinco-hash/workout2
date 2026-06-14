"use client";
import { useEffect, useState } from "react";
import { format, differenceInDays, parseISO } from "date-fns";
import { TodayData, NutritionEntry } from "@/lib/types";
import ActivityRings from "@/components/ActivityRings";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBangkokDate() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const TYPE_COLOR: Record<string, string> = {
  long:     "var(--blue)",
  easy:     "var(--green)",
  medium:   "var(--orange)",
  tempo:    "var(--orange)",
  interval: "var(--red)",
  rest:     "var(--fill)",
  recovery: "var(--teal)",
  race:     "var(--yellow)",
};

const MEAL_LABEL: Record<string, string> = {
  "pre-run": "Pre-run", "during-run": "During", "post-run": "Post-run", "general": "General",
};

function paceToSec(pace: string): number {
  const [m, s] = pace.split(":").map(Number);
  return m * 60 + (s || 0);
}

function secToPace(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
}

function fmtDuration(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const today     = getBangkokDate();
  const todayDate = parseISO(today);
  const raceDate  = parseISO("2026-11-29");
  const daysLeft  = differenceInDays(raceDate, todayDate);

  const [data, setData]         = useState<any>(null);
  const [weekRuns, setWeekRuns] = useState<any[]>([]);
  const [weekPlan, setWeekPlan] = useState<any[]>([]);
  const [weekPlannedKm, setWeekPlannedKm] = useState(28);
  const [weather, setWeather]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [syncMsg, setSyncMsg]   = useState("");

  // Note to coach
  const [note, setNote]           = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Nutrition
  const [showNutri, setShowNutri]     = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing]     = useState(false);
  const [nutriForm, setNutriForm]     = useState<Partial<NutritionEntry>>({
    mealType: "general", items: [], fluidMl: null, caloriesKcal: null, carbsG: null, proteinG: null, fatG: null,
  });
  const [itemInput, setItemInput]   = useState("");
  const [savingNutri, setSavingNutri] = useState(false);

  // Copied state
  const [copying, setCopying] = useState(false);
  const [copied, setCopied]   = useState(false);

  // RPE
  const [rpeLoading, setRpeLoading] = useState<number | null>(null);

  // Distance edit
  const [editingDistanceId, setEditingDistanceId] = useState<string | null>(null);
  const [distanceInput, setDistanceInput]     = useState("");
  const [savingDistance, setSavingDistance]   = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [todayRes, histRes, noteRes] = await Promise.all([
      fetch(`/api/sheets?type=today&date=${today}`).then(r => r.json()),
      fetch(`/api/sheets?type=history`).then(r => r.json()),
      fetch(`/api/note?date=${today}`).then(r => r.json()),
    ]);
    if (todayRes.success) setData(todayRes);
    if (histRes.success) {
      // Get this week's runs (Week 1 = May 31 – Jun 6)
      const planStart = parseISO("2026-06-01");
      const weekNum   = Math.ceil((differenceInDays(todayDate, planStart) + 1) / 7);
      const weekPlan  = (histRes.plan || []).filter((d: any) => d.week === weekNum);
      const weekDates = weekPlan.map((d: any) => d.date);
      const wr        = (histRes.runs || []).filter((r: any) => weekDates.includes(r.date) && r.distanceKm >= 1);
      setWeekRuns(wr);
      setWeekPlan([...weekPlan].sort((a: any, b: any) => a.date.localeCompare(b.date)));
      const plannedKm = weekPlan.reduce((s: number, d: any) => s + (d.distanceKm ?? 0), 0);
      setWeekPlannedKm(plannedKm || 28);
    }
    if (noteRes.success && noteRes.note?.note) {
      setNote(noteRes.note.note);
      setSavedNote(noteRes.note.note);
    }
    setLoading(false);
  };

  const loadWeather = async () => {
    const res = await fetch("/api/weather").then(r => r.json()).catch(() => null);
    setWeather(res);
  };

  useEffect(() => { loadData(); loadWeather(); }, []);

  const handleSync = async () => {
    setSyncing(true); setSyncMsg("");
    try {
      const r = await fetch("/api/strava/sync", { method: "POST" }).then(r => r.json());
      setSyncMsg(r.message ?? r.error ?? "");
      if (r.success) loadData();
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    await fetch("/api/note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note, date: today }),
    });
    setSavedNote(note);
    setSavingNote(false);
  };

  const handleCopy = async () => {
    setCopying(true);
    const r = await fetch("/api/context").then(r => r.json());
    if (r.success) { await navigator.clipboard.writeText(r.text); setCopied(true); setTimeout(() => setCopied(false), 3000); }
    setCopying(false);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setAnalyzing(true);
    const fd = new FormData(); fd.append("photo", file);
    const r = await fetch("/api/nutrition/analyze", { method: "POST", body: fd }).then(r => r.json());
    if (r.success) setNutriForm(f => ({ ...f, items: r.items??[], caloriesKcal: r.caloriesKcal, carbsG: r.carbsG, proteinG: r.proteinG, fatG: r.fatG, fluidMl: r.fluidMl, mealType: r.mealType??f.mealType, aiAnalyzed: true }));
    setAnalyzing(false);
  };

  const handleSaveNutri = async () => {
    setSavingNutri(true);
    const allItems = itemInput.trim() ? [...(nutriForm.items??[]), itemInput.trim()] : nutriForm.items??[];
    await fetch("/api/nutrition/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...nutriForm, date: today, time: format(new Date(), "HH:mm"), items: allItems }),
    });
    setSavingNutri(false);
    setShowNutri(false);
    setPhotoPreview(null);
    setNutriForm({ mealType: "general", items: [] });
    setItemInput("");
    loadData();
  };

  const handleRpe = async (runId: string, effort: number) => {
    setRpeLoading(effort);
    await fetch("/api/runs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: runId, effort }),
    });
    setRpeLoading(null);
    loadData();
  };

  const handleSaveDistance = async (runId: string) => {
    const km = parseFloat(distanceInput);
    if (!km || km <= 0) return;
    setSavingDistance(true);
    await fetch("/api/runs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: runId, distanceKm: km }),
    });
    setSavingDistance(false);
    setEditingDistanceId(null);
    loadData();
  };

  // ─── Derived data ──────────────────────────────────────────────────────────

  const weekKm     = weekRuns.reduce((s: number, r: any) => s + r.distanceKm, 0);
  const weekKmPlan = weekPlannedKm;

  const validPaces = weekRuns.filter((r: any) => { const t = paceToSec(r.pacePerKm); return t > 0 && t < 1200; });
  const avgPaceSec = validPaces.length
    ? validPaces.reduce((s: number, r: any) => s + paceToSec(r.pacePerKm), 0) / validPaces.length
    : null;

  const runs4week  = Math.min(4, weekRuns.length);

  const rings = [
    {
      value:   Math.min(1, weekKm / weekKmPlan),
      color:   "var(--green)",
      label:   "Distance",
      display: `${weekKm.toFixed(1)} km`,
    },
    {
      value:   avgPaceSec ? Math.max(0, Math.min(1, 1 - (avgPaceSec - 555) / 200)) : 0,
      color:   "var(--teal)",
      label:   "Avg Pace",
      display: avgPaceSec ? secToPace(avgPaceSec) + "/km" : "—",
    },
    {
      value:   runs4week / 4,
      color:   "var(--indigo)",
      label:   "Runs Done",
      display: `${runs4week} / 4`,
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          border: "3px solid rgba(45,212,191,0.2)",
          borderTopColor: "var(--green)",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: 13, color: "rgba(235,235,245,0.62)", fontFamily: "var(--font-dm-mono)" }}>Loading…</span>
      </div>
    </div>
  );

  const plan = data?.plannedDay;
  const runs = data?.runs ?? [];
  const nut  = data?.nutrition ?? [];

  return (
    <div style={{ padding: "0 0 8px" }}>

      {/* ── Sticky Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "14px 20px 10px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 12, fontFamily: "var(--font-dm-mono)", color: "rgba(235,235,245,0.5)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>
            {format(new Date(), "EEE, MMM d")}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--label)" }}>
            Week <span style={{ color: "var(--green)" }}>{data?.weekNumber ?? 1}</span>
            <span style={{ color: "rgba(235,235,245,0.5)", fontWeight: 400 }}> / 26</span>
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            background: "rgba(45,212,191,0.12)",
            border: "1px solid rgba(45,212,191,0.3)",
            color: "var(--green)",
            borderRadius: 20,
            padding: "7px 14px",
            fontSize: 12,
            fontFamily: "var(--font-dm-mono)",
            letterSpacing: 0.5,
            cursor: "pointer",
            opacity: syncing ? 0.5 : 1,
          }}
        >
          {syncing ? "Syncing…" : "⟳ Sync"}
        </button>
      </div>

      {syncMsg && (
        <div style={{ margin: "0 16px", padding: "8px 14px", background: "rgba(45,212,191,0.1)", borderRadius: 10, fontSize: 12, color: "var(--green)", fontFamily: "var(--font-dm-mono)" }}>
          {syncMsg}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 16px" }}>

        {/* ── Activity Rings ── */}
        <div className="card" style={{ padding: "20px 20px 16px" }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-dm-mono)", color: "rgba(235,235,245,0.62)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>
            This Week
          </div>
          <ActivityRings rings={rings} size={130} />
        </div>

        {/* ── Race Countdown ── */}
        <div className="card" style={{
          padding: "14px 18px",
          background: "linear-gradient(135deg, rgba(255,159,10,0.1), rgba(255,55,95,0.08))",
          border: "1px solid rgba(255,159,10,0.2)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-dm-mono)", color: "rgba(235,235,245,0.62)", letterSpacing: 1, textTransform: "uppercase" }}>Race Day</div>
            <div style={{ fontSize: 13, color: "rgba(235,235,245,0.7)", marginTop: 2 }}>Amazing Thailand Marathon</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--orange)", lineHeight: 1 }}>{daysLeft}</div>
            <div style={{ fontSize: 11, color: "rgba(235,235,245,0.62)", fontFamily: "var(--font-dm-mono)" }}>days left</div>
          </div>
        </div>

        {/* ── Weather ── */}
        {weather?.temp !== null && weather?.temp !== undefined && (
          <div className="card" style={{
            padding: "14px 18px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(90,200,245,0.06)", border: "1px solid rgba(90,200,245,0.15)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 26 }}>
                {weather.temp >= 33 ? "🥵" : weather.temp >= 28 ? "☀️" : "⛅"}
              </span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--teal)" }}>
                  {weather.temp}°C · {weather.humidity}%
                </div>
                <div style={{ fontSize: 12, color: "rgba(235,235,245,0.5)", textTransform: "capitalize" }}>{weather.description}</div>
              </div>
            </div>
            {weather.heatAdvice && (
              <div style={{
                background: "rgba(255,55,95,0.12)",
                border: "1px solid rgba(255,55,95,0.25)",
                borderRadius: 8, padding: "5px 10px",
                fontSize: 11, color: "var(--red)", fontFamily: "var(--font-dm-mono)",
                textAlign: "center", maxWidth: 110,
              }}>
                {weather.heatAdvice}
              </div>
            )}
          </div>
        )}

        {/* ── Today's Workout ── */}
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-dm-mono)", color: "rgba(235,235,245,0.62)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
            Today's Plan
          </div>
          {plan ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{
                  background: `${TYPE_COLOR[plan.type] ?? "var(--fill)"}20`,
                  color: TYPE_COLOR[plan.type] ?? "rgba(235,235,245,0.6)",
                  border: `1px solid ${TYPE_COLOR[plan.type] ?? "rgba(255,255,255,0.1)"}50`,
                  borderRadius: 6, padding: "3px 10px",
                  fontSize: 11, fontFamily: "var(--font-dm-mono)",
                  letterSpacing: 0.8, textTransform: "uppercase",
                }}>
                  {plan.type}
                </span>
              </div>
              {plan.distanceKm && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 44, fontWeight: 800, color: "var(--label)", lineHeight: 1 }}>{plan.distanceKm}</span>
                  <span style={{ fontSize: 15, color: "rgba(235,235,245,0.62)" }}>km</span>
                  {plan.paceTarget && (
                    <span style={{ fontSize: 14, color: "rgba(235,235,245,0.5)", marginLeft: 4, fontFamily: "var(--font-dm-mono)" }}>@ {plan.paceTarget}</span>
                  )}
                </div>
              )}
              {plan.notes && (
                <div style={{ fontSize: 13, color: "rgba(235,235,245,0.55)", lineHeight: 1.6, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  {plan.notes}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 14, color: "rgba(235,235,245,0.5)" }}>No plan for today.</div>
          )}
        </div>

        {/* ── This Week's Plan ── */}
        {weekPlan.length > 0 && (
          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-dm-mono)", color: "rgba(235,235,245,0.62)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
              This Week's Plan
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {weekPlan.map((d: any) => {
                const isToday  = d.date === today;
                const isPast   = d.date < today;
                const hasRun   = weekRuns.some((r: any) => r.date === d.date);
                const isRest   = d.type === "rest";
                const missed   = isPast && !isRest && !hasRun;
                return (
                  <div key={d.date} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 10px", borderRadius: 8,
                    background: isToday ? "rgba(45,212,191,0.08)" : "transparent",
                    border: isToday ? "1px solid rgba(45,212,191,0.25)" : "1px solid transparent",
                    opacity: d.date > today ? 0.85 : 1,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        fontSize: 11, fontFamily: "var(--font-dm-mono)", width: 32,
                        color: isToday ? "var(--green)" : "rgba(235,235,245,0.5)",
                        fontWeight: isToday ? 700 : 400,
                      }}>{format(parseISO(d.date), "EEE")}</span>
                      {isRest ? (
                        <span style={{ fontSize: 13, color: "rgba(235,235,245,0.45)" }}>Rest</span>
                      ) : (
                        <>
                          <span style={{
                            fontSize: 11, fontFamily: "var(--font-dm-mono)", textTransform: "uppercase",
                            color: TYPE_COLOR[d.type] ?? "rgba(235,235,245,0.6)",
                            background: `${TYPE_COLOR[d.type] ?? "var(--fill)"}18`,
                            borderRadius: 4, padding: "2px 6px",
                          }}>{d.type}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--label)" }}>
                            {d.distanceKm} km
                          </span>
                          {d.paceTarget && (
                            <span style={{ fontSize: 11, color: "rgba(235,235,245,0.45)", fontFamily: "var(--font-dm-mono)" }}>@ {d.paceTarget}</span>
                          )}
                        </>
                      )}
                    </div>
                    <div>
                      {hasRun && <span style={{ fontSize: 13, color: "var(--green)" }}>✓</span>}
                      {missed && <span style={{ fontSize: 13, color: "var(--red)" }}>✕</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Today's Run ── */}
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-dm-mono)", color: "rgba(235,235,245,0.62)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
            Today's Run
          </div>
          {runs.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {runs.map((run: any, idx: number) => (
              <div key={run.id} style={idx > 0 ? { paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" } : undefined}>
              {runs.length > 1 && (
                <div style={{ fontSize: 12, color: "rgba(235,235,245,0.5)", fontFamily: "var(--font-dm-mono)", marginBottom: 8 }}>
                  {run.notes || `Session ${idx + 1}`}
                </div>
              )}
              {/* Key stats */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginBottom: 14 }}>
                <div>
                  {editingDistanceId === run.id ? (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        value={distanceInput}
                        onChange={e => setDistanceInput(e.target.value)}
                        style={{
                          fontSize: 40, fontWeight: 800, color: "var(--label)", lineHeight: 1,
                          width: 110, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: 8, padding: "2px 6px", fontFamily: "inherit",
                        }}
                      />
                      <span style={{ fontSize: 14, color: "rgba(235,235,245,0.62)" }}>km</span>
                      <button
                        onClick={() => handleSaveDistance(run.id)}
                        disabled={savingDistance}
                        style={{ fontSize: 13, color: "var(--green)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-dm-sans)" }}
                      >{savingDistance ? "Saving…" : "Save"}</button>
                      <button
                        onClick={() => setEditingDistanceId(null)}
                        style={{ fontSize: 13, color: "rgba(235,235,245,0.62)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-dm-sans)" }}
                      >Cancel</button>
                    </div>
                  ) : (
                    <span
                      onClick={() => { setDistanceInput(String(run.distanceKm)); setEditingDistanceId(run.id); }}
                      style={{ cursor: "pointer" }}
                      title="Tap to correct distance"
                    >
                      <span style={{ fontSize: 40, fontWeight: 800, color: "var(--label)", lineHeight: 1 }}>{run.distanceKm}</span>
                      <span style={{ fontSize: 14, color: "rgba(235,235,245,0.62)", marginLeft: 4 }}>km</span>
                      <span style={{ fontSize: 13, color: "rgba(235,235,245,0.5)", marginLeft: 6 }}>✎</span>
                    </span>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: 22, fontWeight: 600, color: "rgba(235,235,245,0.8)", fontFamily: "var(--font-dm-mono)" }}>{run.pacePerKm}</span>
                  <span style={{ fontSize: 12, color: "rgba(235,235,245,0.5)", marginLeft: 3 }}>/km</span>
                </div>
                <div style={{ fontSize: 14, color: "rgba(235,235,245,0.62)" }}>{fmtDuration(run.durationSec)}</div>
              </div>

              {/* Pace zone indicator */}
              {(() => {
                const sec = paceToSec(run.pacePerKm);
                const target = plan?.type === "long" ? { min: 555, max: 645 }
                  : plan?.type === "medium" ? { min: 540, max: 570 }
                  : { min: 525, max: 555 };
                const inZone = sec >= target.min && sec <= target.max;
                const tooFast = sec < target.min;
                return (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: inZone ? "var(--green)" : tooFast ? "var(--red)" : "var(--orange)",
                      }} />
                      <span style={{
                        fontSize: 12, fontFamily: "var(--font-dm-mono)",
                        color: inZone ? "var(--green)" : tooFast ? "var(--red)" : "var(--orange)",
                      }}>
                        {inZone ? "In zone ✓" : tooFast ? `Too fast by ${secToPace(target.min - sec)}/km` : "Slightly slow"}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* RPE */}
              <div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-dm-mono)", color: "rgba(235,235,245,0.55)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                  Rate Effort (RPE)
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      onClick={() => handleRpe(run.id, n)}
                      disabled={rpeLoading !== null}
                      style={{
                        width: 34, height: 34, borderRadius: 8,
                        border: run.effort === n ? "none" : "1px solid rgba(255,255,255,0.1)",
                        background: run.effort === n
                          ? n <= 4 ? "var(--green)" : n <= 7 ? "var(--orange)" : "var(--red)"
                          : "rgba(255,255,255,0.05)",
                        color: run.effort === n ? "#000" : "rgba(235,235,245,0.5)",
                        fontSize: 13, fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 120ms",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "12px 0" }}>
              <div style={{ fontSize: 14, color: "rgba(235,235,245,0.5)" }}>No run logged yet</div>
              <button onClick={handleSync} style={{ fontSize: 13, color: "var(--green)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-dm-sans)" }}>
                Sync from Strava →
              </button>
            </div>
          )}
        </div>

        {/* ── Note to Coach ── */}
        <div className="card" style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-dm-mono)", color: "rgba(235,235,245,0.62)", letterSpacing: 1.5, textTransform: "uppercase" }}>
              Note to Coach
            </div>
            {savedNote && note === savedNote && (
              <span style={{ fontSize: 11, color: "var(--green)", fontFamily: "var(--font-dm-mono)" }}>✓ Saved</span>
            )}
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={'e.g. "Moving Friday run to today — football tomorrow"'}
            rows={2}
            style={{
              width: "100%", background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: "10px 12px",
              color: "var(--label)", fontSize: 13, lineHeight: 1.5,
              fontFamily: "var(--font-dm-sans)",
              resize: "none", outline: "none",
            }}
          />
          <button
            onClick={handleSaveNote}
            disabled={savingNote || note === savedNote}
            style={{
              marginTop: 8, width: "100%",
              background: note !== savedNote ? "var(--green)" : "rgba(255,255,255,0.05)",
              color: note !== savedNote ? "#000" : "rgba(235,235,245,0.5)",
              border: "none", borderRadius: 10, padding: "10px",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              transition: "all 180ms",
            }}
          >
            {savingNote ? "Saving…" : "Save Note"}
          </button>
        </div>

        {/* ── Nutrition ── */}
        <div className="card" style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: nut.length ? 12 : 0 }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-dm-mono)", color: "rgba(235,235,245,0.62)", letterSpacing: 1.5, textTransform: "uppercase" }}>
              Nutrition
            </div>
            <button
              onClick={() => setShowNutri(v => !v)}
              style={{
                background: "rgba(10,132,255,0.12)", border: "1px solid rgba(10,132,255,0.3)",
                color: "var(--blue)", borderRadius: 16, padding: "5px 12px",
                fontSize: 12, fontFamily: "var(--font-dm-mono)", cursor: "pointer",
              }}
            >
              + Log Meal
            </button>
          </div>

          {/* Logged entries */}
          {nut.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: showNutri ? 12 : 0 }}>
              {nut.map((n: any) => (
                <div key={n.id} style={{
                  background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 12px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: "rgba(235,235,245,0.55)", fontFamily: "var(--font-dm-mono)" }}>{n.time}</span>
                    <span style={{ fontSize: 10, background: "rgba(255,255,255,0.06)", borderRadius: 4, padding: "1px 6px", color: "rgba(235,235,245,0.62)", textTransform: "uppercase", letterSpacing: 0.5 }}>{MEAL_LABEL[n.mealType]}</span>
                    {n.aiAnalyzed && <span style={{ fontSize: 10, color: "var(--orange)" }}>AI</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(235,235,245,0.8)", marginBottom: 3 }}>{n.items.join(", ")}</div>
                  <div style={{ display: "flex", gap: 10, fontSize: 11, color: "rgba(235,235,245,0.55)", fontFamily: "var(--font-dm-mono)" }}>
                    {n.caloriesKcal && <span>{n.caloriesKcal}kcal</span>}
                    {n.carbsG && <span>{n.carbsG}g carbs</span>}
                    {n.fluidMl && <span>{n.fluidMl}ml</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Log form */}
          {showNutri && (
            <div style={{ borderTop: nut.length ? "1px solid rgba(255,255,255,0.06)" : "none", paddingTop: nut.length ? 12 : 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Photo */}
              <div>
                <div style={{ fontSize: 11, color: "rgba(235,235,245,0.62)", marginBottom: 6, fontFamily: "var(--font-dm-mono)", textTransform: "uppercase", letterSpacing: 1 }}>📷 Photo (AI auto-fill)</div>
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange}
                  style={{ fontSize: 12, color: "rgba(235,235,245,0.5)", width: "100%" }} />
                {photoPreview && <img src={photoPreview} alt="meal" style={{ marginTop: 8, height: 100, borderRadius: 8, objectFit: "cover" }} />}
                {analyzing && <div style={{ fontSize: 12, color: "var(--orange)", marginTop: 4, fontFamily: "var(--font-dm-mono)" }}>Analyzing…</div>}
              </div>

              {/* Meal type */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["pre-run","during-run","post-run","general"] as const).map(t => (
                  <button key={t} onClick={() => setNutriForm(f => ({ ...f, mealType: t }))}
                    style={{
                      borderRadius: 20, padding: "5px 12px", fontSize: 12, cursor: "pointer",
                      background: nutriForm.mealType === t ? "var(--blue)" : "rgba(255,255,255,0.05)",
                      color: nutriForm.mealType === t ? "#fff" : "rgba(235,235,245,0.62)",
                      border: "1px solid " + (nutriForm.mealType === t ? "transparent" : "rgba(255,255,255,0.1)"),
                    }}
                  >{MEAL_LABEL[t]}</button>
                ))}
              </div>

              {/* Items */}
              <input value={itemInput} onChange={e => setItemInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && itemInput.trim()) { setNutriForm(f => ({ ...f, items: [...(f.items??[]), itemInput.trim()] })); setItemInput(""); }}}
                placeholder="Add food item (press Enter)"
                style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10, padding: "10px 12px", color: "var(--label)", fontSize: 13,
                  fontFamily: "var(--font-dm-sans)", outline: "none", width: "100%",
                }}
              />
              {(nutriForm.items?.length ?? 0) > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {nutriForm.items!.map((item, i) => (
                    <span key={i} style={{
                      background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "3px 10px",
                      fontSize: 12, color: "rgba(235,235,245,0.6)",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {item}
                      <button onClick={() => setNutriForm(f => ({ ...f, items: f.items?.filter((_,j) => j!==i) }))}
                        style={{ background: "none", border: "none", color: "rgba(235,235,245,0.5)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Macros */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {([["Calories (kcal)", "caloriesKcal"], ["Carbs (g)", "carbsG"], ["Protein (g)", "proteinG"], ["Fluid (ml)", "fluidMl"]] as [string, keyof NutritionEntry][]).map(([label, key]) => (
                  <div key={key}>
                    <div style={{ fontSize: 11, color: "rgba(235,235,245,0.5)", marginBottom: 4, fontFamily: "var(--font-dm-mono)" }}>{label}</div>
                    <input type="number"
                      value={(nutriForm[key] as number | null) ?? ""}
                      onChange={e => setNutriForm(f => ({ ...f, [key]: e.target.value ? Number(e.target.value) : null }))}
                      style={{
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8, padding: "8px 10px", color: "var(--label)", fontSize: 14,
                        fontFamily: "var(--font-dm-mono)", outline: "none", width: "100%",
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleSaveNutri} disabled={savingNutri}
                  style={{
                    flex: 1, background: "var(--blue)", color: "#fff", border: "none",
                    borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  }}>
                  {savingNutri ? "Saving…" : "Save"}
                </button>
                <button onClick={() => { setShowNutri(false); setPhotoPreview(null); }}
                  style={{
                    flex: 1, background: "rgba(255,255,255,0.05)", color: "rgba(235,235,245,0.5)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, padding: "12px", fontSize: 14, cursor: "pointer",
                  }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Copy to Coach ── */}
        <button
          onClick={handleCopy}
          disabled={copying}
          style={{
            width: "100%",
            background: copied ? "rgba(45,212,191,0.12)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${copied ? "rgba(45,212,191,0.4)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 14, padding: "16px 20px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            cursor: "pointer", transition: "all 180ms",
          }}
        >
          <span style={{ fontSize: 20 }}>{copied ? "✓" : "⎘"}</span>
          <div>
            <div style={{
              fontSize: 14, fontWeight: 600,
              color: copied ? "var(--green)" : "rgba(235,235,245,0.8)",
            }}>
              {copying ? "Preparing…" : copied ? "Copied! Paste into Coach Marco" : "Copy Today's Context"}
            </div>
            {!copied && (
              <div style={{ fontSize: 11, color: "rgba(235,235,245,0.5)", fontFamily: "var(--font-dm-mono)", marginTop: 2 }}>
                Plan · Run · Nutrition · Notes · Zones
              </div>
            )}
          </div>
        </button>

      </div>
    </div>
  );
}
