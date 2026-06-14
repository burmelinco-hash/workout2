import { NextRequest, NextResponse } from "next/server";
import { generateDailyReview } from "@/lib/claude";
import {
  getPlanDay, getRunByDate, getNutritionByDate,
  getRuns, saveReview, getReviewByDate, getNoteByDate
} from "@/lib/sheets";
import { DailyReview } from "@/lib/types";
import { format } from "date-fns";
import { randomUUID } from "crypto";

// Shared review logic
async function runReview(date: string) {
  const [plannedDay, run, nutrition, allRuns, noteData] = await Promise.all([
    getPlanDay(date),
    getRunByDate(date),
    getNutritionByDate(date),
    getRuns(),
    getNoteByDate(date),
  ]);

  const weekNumber = plannedDay?.week ?? 1;
  const recentRuns = allRuns.filter(r => r.date <= date).slice(-10);

  const result = await generateDailyReview({
    date, plannedDay, run, nutrition, recentRuns, weekNumber,
    athleteNote: noteData?.note || null,
  });

  const review: DailyReview = {
    id:        randomUUID(),
    date,
    summary:   result.summary,
    score:     result.score,
    flags:     result.flags,
    source:    "auto",
    createdAt: new Date().toISOString(),
  };

  await saveReview(review);
  return review;
}

// On-demand POST — body: { date?: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const date = body.date ?? format(new Date(), "yyyy-MM-dd");
    const review = await runReview(date);
    return NextResponse.json({ success: true, review });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Review failed";
    console.error("Review error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// GET — fetch existing review for a date
export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date") ?? format(new Date(), "yyyy-MM-dd");
    const review = await getReviewByDate(date);
    return NextResponse.json({ success: true, review });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Vercel Cron endpoint — GET with header x-vercel-cron
// Cron schedule: 30 20 * * * (20:30 UTC — adjust for your timezone)
export async function cronHandler() {
  const date = format(new Date(), "yyyy-MM-dd");
  return runReview(date);
}
