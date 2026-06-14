import { NextRequest, NextResponse } from "next/server";
import { addNutritionEntry, getNutritionByDate } from "@/lib/sheets";
import { NutritionEntry } from "@/lib/types";
import { format } from "date-fns";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const today = format(new Date(), "yyyy-MM-dd");

    const entry: NutritionEntry = {
      id:           randomUUID(),
      date:         body.date ?? today,
      time:         body.time ?? format(new Date(), "HH:mm"),
      mealType:     body.mealType ?? "general",
      items:        body.items ?? [],
      caloriesKcal: body.caloriesKcal ?? null,
      carbsG:       body.carbsG ?? null,
      proteinG:     body.proteinG ?? null,
      fatG:         body.fatG ?? null,
      fluidMl:      body.fluidMl ?? null,
      photoUrl:     body.photoUrl ?? null,
      aiAnalyzed:   body.aiAnalyzed ?? false,
    };

    await addNutritionEntry(entry);

    return NextResponse.json({ success: true, entry });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to log nutrition";
    console.error("Nutrition log error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date") ?? format(new Date(), "yyyy-MM-dd");
    const entries = await getNutritionByDate(date);
    return NextResponse.json({ success: true, entries });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch nutrition";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
