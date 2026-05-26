"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const DEV_NAV = [
  { href: "/dev", label: "Overview" },
  { href: "/dev/architecture", label: "Architecture" },
  { href: "/dev/visual-pipeline", label: "Visual Pipeline" },
  { href: "/dev/netcode", label: "Netcode" },
  { href: "/dev/roadmap", label: "Roadmap" },
];

export default function DevLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pt-20 pb-12 lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full shrink-0 lg:w-56">
        <div className="sticky top-24">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Developer Portal
          </h2>
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {DEV_NAV.map((link) => {
              const isActive =
                link.href === "/dev"
                  ? pathname === "/dev"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-stone-800 text-orange-400"
                      : "text-stone-400 hover:bg-stone-900 hover:text-stone-200"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Content */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
