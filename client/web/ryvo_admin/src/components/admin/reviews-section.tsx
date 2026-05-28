"use client";

import { useTranslation } from "react-i18next";

import { StarRating } from "@/components/admin/star-rating";
import { UI } from "@/configs/const";
import { formatTimestamp } from "@/lib/format-date";

export type ReviewItem = {
  id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string | null;
};

type ReviewsSectionProps = {
  reviews: ReviewItem[];
};

export function ReviewsSection({ reviews }: ReviewsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="border-border bg-card rounded-3xl border p-6">
      <p className="mb-4 text-lg font-bold">{t("drivers.reviewsFromClients")}</p>
      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="border-border rounded-xl border p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{r.reviewer_name ?? t("profile.anonymous")}</p>
              <span className="text-muted-foreground text-xs">{formatTimestamp(r.created_at)}</span>
            </div>
            <StarRating value={r.stars} max={UI.maxRatingStars} />
            {r.comment && <p className="text-muted-foreground mt-2 text-sm">{r.comment}</p>}
          </div>
        ))}
        {!reviews.length && (
          <p className="text-muted-foreground text-center text-sm">{t("common.noData")}</p>
        )}
      </div>
    </div>
  );
}
