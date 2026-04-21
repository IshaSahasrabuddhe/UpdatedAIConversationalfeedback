import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getAdminConversations,
  getAdminFeedbacks,
  getAdminInsights,
  getAdminOverview,
  getAdminSentimentByTask,
  getAdminUsers,
} from "../api/admin";
import InsightCarousel from "../components/InsightCarousel";
import { useAuth } from "../context/AuthContext";
import type {
  AdminConversationRow,
  AdminFeedbackRow,
  AdminUserRow,
  InsightsResponse,
  OverviewAnalytics,
  SentimentByTaskRow,
  TaskType,
} from "../types";

type AdminTab = "Dashboard" | "Conversations" | "Feedbacks" | "Users" | "Insights";

const TABS: AdminTab[] = ["Dashboard", "Conversations", "Feedbacks", "Users", "Insights"];
const TASK_TYPES: TaskType[] = ["text", "image", "audio", "video", "document"];
const PIE_COLORS = ["#22d3ee", "#38bdf8", "#60a5fa"];
const TASK_COLORS: Record<TaskType, string> = {
  text: "#22d3ee",
  image: "#38bdf8",
  audio: "#0ea5e9",
  video: "#60a5fa",
  document: "#2563eb",
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { logoutAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("Dashboard");
  const [overview, setOverview] = useState<OverviewAnalytics | null>(null);
  const [sentimentByTask, setSentimentByTask] = useState<SentimentByTaskRow[]>([]);
  const [conversations, setConversations] = useState<AdminConversationRow[]>([]);
  const [feedbacks, setFeedbacks] = useState<AdminFeedbackRow[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedFeedback, setExpandedFeedback] = useState<number | null>(null);

  useEffect(() => {
    void hydrate();
  }, []);

  async function hydrate() {
    setLoading(true);
    try {
      const [overviewData, sentimentData, conversationsData, feedbacksData, usersData, insightsData] = await Promise.all([
        getAdminOverview(),
        getAdminSentimentByTask(),
        getAdminConversations(),
        getAdminFeedbacks(),
        getAdminUsers(),
        getAdminInsights(),
      ]);
      setOverview(overviewData);
      setSentimentByTask(sentimentData);
      setConversations(conversationsData);
      setFeedbacks(feedbacksData);
      setUsers(usersData);
      setInsights(insightsData);
    } catch {
      logoutAdmin();
      navigate("/login?mode=admin");
    } finally {
      setLoading(false);
    }
  }

  const positivePercent = useMemo(() => {
    if (!overview?.total_conversations) {
      return 0;
    }
    const positive = overview.sentiment_distribution.positive ?? 0;
    return Math.round((positive / overview.total_conversations) * 100);
  }, [overview]);

  const sortedUsers = useMemo(
    () => [...users].sort((left, right) => right.total_conversations - left.total_conversations || left.user_id - right.user_id),
    [users]
  );

  const dashboardTaskCards = useMemo(
    () =>
      TASK_TYPES.map((taskType) => ({
        taskType,
        detail: insights?.task_type_breakdown?.[taskType] ?? {
          count: 0,
          avg_rating: 0,
          sentiment: { positive: 0, negative: 0, mixed: 0 },
          top_issues: [],
        },
      })),
    [insights]
  );

  const issueTypeData = useMemo(
    () =>
      Object.entries(insights?.issue_type_distribution ?? {}).map(([name, value]) => ({
        name: titleize(name),
        value,
      })),
    [insights]
  );

  const criticalIssuesData = useMemo(
    () =>
      (insights?.top_issue_tag_counts ?? []).map((item) => ({
        name: formatTag(item.tag),
        value: item.count,
      })),
    [insights]
  );

  return (
    <main className="flex h-screen overflow-hidden bg-[#0A192F] text-slate-100">
      <aside className="flex w-[260px] shrink-0 flex-col overflow-hidden border-r border-cyan-300/10 bg-[#0d2039]">
        <div className="border-b border-cyan-300/10 px-5 py-5">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-300">Admin</p>
          <h1 className="mt-1 text-xl font-semibold text-white">Admin Dashboard</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <nav className="space-y-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex w-full items-center rounded-2xl px-4 py-3 text-left text-base font-medium transition ${
                  activeTab === tab
                    ? "border border-cyan-300/25 bg-cyan-300/12 text-cyan-100"
                    : "border border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-cyan-300/10 bg-[#0b1d35] px-6 py-4">
          <div>
            <p className="text-sm font-medium text-slate-400">Admin Dashboard</p>
            <h2 className="text-lg font-semibold text-white">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              User Dashboard
            </button>
            <button
              onClick={() => {
                logoutAdmin();
                navigate("/login?mode=admin");
              }}
              className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/20"
            >
              Logout
            </button>
          </div>
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {loading ? <div className="rounded-2xl border border-cyan-300/10 bg-[#112742] p-6 text-base text-slate-300">Loading admin data...</div> : null}

          {!loading && activeTab === "Dashboard" && overview && insights ? (
            <div className="grid gap-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <MetricCard label="Total Conversations" value={String(overview.total_conversations)} accent="cyan" />
                <MetricCard label="Average Rating" value={overview.avg_rating.toFixed(2)} accent="blue" />
                <MetricCard label="Positive %" value={`${positivePercent}%`} accent="sky" />
              </div>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                {dashboardTaskCards.map(({ taskType, detail }) => (
                  <InputTypeCard
                    key={taskType}
                    taskType={taskType}
                    count={detail.count}
                    avgRating={detail.avg_rating}
                    sentimentTotal={(detail.sentiment.positive ?? 0) + (detail.sentiment.negative ?? 0) + (detail.sentiment.mixed ?? 0)}
                    progressValue={Math.max(8, Math.min(100, Math.round((detail.avg_rating / 5) * 100) || 0))}
                  />
                ))}
              </section>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <ChartCard title="Sentiment Trends">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overview.sentiment_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.10)" />
                        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#112742",
                            border: "1px solid rgba(34,211,238,0.15)",
                            borderRadius: "16px",
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="positive" stroke="#22d3ee" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="negative" stroke="#38bdf8" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="mixed" stroke="#60a5fa" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <ChartCard title="Issue Types">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={criticalIssuesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.10)" />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#112742",
                            border: "1px solid rgba(34,211,238,0.15)",
                            borderRadius: "16px",
                          }}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#38bdf8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr,0.8fr]">
                <ChartCard title="Task Usage Trend">
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={overview.task_usage_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.10)" />
                        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#112742",
                            border: "1px solid rgba(34,211,238,0.15)",
                            borderRadius: "16px",
                          }}
                        />
                        <Legend />
                        {TASK_TYPES.map((taskType) => (
                          <Area
                            key={taskType}
                            type="monotone"
                            dataKey={taskType}
                            stackId="usage"
                            stroke={TASK_COLORS[taskType]}
                            fill={TASK_COLORS[taskType]}
                            fillOpacity={0.2}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <div className="grid gap-6">
                  <ChartCard title="Issue Insights">
                    <div className="grid gap-3">
                      {issueTypeData.length ? (
                        issueTypeData.slice(0, 4).map((item, index) => (
                          <InsightRow key={`${item.name}-${index}`} label={item.name} value={item.value} total={sumValues(issueTypeData)} />
                        ))
                      ) : (
                        <EmptyState text="No issue type insights available yet." />
                      )}
                    </div>
                  </ChartCard>

                  <ChartCard title="Task Sentiment Snapshot">
                    <div className="grid gap-3">
                      {sentimentByTask.length ? (
                        sentimentByTask.map((row) => (
                          <div key={row.task_type} className="rounded-2xl border border-cyan-300/10 bg-[#0d223b] p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-base font-medium capitalize text-white">{row.task_type}</p>
                              <span className="text-sm text-slate-400">{row.positive + row.negative + row.mixed} total</span>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              <LegendRow color="bg-cyan-300" label="Positive" value={row.positive} />
                              <LegendRow color="bg-sky-400" label="Negative" value={row.negative} />
                              <LegendRow color="bg-blue-400" label="Mixed" value={row.mixed} />
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState text="No sentiment snapshot available yet." />
                      )}
                    </div>
                  </ChartCard>
                </div>
              </div>
            </div>
          ) : null}

          {!loading && activeTab === "Conversations" ? (
            <DataTable
              columns={["Conversation ID", "User ID", "Task Type", "Rating", "Sentiment", "Issue Type", "Date"]}
              rows={conversations.map((conversation) => [
                conversation.conversation_id,
                conversation.user_id,
                conversation.task_type ?? "text",
                conversation.rating ?? "-",
                conversation.sentiment,
                conversation.issue_type,
                formatDate(conversation.created_at),
              ])}
              onRowClick={(index) => navigate(`/admin/conversations/${conversations[index].conversation_id}`)}
            />
          ) : null}

          {!loading && activeTab === "Feedbacks" ? (
            <FeedbackTable feedbacks={feedbacks} expandedFeedback={expandedFeedback} onToggleExpanded={setExpandedFeedback} />
          ) : null}

          {!loading && activeTab === "Users" ? (
            <DataTable
              columns={["User ID", "Email", "Total Conversations", "Created At"]}
              rows={sortedUsers.map((user) => [user.user_id, user.email, user.total_conversations, formatDate(user.created_at)])}
            />
          ) : null}

          {!loading && activeTab === "Insights" && insights ? (
            <div className="grid gap-4">
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr,0.85fr]">
                <div className="rounded-2xl border border-cyan-300/10 bg-[#112742] p-5 shadow">
                  <p className="text-lg font-semibold text-white">Summary</p>
                  <p className="mt-4 text-base leading-relaxed text-slate-100">{insights.summary}</p>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-2xl border border-cyan-300/10 bg-gradient-to-br from-sky-400/12 to-transparent p-4 shadow">
                    <p className="text-sm font-medium text-slate-300">Most Critical Issue</p>
                    <p className="mt-3 text-base leading-relaxed text-white">{insights.top_problems[0] ?? "Not enough data yet"}</p>
                  </div>
                  <div className="rounded-2xl border border-cyan-300/10 bg-gradient-to-br from-cyan-300/12 to-transparent p-4 shadow">
                    <p className="text-sm font-medium text-slate-300">Biggest Opportunity</p>
                    <p className="mt-3 text-base leading-relaxed text-white">
                      {insights.improvement_suggestions[0] ?? "More feedback is needed"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {dashboardTaskCards.map(({ taskType, detail }) => (
                  <div key={taskType} className="rounded-2xl border border-cyan-300/10 bg-[#112742] p-4 shadow">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold capitalize text-white">{taskType}</h3>
                      <span className="text-sm text-slate-400">{detail.count} uses</span>
                    </div>
                    <div className="mt-4 h-[150px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[{ value: 0 }, { value: (detail.avg_rating / 5) * 100 || 0 }]}>
                          <Area type="monotone" dataKey="value" stroke={TASK_COLORS[taskType]} fill={TASK_COLORS[taskType]} fillOpacity={0.2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-center text-sm text-slate-400">Avg Rating: {detail.avg_rating ? detail.avg_rating.toFixed(1) : "--"}</p>
                    <p className="mt-4 text-sm text-slate-300">
                      Most issues: {detail.top_issues.length ? detail.top_issues.map(formatTag).join(", ") : "No consistent issue pattern yet"}
                    </p>
                  </div>
                ))}
              </section>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr,0.9fr]">
                <ChartCard title="Issue Types">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),220px] lg:items-center">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie data={issueTypeData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                            {issueTypeData.map((entry, index) => (
                              <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#112742",
                              border: "1px solid rgba(34,211,238,0.15)",
                              borderRadius: "16px",
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid gap-3">
                      {issueTypeData.length ? (
                        issueTypeData.map((entry, index) => (
                          <div key={`${entry.name}-legend`} className="rounded-2xl border border-cyan-300/10 bg-[#0d223b] px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                                />
                                <span className="text-sm text-slate-200">{entry.name}</span>
                              </div>
                              <span className="text-sm text-slate-400">{entry.value}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState text="No issue type insights available yet." />
                      )}
                    </div>
                  </div>
                </ChartCard>

                <ChartCard title="Most Critical Issues">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={criticalIssuesData} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.10)" />
                        <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" width={120} stroke="#94a3b8" tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#112742",
                            border: "1px solid rgba(34,211,238,0.15)",
                            borderRadius: "16px",
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#38bdf8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="grid gap-4">
                  <div className="rounded-2xl border border-cyan-300/10 bg-[#112742] p-4 shadow">
                    <p className="text-lg font-semibold text-white">Top Problems</p>
                    <div className="mt-4 grid max-h-[280px] grid-cols-1 gap-3 overflow-y-auto pr-1">
                      {insights.top_problems.length ? (
                        insights.top_problems.map((problem, index) => (
                          <div key={`${problem}-${index}`} className="rounded-md border border-cyan-300/10 bg-[#0d223b] px-4 py-3">
                            <p className="text-sm leading-relaxed text-slate-200">{problem}</p>
                          </div>
                        ))
                      ) : (
                        <EmptyState text="No top problems yet." />
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-cyan-300/10 bg-[#112742] p-4 shadow">
                    <p className="text-lg font-semibold text-white">Highlights</p>
                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <div className="rounded-2xl border border-cyan-300/10 bg-[#0d223b] p-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 text-cyan-300">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M5 12H19M12 5V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                          </span>
                          <div>
                            <p className="text-sm font-medium text-slate-300">Top Task</p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-200">{topTaskType(insights)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-cyan-300/10 bg-[#0d223b] p-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 text-cyan-300">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M12 3L21 19H3L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                              <path d="M12 9V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                              <circle cx="12" cy="16.5" r="1" fill="currentColor" />
                            </svg>
                          </span>
                          <div>
                            <p className="text-sm font-medium text-slate-300">Most Critical Issue</p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-200">
                              {formatTag(insights.top_issue_tags[0] ?? "emerging patterns")}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-cyan-300/10 bg-[#0d223b] p-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 text-cyan-300">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                          </span>
                          <div>
                            <p className="text-sm font-medium text-slate-300">Biggest Opportunity</p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-200">
                              {insights.improvement_suggestions[0] ?? "capture more suggestions"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-300/10 bg-[#112742] p-4 shadow">
                  <p className="text-lg font-semibold text-white">Improvement Suggestions</p>
                  <div className="mt-4 grid max-h-[360px] grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
                    {insights.improvement_suggestions.length ? (
                      insights.improvement_suggestions.map((suggestion, index) => (
                        <div
                          key={`${suggestion}-${index}`}
                          className="rounded-2xl border border-cyan-300/10 bg-gradient-to-br from-cyan-300/8 to-transparent p-4 transition hover:border-cyan-300/20"
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 text-cyan-300">
                              {/(bug|error|latency|performance|system|technical|integration|processing|pipeline|model)/i.test(suggestion) ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path d="M10 4H14M12 4V8M7 9H17L18 12L17 15H7L6 12L7 9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                                  <path d="M9 15V19M15 15V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                              ) : /(quality|accuracy|confidence|verify|validation|consistency|review)/i.test(suggestion) ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path d="M5 12L9.5 16.5L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
                                  <path d="M6 19C6 16.7909 8.68629 15 12 15C15.3137 15 18 16.7909 18 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                              )}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-cyan-100">{shortTitle(suggestion)}</p>
                              <p className="mt-2 text-base leading-relaxed text-slate-200">{suggestion}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState text="No improvement opportunities have been identified yet." />
                    )}
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: "cyan" | "blue" | "sky" }) {
  const accents = {
    cyan: "from-cyan-300/18 to-transparent",
    blue: "from-sky-400/18 to-transparent",
    sky: "from-blue-400/18 to-transparent",
  };

  return (
    <div className={`rounded-2xl border border-cyan-300/10 bg-gradient-to-br ${accents[accent]} p-4 shadow`}>
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function InputTypeCard({
  taskType,
  count,
  avgRating,
  sentimentTotal,
  progressValue,
}: {
  taskType: TaskType;
  count: number;
  avgRating: number;
  sentimentTotal: number;
  progressValue: number;
}) {
  const progressBackground = {
    background: `conic-gradient(${TASK_COLORS[taskType]} ${progressValue}%, rgba(148,163,184,0.12) ${progressValue}% 100%)`,
  };

  return (
    <div className="rounded-2xl border border-cyan-300/10 bg-[#112742] p-4 shadow transition hover:border-cyan-300/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold capitalize text-white">{taskType}</p>
          <p className="mt-1 text-sm text-slate-400">{count} total uses</p>
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-full p-[5px]" style={progressBackground}>
          <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0A192F] text-cyan-300">{renderTaskIcon(taskType)}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <QuickStat label="Rating" value={avgRating ? avgRating.toFixed(1) : "N/A"} />
        <QuickStat label="Usage" value={String(sentimentTotal || count)} />
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-cyan-300/10 bg-[#112742] p-4 shadow">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-300">{title}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-cyan-300/10 bg-[#0d223b] px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function InsightRow({ label, value, total }: { label: string; value: number; total: number }) {
  const width = total ? Math.round((value / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-cyan-300/10 bg-[#0d223b] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-medium text-white">{label}</p>
        <span className="text-sm text-slate-400">{value}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800/80">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-sky-400" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-cyan-300/10 bg-[#0d223b] px-3 py-3">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-base font-medium text-white">{value}</p>
    </div>
  );
}

function DataTable({
  columns,
  rows,
  onRowClick,
}: {
  columns: string[];
  rows: Array<Array<string | number>>;
  onRowClick?: (index: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-300/10 bg-[#112742] shadow">
      <div className="max-h-[68vh] overflow-auto">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="sticky top-0 bg-[#0b1d35]">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-medium text-slate-300">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${row[0]}-${index}`}
                onClick={() => onRowClick?.(index)}
                className={`border-t border-cyan-300/5 ${onRowClick ? "cursor-pointer transition hover:bg-white/5" : ""}`}
              >
                {row.map((cell, cellIndex) => (
                  <td key={`${cellIndex}-${cell}`} className="px-4 py-3 whitespace-nowrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeedbackTable({
  feedbacks,
  expandedFeedback,
  onToggleExpanded,
}: {
  feedbacks: AdminFeedbackRow[];
  expandedFeedback: number | null;
  onToggleExpanded: (feedbackId: number | null) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-300/10 bg-[#112742] shadow">
      <div className="max-h-[68vh] overflow-auto">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="sticky top-0 bg-[#0b1d35]">
            <tr>
              {["Feedback ID", "Conversation ID", "User ID", "Rating", "Sentiment", "Issue Type", "Issue Tags", "Summary", "Created At"].map(
                (column) => (
                  <th key={column} className="px-4 py-3 font-medium text-slate-300">
                    {column}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {feedbacks.map((feedback) => {
              const expanded = expandedFeedback === feedback.feedback_id;
              return (
                <tr key={feedback.feedback_id} className="border-t border-cyan-300/5 align-top">
                  <td className="px-4 py-3">{feedback.feedback_id}</td>
                  <td className="px-4 py-3">{feedback.conversation_id}</td>
                  <td className="px-4 py-3">{feedback.user_id}</td>
                  <td className="px-4 py-3">{feedback.rating ?? "-"}</td>
                  <td className="px-4 py-3 capitalize">{feedback.sentiment}</td>
                  <td className="px-4 py-3 capitalize">{feedback.issue_type}</td>
                  <td className="px-4 py-3">{feedback.issue_tags.join(", ") || "-"}</td>
                  <td className="px-4 py-3 min-w-[260px]">
                    <button
                      type="button"
                      onClick={() => onToggleExpanded(expanded ? null : feedback.feedback_id)}
                      className="w-full text-left"
                    >
                      <span
                        className="block leading-6 text-slate-200"
                        style={
                          expanded
                            ? undefined
                            : {
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }
                        }
                      >
                        {feedback.summary || "No summary available"}
                      </span>
                      {feedback.summary ? (
                        <span className="mt-2 inline-block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                          {expanded ? "Show Less" : "Expand"}
                        </span>
                      ) : null}
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(feedback.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HighlightChip({ text }: { text: string }) {
  return <div className="rounded-2xl border border-cyan-300/10 bg-[#0d223b] px-4 py-3 text-sm leading-relaxed text-slate-200">{text}</div>;
}

function InfoCard({ title, value, accent }: { title: string; value: string; accent: "blue" | "cyan" }) {
  const accentClass = accent === "blue" ? "from-sky-400/18 to-transparent" : "from-cyan-300/18 to-transparent";

  return (
    <div className={`rounded-2xl border border-cyan-300/10 bg-gradient-to-br ${accentClass} p-4 shadow`}>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      <p className="mt-4 text-lg leading-relaxed text-white">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-cyan-300/10 bg-[#0d223b] p-4 text-sm text-slate-400">{text}</div>;
}

function renderTaskIcon(taskType: TaskType) {
  switch (taskType) {
    case "text":
      return <TextTaskIcon />;
    case "image":
      return <ImageTaskIcon />;
    case "audio":
      return <AudioTaskIcon />;
    case "video":
      return <VideoTaskIcon />;
    case "document":
      return <DocumentTaskIcon />;
    default:
      return <TextTaskIcon />;
  }
}

function TextTaskIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7H19M5 12H15M5 17H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ImageTaskIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <path d="M7 16L11 12L14 14L17 11L19 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AudioTaskIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 14V10M10 17V7M14 15V9M18 13V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function VideoTaskIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="7" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15 11L20 8V16L15 13V11Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function DocumentTaskIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 4H14L18 8V20H8V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 4V8H18" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 12H16M10 16H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function sumValues(items: Array<{ value: number }>) {
  return items.reduce((total, item) => total + item.value, 0);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatTag(value: string) {
  return value.split("_").join(" ");
}

function titleize(value: string) {
  return formatTag(value).replace(/\b\w/g, (match) => match.toUpperCase());
}

function shortTitle(value: string) {
  const normalized = value.trim();
  if (normalized.length <= 48) {
    return normalized;
  }
  return `${normalized.slice(0, 45)}...`;
}

function topTaskType(insights: InsightsResponse) {
  return Object.entries(insights.task_type_breakdown)
    .sort((left, right) => right[1].count - left[1].count)[0]?.[0] ?? "text";
}
