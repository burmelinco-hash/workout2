import { NextRequest, NextResponse } from "next/server";
import { getNoteByDate, saveNote } from "@/lib/sheets";

function getBangkokDate(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date") ?? getBangkokDate();
    const note = await getNoteByDate(date);
    return NextResponse.json({ success: true, note });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { note, date } = await req.json();
    const today = date ?? getBangkokDate();
    await saveNote({ date: today, note: note ?? "", updatedAt: new Date().toISOString() });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
