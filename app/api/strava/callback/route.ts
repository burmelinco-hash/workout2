import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const res = await axios.post("https://www.strava.com/oauth/token", {
      client_id:     process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    });

    const { access_token, refresh_token, expires_at } = res.data;

    // Show the tokens to copy into .env — only needed once
    return new NextResponse(`
      <html><body style="font-family:monospace;padding:40px;background:#0f172a;color:#f1f5f9">
        <h2 style="color:#ff7a18">✅ Strava Connected!</h2>
        <p>Add these to your <code>.env.local</code> and Vercel environment variables:</p>
        <pre style="background:#1e293b;padding:20px;border-radius:8px;margin-top:20px">
STRAVA_ACCESS_TOKEN=${access_token}
STRAVA_REFRESH_TOKEN=${refresh_token}
STRAVA_EXPIRES_AT=${expires_at}
        </pre>
        <p style="margin-top:20px;color:#94a3b8">Then restart the dev server. You can close this page.</p>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });
  } catch (err) {
    console.error("Strava callback error:", err);
    return NextResponse.json({ error: "Token exchange failed" }, { status: 500 });
  }
}
