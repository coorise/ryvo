import { Star } from "lucide-react";

import { UI } from "@/configs/const";
import { cn } from "@/lib/utils";

type StarRatingProps = {
  value: number;
  max?: number;
  className?: string;
};

export function StarRating({ value, max = UI.maxRatingStars, className }: StarRatingProps) {
  const rounded = Math.round(Math.min(max, Math.max(0, value)) * 10) / 10;
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`${rounded} / ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={cn("size-4", i < Math.round(rounded) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")}
        />
      ))}
      <span className="text-muted-foreground ml-1 text-sm">{rounded.toFixed(1)}</span>
    </div>
  );
}
