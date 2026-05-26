import { BaseService } from "@/lib/base-service";

export type FeedbackCategory = "product" | "driver" | "staff";
export type FeedbackGranularity = "day" | "week" | "month" | "year";

export type FeedbackInsightItem = {
  label: string;
  count: number;
  score?: number;
};

export type FeedbackSeriesPoint = {
  key: string;
  label: string;
  score: number | null;
  count: number;
  bucketStart: string;
  bucketEnd: string;
  insights: {
    type: "themes" | "drivers" | "staff";
    items: FeedbackInsightItem[];
  };
};

export type ServiceFeedbackEntry = {
  id: string;
  category: FeedbackCategory;
  source: string;
  author_id: string | null;
  author_role: string | null;
  subject_user_id: string | null;
  subject_label: string | null;
  trip_id: string | null;
  stars: number;
  comment: string | null;
  tags: string[];
  is_litige: boolean;
  created_at: string;
};

export type FeedbackAnalyticsResponse = {
  category: FeedbackCategory;
  granularity: FeedbackGranularity;
  series: FeedbackSeriesPoint[];
  entries: ServiceFeedbackEntry[];
  stats: {
    total: number;
    avgScore: number;
    litiges: number;
    lowRatings: number;
  };
};

export class FeedbacksService extends BaseService {
  constructor() {
    super("support-service");
  }

  getAnalytics(
    token: string | null,
    category: FeedbackCategory,
    granularity: FeedbackGranularity,
  ) {
    const qs = new URLSearchParams({ category, granularity });
    return this.get<FeedbackAnalyticsResponse>(`/v1/admin/feedbacks/analytics?${qs}`, token);
  }
}

export const feedbacksService = new FeedbacksService();
