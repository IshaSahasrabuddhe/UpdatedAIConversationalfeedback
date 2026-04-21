import api from "./client";
import type {
  AdminConversationDetail,
  AdminConversationRow,
  AdminFeedbackRow,
  AdminUserRow,
  InsightsResponse,
  OverviewAnalytics,
  SentimentByTaskRow,
} from "../types";

function adminHeaders() {
  const token = localStorage.getItem("admin_token");
  return {
    Authorization: `Bearer ${token ?? ""}`,
  };
}

export async function getAdminOverview(): Promise<OverviewAnalytics> {
  const response = await api.get<OverviewAnalytics>("/admin/analytics/overview", { headers: adminHeaders() });
  return response.data;
}

export async function getAdminSentimentByTask(): Promise<SentimentByTaskRow[]> {
  const response = await api.get<SentimentByTaskRow[]>("/admin/analytics/sentiment-by-task", {
    headers: adminHeaders(),
  });
  return response.data;
}

export async function getAdminConversations(): Promise<AdminConversationRow[]> {
  const response = await api.get<AdminConversationRow[]>("/admin/conversations", { headers: adminHeaders() });
  return response.data;
}

export async function getAdminConversationDetail(conversationId: number): Promise<AdminConversationDetail> {
  const response = await api.get<AdminConversationDetail>(`/admin/conversation/${conversationId}`, {
    headers: adminHeaders(),
  });
  return response.data;
}

export async function getAdminFeedbacks(): Promise<AdminFeedbackRow[]> {
  const response = await api.get<AdminFeedbackRow[]>("/admin/feedbacks", { headers: adminHeaders() });
  return response.data;
}

export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const response = await api.get<AdminUserRow[]>("/admin/users", { headers: adminHeaders() });
  return response.data;
}

export async function getAdminInsights(): Promise<InsightsResponse> {
  const response = await api.get<InsightsResponse>("/admin/insights", { headers: adminHeaders() });
  return response.data;
}
