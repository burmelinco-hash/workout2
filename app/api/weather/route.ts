import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.OPENWEATHER_API_KEY;

  if (!key) {
    return NextResponse.json({
      temp: null, humidity: null, description: "Add OPENWEATHER_API_KEY to .env.local",
      icon: "01d", heatAdvice: null,
    });
  }

  try {
    const res  = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Bangkok,TH&units=metric&appid=${key}`,
      { next: { revalidate: 1800 } } // cache 30 min
    );
    const data = await res.json();

    const temp     = Math.round(data.main?.temp ?? 0);
    const humidity = data.main?.humidity ?? 0;
    const desc     = data.weather?.[0]?.description ?? "";
    const icon     = data.weather?.[0]?.icon ?? "01d";

    // Heat advice for running
    let heatAdvice: string | null = null;
    if (temp >= 33) heatAdvice = `+60s/km · start before 6AM`;
    else if (temp >= 30) heatAdvice = `+45s/km to all zones`;
    else if (temp >= 27) heatAdvice = `+30s/km · hydrate well`;

    return NextResponse.json({ temp, humidity, description: desc, icon, heatAdvice });
  } catch {
    return NextResponse.json({ temp: null, humidity: null, description: "Unavailable", icon: "01d", heatAdvice: null });
  }
}
