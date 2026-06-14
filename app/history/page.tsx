"use client";
import { useEffect, useState } from "react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, differenceInDays } from "date-fns";
import { Run } from "@/lib/types";

const TYPE_COLOR: Record<string, string> = {
  long: "var(--blue)", easy: "var(--green)", medium: "var(--orange)",
  tempo: "var(--orange)", interval: "var(--red)", rest: "transparent",
  recovery: "var(--teal)", race: "var(--yellow)",
};

function fmtDur(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function calcStreak(runs: Run[], date: Date): number {
  const runDates = new Set(runs.map(r => r.date));
  let streak = 0, d = new Date(date);
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (runDates.has(key)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

export default function HistoryPage() {
  const [runs, setRuns]     = useState<Run[]>([]);
  const [plan, setPlan]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [runsOpen, setRunsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/sheets?type=history").then(r => r.json()).then(d => {
      if (d.success) { setRuns(d.runs); setPlan(d.plan); }
      setLoading(false);
    });
  }, []);

  const today    = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const runDates = new Set(runs.filter(r => r.distanceKm >= 1).map(r => r.date));
  const planMap  = Object.fromEntries(plan.map(d => [d.date, d]));
  const streak   = calcStreak(runs.filter(r => r.distanceKm >= 1), parseISO(today));

  const monthStart = startOfMonth(viewDate);
  const monthEnd   = endOfMonth(viewDate);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad to start on Monday
  const startPad = (monthStart.getDay() + 6) % 7;
  const paddedDays = [...Array(startPad).fill(null), ...days];

  const selectedRun  = selectedDay ? runs.find(r => r.date === selectedDay) : null;
  const selectedPlan = selectedDay ? planMap[selectedDay] : null;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ fontSize: 13, color: "rgba(235,235,245,0.5)", fontFamily: "var(--font-dm-mono)" }}>Loading…</div>
    </div>
  );

  return (
    <div style={{ padding: "0 0 8px" }}>

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "14px 20px 10px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 12, fontFamily: "var(--font-dm-mono)", color: "rgba(235,235,245,0.62)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>Training Log</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>History</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {streak > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "rgba(255,159,10,0.12)", border: "1px solid rgba(255,159,10,0.25)",
              borderRadius: 20, padding: "5px 12px",
            }}>
              <span style={{ fontSize: 16 }}>🔥</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--orange)" }}>{streak}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Month navigator */}
        <div className="card" style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button
              onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              style={{ background: "none", border: "none", color: "var(--blue)", fontSize: 20, cursor: "pointer", padding: "0 4px" }}
            >‹</button>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{format(viewDate, "MMMM yyyy")}</div>
            <button
              onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              disabled={viewDate >= new Date()}
              style={{ background: "none", border: "none", color: "var(--blue)", fontSize: 20, cursor: "pointer", opacity: viewDate >= new Date() ? 0.3 : 1, padding: "0 4px" }}
            >›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
            {["M","T","W","T","F","S","S"].map((d, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 11, color: "rgba(235,235,245,0.45)", fontWeight: 600, fontFamily: "var(--font-dm-mono)", padding: "2px 0" }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            {paddedDays.map((day, i) => {
              if (!day) return <div key={i} />;
              const dateStr   = day.toISOString().slice(0, 10);
              const hasRun    = runDates.has(dateStr);
              const dayPlan   = planMap[dateStr];
              const isToday   = dateStr === today;
              const isFuture  = dateStr > today;
              const isSelected = dateStr === selectedDay;
              const planType  = dayPlan?.type;
              const isRunDay  = planType && planType !== "rest";
              const missed    = isRunDay && !hasRun && !isFuture;

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(s => s === dateStr ? null : dateStr)}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 10,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    border: isToday ? "2px solid var(--green)" : isSelected ? "2px solid var(--blue)" : "1px solid rgba(255,255,255,0.04)",
                    background: hasRun
                      ? `${TYPE_COLOR[planType ?? "easy"] ?? "var(--green)"}25`
                      : missed ? "rgba(255,55,95,0.06)"
                      : "rgba(255,255,255,0.02)",
                    cursor: "pointer",
                    opacity: isFuture ? 0.3 : 1,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? "var(--green)" : isFuture ? "rgba(235,235,245,0.45)" : "rgba(235,235,245,0.7)" }}>
                    {day.getDate()}
                  </span>
                  {/* Dot indicator */}
                  {(hasRun || missed) && (
                    <div style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: hasRun ? (TYPE_COLOR[planType ?? "easy"] ?? "var(--green)") : "rgba(255,55,95,0.4)",
                      marginTop: 1,
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
            {[
              { color: "var(--green)", label: "Easy" },
              { color: "var(--blue)", label: "Long" },
              { color: "var(--orange)", label: "Medium" },
              { color: "rgba(255,55,95,0.4)", label: "Missed" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
                <span style={{ fontSize: 11, color: "rgba(235,235,245,0.55)", fontFamily: "var(--font-dm-mono)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="card" style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 13, color: "rgba(235,235,245,0.62)", fontFamily: "var(--font-dm-mono)", marginBottom: 10 }}>
              {format(parseISO(selectedDay), "EEEE, MMM d")}
            </div>
            {selectedPlan && (
              <div style={{ marginBottom: selectedRun ? 12 : 0 }}>
                <span style={{
                  background: `${TYPE_COLOR[selectedPlan.type] ?? "var(--fill)"}20`,
                  color: TYPE_COLOR[selectedPlan.type] ?? "rgba(235,235,245,0.5)",
                  borderRadius: 6, padding: "2px 8px", fontSize: 11,
                  fontFamily: "var(--font-dm-mono)", textTransform: "uppercase", letterSpacing: 0.8,
                }}>
                  Plan: {selectedPlan.type} {selectedPlan.distanceKm ? `${selectedPlan.distanceKm}km` : ""}
                </span>
              </div>
            )}
            {selectedRun ? (
              <div>
                <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                  <div>
                    <span style={{ fontSize: 32, fontWeight: 800, color: "var(--label)" }}>{selectedRun.distanceKm}</span>
                    <span style={{ fontSize: 13, color: "rgba(235,235,245,0.62)", marginLeft: 3 }}>km</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-dm-mono)", color: "rgba(235,235,245,0.6)", fontSize: 16 }}>{selectedRun.pacePerKm}/km</div>
                  <div style={{ fontSize: 13, color: "rgba(235,235,245,0.62)" }}>{fmtDur(selectedRun.durationSec)}</div>
                </div>
                {selectedRun.hrAvg && <div style={{ fontSize: 12, color: "rgba(235,235,245,0.62)", marginTop: 4, fontFamily: "var(--font-dm-mono)" }}>HR {selectedRun.hrAvg} bpm</div>}
                {selectedRun.effort && <div style={{ fontSize: 12, color: "rgba(235,235,245,0.62)", fontFamily: "var(--font-dm-mono)" }}>RPE {selectedRun.effort}/10</div>}
              </div>
            ) : selectedPlan?.type !== "rest" ? (
              <div style={{ fontSize: 13, color: "rgba(255,55,95,0.6)", marginTop: 6 }}>No run logged — missed session</div>
            ) : (
              <div style={{ fontSize: 13, color: "rgba(235,235,245,0.5)", marginTop: 6 }}>Rest day</div>
            )}
          </div>
        )}

        {/* Recent runs list */}
        <div className="card" style={{ overflow: "hidden" }}>
          <button
            onClick={() => setRunsOpen(o => !o)}
            style={{
              width: "100%", padding: "14px 18px 10px",
              borderTop: "none", borderLeft: "none", borderRight: "none",
              borderBottom: runsOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
              background: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 11, fontFamily: "var(--font-dm-mono)", color: "rgba(235,235,245,0.62)", letterSpacing: 1.5, textTransform: "uppercase" }}>
              All Runs · {runs.filter(r => r.distanceKm >= 1).length} total
            </div>
            <span style={{
              fontSize: 14, color: "rgba(235,235,245,0.5)",
              transform: runsOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 200ms",
            }}>▾</span>
          </button>
          {runsOpen && <div>
            {[...runs].filter(r => r.distanceKm >= 1).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map((r, i) => {
              const p = planMap[r.date];
              return (
                <div key={r.id} style={{
                  padding: "12px 18px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: "rgba(235,235,245,0.55)", fontFamily: "var(--font-dm-mono)", marginBottom: 3 }}>{r.date}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "var(--label)" }}>{r.distanceKm} km</span>
                      <span style={{ fontSize: 13, color: "rgba(235,235,245,0.5)", fontFamily: "var(--font-dm-mono)" }}>{r.pacePerKm}/km</span>
                    </div>
                    {r.notes && <div style={{ fontSize: 12, color: "rgba(235,235,245,0.5)", marginTop: 2 }}>{r.notes}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {p && p.type !== "rest" && (
                      <div style={{
                        fontSize: 10, fontFamily: "var(--font-dm-mono)", textTransform: "uppercase",
                        color: TYPE_COLOR[p.type] ?? "var(--green)",
                        background: `${TYPE_COLOR[p.type] ?? "var(--green)"}15`,
                        borderRadius: 4, padding: "2px 6px", marginBottom: 4,
                      }}>{p.type}</div>
                    )}
                    <div style={{ fontSize: 12, color: "rgba(235,235,245,0.55)", fontFamily: "var(--font-dm-mono)" }}>{fmtDur(r.durationSec)}</div>
                    {r.effort && <div style={{ fontSize: 11, color: "rgba(235,235,245,0.5)", fontFamily: "var(--font-dm-mono)" }}>RPE {r.effort}</div>}
                  </div>
                </div>
              );
            })}
          </div>}
        </div>
      </div>
    </div>
  );
}
