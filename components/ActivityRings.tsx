"use client";

interface Ring {
  value: number;   // 0–1
  color: string;
  label: string;
  display: string; // text shown below ring
}

interface Props {
  rings: Ring[];
  size?: number;
}

function SingleRing({ ring, radius, cx, cy, strokeWidth }: {
  ring: Ring; radius: number; cx: number; cy: number; strokeWidth: number;
}) {
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, ring.value));
  const dashOffset = circumference * (1 - progress);

  return (
    <g>
      {/* Track */}
      <circle cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={ring.color}
        strokeOpacity={0.15}
        strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <circle cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={ring.color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1)" }}
      />
      {/* End cap glow */}
      {progress > 0.02 && (
        <circle
          cx={cx + radius * Math.cos((2 * Math.PI * progress) - Math.PI / 2)}
          cy={cy + radius * Math.sin((2 * Math.PI * progress) - Math.PI / 2)}
          r={strokeWidth / 2}
          fill={ring.color}
        />
      )}
    </g>
  );
}

export default function ActivityRings({ rings, size = 140 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const gap = 8;
  const strokeWidth = 12;
  const outerRadius = (size - strokeWidth) / 2;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      {/* SVG rings */}
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        {rings.map((ring, i) => (
          <SingleRing
            key={i}
            ring={ring}
            radius={outerRadius - i * (strokeWidth + gap)}
            cx={cx}
            cy={cy}
            strokeWidth={strokeWidth}
          />
        ))}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rings.map((ring, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: ring.color, flexShrink: 0,
            }} />
            <div>
              <div style={{
                fontSize: 12,
                color: "rgba(235,235,245,0.6)",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                fontFamily: "var(--font-dm-mono, monospace)",
              }}>
                {ring.label}
              </div>
              <div style={{
                fontSize: 16,
                fontWeight: 700,
                color: ring.color,
                lineHeight: 1.2,
              }}>
                {ring.display}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
