"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/",
    label: "Today",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L3 9v13h6v-7h6v7h6V9L12 2z"
          fill={active ? "var(--green)" : "none"}
          stroke={active ? "var(--green)" : "#636366"}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "History",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="3"
          stroke={active ? "var(--blue)" : "#636366"} strokeWidth="1.8"/>
        <path d="M3 9h18" stroke={active ? "var(--blue)" : "#636366"} strokeWidth="1.8"/>
        <path d="M8 2v3M16 2v3" stroke={active ? "var(--blue)" : "#636366"} strokeWidth="1.8" strokeLinecap="round"/>
        <rect x="7" y="13" width="3" height="3" rx="1" fill={active ? "var(--blue)" : "#636366"} opacity={active ? 1 : 0.6}/>
        <rect x="14" y="13" width="3" height="3" rx="1" fill={active ? "var(--blue)" : "#636366"} opacity={active ? 1 : 0.6}/>
      </svg>
    ),
  },
  {
    href: "/progress",
    label: "Progress",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M4 20h16" stroke={active ? "var(--orange)" : "#636366"} strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M4 20V14l4-4 4 4 4-6 4 2"
          stroke={active ? "var(--orange)" : "#636366"} strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const path = usePathname();

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      background: "rgba(28,28,30,0.85)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      paddingBottom: "env(safe-area-inset-bottom, 8px)",
    }}>
      <div style={{
        maxWidth: 430, margin: "0 auto",
        display: "flex", alignItems: "stretch",
      }}>
        {tabs.map(t => {
          const active = path === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                padding: "10px 0",
                textDecoration: "none",
                transition: "opacity 120ms",
              }}
            >
              {t.icon(active)}
              <span style={{
                fontSize: 10,
                fontFamily: "var(--font-dm-sans, sans-serif)",
                fontWeight: 500,
                letterSpacing: 0.2,
                color: active
                  ? (t.href === "/" ? "var(--green)" : t.href === "/history" ? "var(--blue)" : "var(--orange)")
                  : "#636366",
              }}>
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
