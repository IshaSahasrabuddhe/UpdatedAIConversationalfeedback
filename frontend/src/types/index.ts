export type ConversationState =
  | "START"
  | "ASK_FEEDBACK"
  | "PRE_FEEDBACK_ANALYSIS"
  | "ISSUE_DETECTION"
  | "ISSUE_HANDLING"
  | "CLASSIFY_INTENT"
  | "ASK_RATING"
  | "HANDLE_VAGUE_RATING"
  | "POSITIVE_FLOW"
  | "NEGATIVE_FLOW"
  | "NEUTRAL_FLOW"
  | "ANALYZE_FEEDBACK"
  | "CLASSIFY_ISSUE_TYPE"
  | "STORE_FEEDBACK"
  | "FEEDBACK_CONTINUE"
  | "END";

export type TaskType = "text" | "image" | "audio" | "video" | "document";

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface AdminLoginResponse {
  success: boolean;
  role?: string | null;
  token?: string | null;
  message?: string | null;
}

export interface ConversationMetadata {
  task_type: TaskType | null;
  prompt: string;
  ai_output: string;
  ai_output_file_url: string;
  is_locked: boolean;
}

export interface ConversationSummary {
  id: number;
  title: string;
  state: ConversationState;
  created_at: string;
  task_type?: TaskType | null;
}

export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ConversationHistory {
  conversation_id: number;
  state: ConversationState;
  messages: Message[];
  context?: Record<string, unknown>;
  metadata: ConversationMetadata;
}

export interface ChatResponse {
  conversation_id: number;
  state: ConversationState;
  assistant_message: string;
  context: Record<string, unknown>;
  metadata: ConversationMetadata;
}

export interface CreateConversationResponse {
  conversation_id: number;
  state: ConversationState;
  assistant_message: string;
}

export interface AdminConversationRow {
  conversation_id: number;
  user_id: number;
  task_type: TaskType | null;
  sentiment: string;
  rating: number | null;
  issue_type: string;
  created_at: string;
}

export interface AdminFeedbackSummary {
  feedback_id: number | null;
  rating: number | null;
  sentiment: string | null;
  positives: string[];
  negatives: string[];
  suggestions: string[];
  issue_type: string | null;
  issue_tags: string[];
  raw_text: string;
  summary: string;
  created_at: string | null;
}

export interface AdminMessageRow {
  id: number;
  conversation_id: number;
  user_id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AdminConversationDetail {
  conversation: {
    id: number;
    user_id: number;
    state: ConversationState;
    title: string;
    created_at: string;
    task_type: TaskType | null;
    prompt: string;
    ai_output: string;
    ai_output_file_url?: string;
  };
  messages: AdminMessageRow[];
  feedback: AdminFeedbackSummary;
}

export interface AdminFeedbackRow {
  feedback_id: number;
  conversation_id: number;
  user_id: number;
  rating: number | null;
  sentiment: string;
  issue_type: string;
  issue_tags: string[];
  summary: string;
  created_at: string;
}

export interface AdminUserRow {
  user_id: number;
  email: string;
  total_conversations: number;
  created_at: string;
}

export interface OverviewAnalytics {
  total_conversations: number;
  avg_rating: number;
  sentiment_distribution: Record<string, number>;
  task_type_distribution: Record<string, number>;
  top_issue_tags: string[];
  rating_distribution: Array<{ rating: number; count: number }>;
  sentiment_trend: Array<{ date: string; positive: number; negative: number; mixed: number }>;
  task_usage_trend: Array<{ date: string; text: number; image: number; audio: number; video: number; document: number }>;
}

export interface SentimentByTaskRow {
  task_type: string;
  positive: number;
  negative: number;
  mixed: number;
}

export interface InsightsResponse {
  summary: string;
  top_problems: string[];
  improvement_suggestions: string[];
  task_type_breakdown: Record<
    string,
    {
      count: number;
      avg_rating: number;
      sentiment: Record<string, number>;
      top_issues: string[];
    }
  >;
  issue_type_distribution: Record<string, number>;
  top_issue_tags: string[];
  top_issue_tag_counts: Array<{ tag: string; count: number }>;
}
