import { NextResponse } from "next/server";
export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  return NextResponse.json({
    hasAnthropicKey: !!key,
    keyLength: key?.length ?? 0,
    keyStart: key?.slice(0, 15) ?? "MISSING",
    keyEnd: key?.slice(-6) ?? "MISSING",
    allKeys: Object.keys(process.env).filter(k => k.includes("ANTHRO") || k.includes("GOOGLE") || k.includes("STRAVA") || k.includes("NEXT")),
  });
}
