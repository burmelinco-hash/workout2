import { NextRequest, NextResponse } from "next/server";
import { analyzeMealPhoto } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No photo provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mediaType = file.type || "image/jpeg";

    const result = await analyzeMealPhoto(base64, mediaType);

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("Meal analysis error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
