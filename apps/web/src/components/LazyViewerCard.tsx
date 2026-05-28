"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface LazyViewerCardProps {
  children: ReactNode;
  className?: string;
  rootMargin?: string;
  placeholder?: ReactNode;
}

export function LazyViewerCard({
  children,
  className = "",
  rootMargin = "200px",
  placeholder,
}: LazyViewerCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;
    const node = containerRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setMounted(true);
            observer.disconnect();
            return;
          }
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [mounted, rootMargin]);

  return (
    <div ref={containerRef} className={className}>
      {mounted ? children : (placeholder ?? <ViewerPlaceholder />)}
    </div>
  );
}

function ViewerPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-stone-950">
      <div className="flex flex-col items-center gap-3 opacity-60">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ember-500/20 border-t-ember-500/60" />
        <p className="font-display text-[10px] tracking-widest text-stone-700 uppercase">Waking</p>
      </div>
    </div>
  );
}
