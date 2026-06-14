"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Run } from "@/lib/types";

interface WeeklyStat { week: number; planned: number; actual: number; runsLogged: number; avgPaceSec: number | null; }

function secToPace(sec: number | null) {
  if (!sec || sec <= 0) return "—";
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
}

const TOOLTIP_COLOR: Record<string, string> = {
  Planned: "rgba(235,235,245,0.62)",
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1C1C1E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", fontSize: 12, fontFamily: "monospace" }}>
      <div style={{ color: "var(--orange)", marginBottom: 4 }}>Week {label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: TOOLTIP_COLOR[p.name] ?? p.color }}>
          {p.name}: {p.name === "Pace" ? secToPace(p.value) : `${p.value?.toFixed(1)}km`}
        </div>
      ))}
    </div>
  );
};

export default function ProgressPage() {
  const [stats, setStats] = useState<WeeklyStat[]>([]);
  const [runs, setRuns]   = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sheets?type=progress").then(r => r.json()).then(d => {
      if (d.success) { setStats(d.weeklyStats); setRuns(d.runs); }
      setLoading(false);
    });
  }, []);

  const validRuns = runs.filter(r => r.distanceKm >= 1);
  const activeStats = stats.filter(s => s.actual > 0);

  // Personal Records
  const longestRun  = validRuns.length ? validRuns.reduce((a, b) => a.distanceKm > b.distanceKm ? a : b) : null;
  const fastestPace = validRuns.length
    ? validRuns.reduce((a, b) => {
        const pa = a.pacePerKm.split(":").map(Number);
        const pb = b.pacePerKm.split(":").map(Number);
        const sa = pa[0]*60+(pa[1]||0), sb = pb[0]*60+(pb[1]||0);
        return sa < sb ? a : b;
      }) : null;
  const totalKm  = validRuns.reduce((s, r) => s + r.distanceKm, 0);
  const totalRuns = validRuns.length;

  const validPaces = validRuns.filter(r => { const p = r.pacePerKm.split(":").map(Number); const t = p[0]*60+(p[1]||0); return t > 0 && t < 1200; });
  const avgPaceSec = validPaces.length
    ? validPaces.reduce((s, r) => { const p = r.pacePerKm.split(":").map(Number); return s + p[0]*60+(p[1]||0); }, 0) / validPaces.length
    : null;

  // Best week
  const bestWeek = activeStats.length ? activeStats.reduce((a, b) => a.actual > b.actual ? a : b) : null;

  // Long runs
  const longRuns = validRuns.filter(r => r.distanceKm >= 10).sort((a, b) => a.date.localeCompare(b.date)).map((r, i) => ({ label: `LR${i+1}`, dist: r.distanceKm, date: r.date }));

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
      }}>
        <div style={{ fontSize: 12, fontFamily: "var(--font-dm-mono)", color: "rgba(235,235,245,0.62)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>Analytics</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Progress</div>
        <div style={{ fontSize: 12, color: "rgba(235,235,245,0.55)", marginTop: 1 }}>Mar 29, 2026 – Nov 29, 2026 · 26 weeks</div>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Summary row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Total km",    value: totalKm.toFixed(1),    unit: "km",   color: "var(--green)" },
            { label: "Total runs",  value: String(totalRuns),      unit: "runs", color: "var(--blue)" },
            { label: "Avg pace",    value: secToPace(avgPaceSec),  unit: "/km",  color: "var(--orange)" },
            { label: "Longest",     value: longestRun ? `${longestRun.distanceKm}` : "—", unit: "km", color: "var(--red)" },
          ].map(c => (
            <div key={c.label} className="card" style={{ padding: "16px 16px" }}>
              <div style={{ fontSize: 10, fontFamily: "var(--font-dm-mono)", color: "rgba(235,235,245,0.55)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: 12, color: "rgba(235,235,245,0.5)", marginTop: 2, fontFamily: "var(--font-dm-mono)" }}>{c.unit}</div>
            </div>
          ))}
        </div>

        {/* Personal Records */}
        <div className="card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-dm-mono)", color: "rgba(235,235,245,0.62)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>
            🏆 Personal Records
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {longestRun && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, color: "rgba(235,235,245,0.62)", fontFamily: "var(--font-dm-mono)", marginBottom: 2 }}>Longest Run</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--blue)" }}>{longestRun.distanceKm} <span style={{ fontSize: 14, fontWeight: 400, color: "rgba(235,235,245,0.62)" }}>km</span></div>
                </div>
                <div style={{ fontSize: 12, color: "rgba(235,235,245,0.5)", fontFamily: "var(--font-dm-mono)", textAlign: "right" }}>
                  {longestRun.date}<br/>{longestRun.pacePerKm}/km
                </div>
              </div>
            )}
            {fastestPace && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div style={{ fontSize: 12, color: "rgba(235,235,245,0.62)", fontFamily: "var(--font-dm-mono)", marginBottom: 2 }}>Fastest Pace</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--green)" }}>{fastestPace.pacePerKm} <span style={{ fontSize: 14, fontWeight: 400, color: "rgba(235,235,245,0.62)" }}>/km</span></div>
                </div>
                <div style={{ fontSize: 12, color: "rgba(235,235,245,0.5)", fontFamily: "var(--font-dm-mono)", textAlign: "right" }}>
                  {fastestPace.date}<br/>{fastestPace.distanceKm}km
                </div>
              </div>
            )}
            {bestWeek && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div style={{ fontSize: 12, color: "rgba(235,235,245,0.62)", fontFamily: "var(--font-dm-mono)", marginBottom: 2 }}>Best Week</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--orange)" }}>{bestWeek.actual.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 400, color: "rgba(235,235,245,0.62)" }}>km</span></div>
                </div>
                <div style={{ fontSize: 12, color: "rgba(235,235,245,0.5)", fontFamily: "var(--font-dm-mono)", textAlign: "right" }}>
                  Week {bestWeek.week}<br/>{bestWeek.runsLogged} runs
                </div>
              </div>
            )}
          </div>
        </div>

        {activeStats.length > 0 && (
          <>
            {/* Weekly volume */}
            <div className="card" style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-dm-mono)", color: "rgba(235,235,245,0.62)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>
                Weekly Volume
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={activeStats} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: "rgba(235,235,245,0.45)", fontSize: 10, fontFamily: "monospace" }} tickLine={false} axisLine={false} tickFormatter={v => `W${v}`} />
                  <YAxis tick={{ fill: "rgba(235,235,245,0.45)", fontSize: 10, fontFamily: "monospace" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="planned" name="Planned" fill="rgba(255,255,255,0.06)" radius={[4,4,0,0]} />
                  <Bar dataKey="actual"  name="Actual"  fill="var(--green)" radius={[4,4,0,0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pace trend */}
            <div className="card" style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-dm-mono)", color: "rgba(235,235,245,0.62)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
                Pace Trend
              </div>
              <div style={{ fontSize: 11, color: "rgba(235,235,245,0.45)", marginBottom: 14, fontFamily: "var(--font-dm-mono)" }}>
                Target easy: 8:45–9:15/km · Lower = faster
              </div>
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={activeStats.filter(s => s.avgPaceSec)}>
                  <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: "rgba(235,235,245,0.45)", fontSize: 10, fontFamily: "monospace" }} tickLine={false} axisLine={false} tickFormatter={v => `W${v}`} />
                  <YAxis domain={["auto","auto"]} tick={{ fill: "rgba(235,235,245,0.45)", fontSize: 10, fontFamily: "monospace" }} tickLine={false} axisLine={false} tickFormatter={v => secToPace(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={525} stroke="rgba(45,212,191,0.3)" strokeDasharray="3 3" />
                  <ReferenceLine y={555} stroke="rgba(45,212,191,0.15)" strokeDasharray="3 3" />
                  <Line dataKey="avgPaceSec" name="Pace" stroke="var(--blue)" strokeWidth={2} dot={{ fill: "var(--blue)", r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Long run progression */}
            {longRuns.length > 0 && (
              <div className="card" style={{ padding: "16px 18px" }}>
                <div style={{ fontSize: 11, fontFamily: "var(--font-dm-mono)", color: "rgba(235,235,245,0.62)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
                  Long Run Progression
                </div>
                <div style={{ fontSize: 11, color: "rgba(235,235,245,0.45)", marginBottom: 14, fontFamily: "var(--font-dm-mono)" }}>Target peak: 32km</div>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={longRuns}>
                    <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "rgba(235,235,245,0.45)", fontSize: 10, fontFamily: "monospace" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "rgba(235,235,245,0.45)", fontSize: 10, fontFamily: "monospace" }} tickLine={false} axisLine={false} domain={[0,35]} />
                    <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} contentStyle={{ background: "#1C1C1E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12, fontFamily: "monospace" }} />
                    <ReferenceLine y={32} stroke="rgba(255,159,10,0.4)" strokeDasharray="3 3" />
                    <Bar dataKey="dist" name="km" fill="var(--blue)" radius={[4,4,0,0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
