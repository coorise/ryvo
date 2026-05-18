"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { notificationService } from "@/services/notification.service";
import { useAuth } from "./use-auth";

export function useNotifications() {
  const { accessToken, isReady } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", "inbox", accessToken],
    queryFn: () => notificationService.getInbox(accessToken),
    enabled: isReady && Boolean(accessToken),
    refetchInterval: 45_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationService.markRead(accessToken, id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications", "inbox"] }),
  });

  const unread = (query.data?.notifications ?? []).filter((n) => !n.read_at).length;

  return { ...query, unread, markRead };
}
