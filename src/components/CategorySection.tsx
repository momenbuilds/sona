import { ReactNode } from "react";
import { CategoryScore } from "@/lib/types";

interface CategorySectionProps {
  categoryScore: CategoryScore;
  children: ReactNode;
}

function pillTone(status: string): string {
  switch (status) {
    case "Stable":
      return "bg-emerald-50 text-emerald-700";
    case "Slightly different":
      return "bg-amber-50 text-amber-700";
    case "Different":
    case "Notably different":
      return "bg-orange-50 text-orange-700";
    default:
      return "bg-neutral-100 text-muted";
  }
}

export default function CategorySection({ categoryScore, children }: CategorySectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-foreground">{categoryScore.label}</h3>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${pillTone(
            categoryScore.status
          )}`}
        >
          {categoryScore.score !== null && (
            <span className="font-semibold">{categoryScore.score}</span>
          )}
          {categoryScore.status}
        </span>
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {children}
      </div>
    </section>
  );
}
