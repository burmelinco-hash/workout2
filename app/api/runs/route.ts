import { NextRequest, NextResponse } from "next/server";
import { getRuns, upsertRun } from "@/lib/sheets";

export async function PATCH(req: NextRequest) {
  try {
    const { id, effort, distanceKm } = await req.json();
    if (!id || (effort === undefined && distanceKm === undefined)) {
      return NextResponse.json({ error: "Missing id and effort/distanceKm" }, { status: 400 });
    }

    const runs = await getRuns();
    const run  = runs.find(r => r.id === id);
    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

    const updated = { ...run };
    if (effort !== undefined) updated.effort = Number(effort);
    if (distanceKm !== undefined) updated.distanceKm = Math.round(Number(distanceKm) * 100) / 100;
    await upsertRun(updated);

    return NextResponse.json({ success: true, run: updated });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
