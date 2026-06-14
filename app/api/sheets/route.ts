import { NextRequest, NextResponse } from "next/server";
import {
  getPlan, getRuns, getNutritionByDate,
  getReviewByDate
} from "@/lib/sheets";
import { format, differenceInDays, parseISO } from "date-fns";

const TRAINING_START = "2026-06-01"; // Monday — Week 1 of 26-week plan
const TOTAL_DAYS     = 182;          // 26 weeks
const RACE_DATE      = "Amazing Thailand Marathon Bangkok — Nov 29, 2026";

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type");
    const date = req.nextUrl.searchParams.get("date") ?? format(new Date(), "yyyy-MM-dd");

    if (type === "today") {
      const [plan, runs, nutrition, review] = await Promise.all([
        import("@/lib/sheets").then(m => m.getPlanDay(date)),
        import("@/lib/sheets").then(m => m.getRunsByDate(date)),
        getNutritionByDate(date),
        getReviewByDate(date),
      ]);

      const dayNumber    = differenceInDays(parseISO(date), parseISO(TRAINING_START)) + 1;
      const weekNumber   = Math.ceil(dayNumber / 7);
      const completedDays = Math.max(0, Math.min(TOTAL_DAYS, dayNumber));

      return NextResponse.json({
        success: true,
        plannedDay:    plan,
        runs,
        nutrition,
        review,
        weekNumber:    Math.max(1, Math.min(26, weekNumber)),
        totalWeeks:    26,
        completedDays,
        totalDays:     TOTAL_DAYS,
        raceDate:      RACE_DATE,
      });
    }

    if (type === "history") {
      const [runs, plan] = await Promise.all([getRuns(), getPlan()]);
      return NextResponse.json({ success: true, runs, plan });
    }

    if (type === "progress") {
      const [runs, plan] = await Promise.all([getRuns(), getPlan()]);

      // Build weekly stats (26 weeks)
      const weeklyStats = Array.from({ length: 26 }, (_, i) => {
        const week = i + 1;
        const weekPlan = plan.filter(d => d.week === week);
        const weekDates = weekPlan.map(d => d.date);
        const weekRuns  = runs.filter(r => weekDates.includes(r.date));
        const planned   = weekPlan.reduce((s, d) => s + (d.distanceKm ?? 0), 0);
        const actual    = weekRuns.reduce((s, r) => s + r.distanceKm, 0);
        const avgPace   = weekRuns.length
          ? weekRuns.reduce((s, r) => {
              const [m, sec] = r.pacePerKm.split(":").map(Number);
              return s + m * 60 + sec;
            }, 0) / weekRuns.length
          : null;
        return { week, planned, actual, runsLogged: weekRuns.length, avgPaceSec: avgPace };
      });

      return NextResponse.json({ success: true, weeklyStats, runs });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed";
    console.error("Sheets API error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
