import type { ReactNode } from "react";

interface InsightCarouselProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function InsightCarousel({ title, subtitle, children }: InsightCarouselProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/65 p-4 shadow lg:p-6">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{title}</p>
        {subtitle ? <p className="mt-2 text-sm text-slate-300">{subtitle}</p> : null}
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4 scroll-smooth">{children}</div>
      </div>
    </section>
  );
}
