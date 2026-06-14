import { apiRequest } from "@/lib/api-client";

export type DriverPublicProfile = {
  profile: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    rating_avg: number;
    trip_count: number;
    kyc_status: string;
    active_vehicle_id: string | null;
  };
  reviews: Array<{ stars: number; comment: string | null; created_at: string; reviewer_id: string }>;
  active_vehicle: Record<string, unknown> | null;
};

export function getDriverPublicProfile(token: string | null, userId: string) {
  return apiRequest<{ profile: DriverPublicProfile["profile"]; reviews: DriverPublicProfile["reviews"]; active_vehicle: DriverPublicProfile["active_vehicle"] }>(
    "profile-service",
    `/v1/driver/${userId}/public`,
    { token },
  );
}
