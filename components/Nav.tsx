"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",         label: "Today",    icon: "◉" },
  { href: "/history",  label: "History",  icon: "◈" },
  { href: "/progress", label: "Progress", icon: "◎" },
];

export default function Nav() {
  const path = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-[#121826]/95 backdrop-blur border-b border-[#2a3447] px-6 py-0">
      <div className="max-w-5xl mx-auto flex items-center justify-between h-14">
        <span className="font-mono text-xs tracking-widest text-[#ff7a18] uppercase">
          26.2
        </span>
        <div className="flex gap-1">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono tracking-widest uppercase transition-all
                ${path === l.href
                  ? "bg-[#ff7a18]/15 text-[#ff7a18] border border-[#ff7a18]/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
            >
              <span>{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
