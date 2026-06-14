import { NextResponse } from "next/server";
import { fetchRecentActivities, stravaActivityToRun } from "@/lib/strava";
import { upsertRun, getRuns } from "@/lib/sheets";
import { subDays } from "date-fns";

export async function POST() {
  try {
    // Sync last 90 days (covers the full training period start)
    const after = subDays(new Date(), 90);
    const activities = await fetchRecentActivities(after);

    let synced = 0;
    for (const activity of activities) {
      const run = stravaActivityToRun(activity);
      await upsertRun(run);
      synced++;
    }

    return NextResponse.json({
      success: true,
      synced,
      message: `Synced ${synced} run${synced !== 1 ? "s" : ""} from Strava`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("Strava sync error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
