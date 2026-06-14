import { NextResponse } from "next/server";
import { getPlanDay, getRunByDate, getNutritionByDate, getRuns, getNoteByDate } from "@/lib/sheets";

function getBangkokDate(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function getBangkokLabel(): string {
  const now  = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${days[now.getUTCDay()]}, ${months[now.getUTCMonth()]} ${now.getUTCDate()}, ${now.getUTCFullYear()}`;
}

export async function GET() {
  try {
    const today      = getBangkokDate();
    const todayLabel = getBangkokLabel();

    const [plan, run, nutrition, allRuns, note] = await Promise.all([
      getPlanDay(today),
      getRunByDate(today),
      getNutritionByDate(today),
      getRuns(),
      getNoteByDate(today),
    ]);

    const weekNumber  = plan?.week ?? 1;
    const recentRuns  = [...allRuns]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10);

    const lines: string[] = [];

    lines.push(`TODAY: ${todayLabel}`);
    lines.push(`TRAINING WEEK: ${weekNumber} / 24`);
    lines.push(`TRAINING START: March 29, 2026 | RACE: October 2026`);
    lines.push("");

    // Note
    if (note?.note) {
      lines.push(`⚡ ATHLETE NOTE: "${note.note}"`);
      lines.push("");
    }

    // Today's plan
    lines.push("── TODAY'S PLAN ──────────────────────────");
    if (plan) {
      lines.push(`Type:     ${plan.type.toUpperCase()}`);
      lines.push(`Distance: ${plan.distanceKm ?? "rest"} km`);
      lines.push(`Pace:     ${plan.paceTarget ?? "easy"}`);
      lines.push(`Notes:    ${plan.notes}`);
    } else {
      lines.push("No plan found for today.");
    }
    lines.push("");

    // Today's actual run
    lines.push("── TODAY'S ACTUAL RUN ────────────────────");
    if (run) {
      lines.push(`Distance: ${run.distanceKm} km`);
      lines.push(`Pace:     ${run.pacePerKm} /km`);
      lines.push(`Duration: ${Math.floor(run.durationSec / 60)} min`);
      if (run.hrAvg) lines.push(`HR:       ${run.hrAvg} bpm`);
      if (run.notes) lines.push(`Activity: ${run.notes}`);
    } else {
      lines.push("No run logged today.");
    }
    lines.push("");

    // Nutrition
    lines.push("── TODAY'S NUTRITION ─────────────────────");
    if (nutrition.length > 0) {
      nutrition.forEach(n => {
        lines.push(`[${n.time}] ${n.mealType} — ${n.items.join(", ")}`);
        const macros = [
          n.caloriesKcal ? `${n.caloriesKcal}kcal` : null,
          n.carbsG ? `${n.carbsG}g carbs` : null,
          n.proteinG ? `${n.proteinG}g protein` : null,
          n.fluidMl ? `${n.fluidMl}ml fluid` : null,
        ].filter(Boolean).join(" | ");
        if (macros) lines.push(`         ${macros}`);
      });
    } else {
      lines.push("No nutrition logged today.");
    }
    lines.push("");

    // Recent runs
    lines.push("── RECENT RUNS (last 10, oldest → newest) ─");
    if (recentRuns.length > 0) {
      recentRuns.forEach(r => {
        const marker = r.date === today ? " ← TODAY" : "";
        lines.push(`${r.date}${marker}: ${r.distanceKm}km @ ${r.pacePerKm}/km${r.hrAvg ? ` HR${r.hrAvg}` : ""}${r.notes ? ` — ${r.notes}` : ""}`);
      });
    } else {
      lines.push("No recent runs.");
    }
    lines.push("");

    // Training zones
    lines.push("── PACE ZONES ────────────────────────────");
    lines.push("Easy (Tue/Fri): 8:45–9:15/km");
    lines.push("Medium (Thu):   9:00–9:30/km");
    lines.push("Long run (Sun): 9:15–9:45/km");
    lines.push("Race day:       7:00–7:30/km");
    lines.push("");
    lines.push("── SCHEDULE ──────────────────────────────");
    lines.push("Tue: Easy run");
    lines.push("Thu: Medium/easy run");
    lines.push("Fri: Easy run");
    lines.push("Sun: Long run (start 6:00am)");
    lines.push("Mon/Wed/Sat: REST");
    lines.push("");
    lines.push("── RACE INFO ─────────────────────────────");
    lines.push("Race: Amazing Thailand Marathon Bangkok");
    lines.push("Date: November 29, 2026");
    lines.push("Goal: ~5:00 finish (7:00-7:30/km race pace)");

    return NextResponse.json({
      success: true,
      text: lines.join("\n"),
      today,
      weekNumber,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
