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
  RadialBar,
  RadialBarChart,
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
const PIE_COLORS = ["#34d399", "#fb7185", "#fbbf24"];
const TASK_COLORS: Record<TaskType, string> = {
  text: "#38bdf8",
  image: "#fb923c",
  audio: "#34d399",
  video: "#a78bfa",
  document: "#f87171",
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
    <main className="h-screen overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex h-full w-full max-w-[1500px] flex-col gap-4 rounded-[32px] border border-white/10 bg-slate-950/60 p-4 shadow-panel backdrop-blur sm:p-6">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Admin Control Room</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Feedback Analytics Dashboard</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Back to User Dashboard
            </button>
            <button
              onClick={() => {
                logoutAdmin();
                navigate("/login?mode=admin");
              }}
              className="rounded-2xl border border-orange-300/30 bg-orange-400/10 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:bg-orange-400/20"
            >
              Admin Logout
            </button>
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab ? "bg-white text-slate-950" : "border border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <section className="min-h-0 flex-1 overflow-y-auto pr-1">
          {loading ? <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-slate-300 shadow">Loading admin data...</div> : null}

          {!loading && activeTab === "Dashboard" && overview && insights ? (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <MetricCard label="Total Conversations" value={String(overview.total_conversations)} accent="orange" />
                <MetricCard label="Avg Rating" value={overview.avg_rating.toFixed(2)} accent="sky" />
                <MetricCard label="Positive %" value={`${positivePercent}%`} accent="emerald" />
              </div>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dashboardTaskCards.map(({ taskType, detail }) => (
                  <div key={taskType} className="rounded-2xl border border-white/10 bg-slate-900/65 p-4 shadow-md">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold capitalize text-white">{taskType}</h3>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                        {detail.count} total
                      </span>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-[130px,1fr]">
                      <div className="h-[120px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={[
                                { name: "Positive", value: detail.sentiment.positive ?? 0 },
                                { name: "Negative", value: detail.sentiment.negative ?? 0 },
                                { name: "Mixed", value: detail.sentiment.mixed ?? 0 },
                              ]}
                              dataKey="value"
                              innerRadius={28}
                              outerRadius={46}
                              paddingAngle={3}
                            >
                              {PIE_COLORS.map((color, index) => (
                                <Cell key={`${taskType}-${color}-${index}`} fill={color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-3">
                        <LegendRow color="bg-emerald-400" label="Positive" value={detail.sentiment.positive ?? 0} />
                        <LegendRow color="bg-rose-400" label="Negative" value={detail.sentiment.negative ?? 0} />
                        <LegendRow color="bg-amber-400" label="Mixed" value={detail.sentiment.mixed ?? 0} />
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <QuickStat label="Total Count" value={String(detail.count)} />
                      <QuickStat label="Avg Rating" value={detail.avg_rating ? detail.avg_rating.toFixed(1) : "N/A"} />
                    </div>
                  </div>
                ))}
              </section>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ChartCard title="Rating Distribution">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={overview.rating_distribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                        <XAxis dataKey="rating" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#38bdf8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <ChartCard title="Sentiment Trend">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overview.sentiment_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                        <XAxis dataKey="date" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="positive" stroke="#34d399" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="negative" stroke="#fb7185" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="mixed" stroke="#fbbf24" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>

              <ChartCard title="Task Usage Trend">
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overview.task_usage_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                      <XAxis dataKey="date" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Legend />
                      {TASK_TYPES.map((taskType) => (
                        <Area
                          key={taskType}
                          type="monotone"
                          dataKey={taskType}
                          stackId="usage"
                          stroke={TASK_COLORS[taskType]}
                          fill={TASK_COLORS[taskType]}
                          fillOpacity={0.25}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
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
              <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/60 p-4 shadow lg:p-6">
                <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Overall Summary</p>
                <div className="mt-4 grid gap-5 lg:grid-cols-[1.3fr,0.7fr]">
                  <div className="space-y-4">
                    <p className="text-base leading-7 text-slate-100">{insights.summary}</p>
                    <p className="text-sm leading-7 text-slate-300">
                      User engagement is clustering around the strongest task categories, while repeated issue tags reveal where the product feels
                      least reliable or least aligned with user intent.
                    </p>
                    <p className="text-sm leading-7 text-slate-300">
                      The clearest opportunity is to improve output confidence, reduce quality misses, and sharpen the experience around the most
                      heavily used task types.
                    </p>
                  </div>
                  <div className="grid gap-3">
                    <HighlightChip text={`Most users are interacting with ${topTaskType(insights)} tasks`} />
                    <HighlightChip text={`Primary issue: ${formatTag(insights.top_issue_tags[0] ?? "emerging patterns")}`} />
                    <HighlightChip text={`Top opportunity: ${insights.improvement_suggestions[0] ?? "capture more suggestions"}`} />
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {dashboardTaskCards.map(({ taskType, detail }) => (
                  <div key={taskType} className="rounded-2xl border border-white/10 bg-slate-900/65 p-4 shadow-md">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold capitalize text-white">{taskType}</h3>
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{detail.count} uses</span>
                    </div>
                    <div className="mt-4 h-[150px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                          innerRadius="58%"
                          outerRadius="88%"
                          barSize={14}
                          data={[{ name: "Avg Rating", value: (detail.avg_rating / 5) * 100, fill: TASK_COLORS[taskType] }]}
                          startAngle={90}
                          endAngle={-270}
                        >
                          <RadialBar background dataKey="value" cornerRadius={10} />
                          <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-white text-xl font-bold">
                            {detail.avg_rating ? detail.avg_rating.toFixed(1) : "--"}
                          </text>
                          <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-400 text-[10px] uppercase tracking-[0.2em]">
                            / 5
                          </text>
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-center text-xs uppercase tracking-[0.2em] text-slate-400">Avg Rating</p>
                    <p className="mt-4 text-sm text-slate-300">
                      Most issues: {detail.top_issues.length ? detail.top_issues.map(formatTag).join(", ") : "No consistent issue pattern yet"}
                    </p>
                  </div>
                ))}
              </section>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartCard title="Issue Type Distribution">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie data={issueTypeData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                          {issueTypeData.map((entry, index) => (
                            <Cell key={entry.name} fill={["#38bdf8", "#fb923c", "#34d399", "#a78bfa"][index % 4]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <ChartCard title="Most Critical Issues">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={criticalIssuesData} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                        <XAxis type="number" stroke="#94a3b8" />
                        <YAxis dataKey="name" type="category" width={120} stroke="#94a3b8" />
                        <Tooltip />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#fb923c" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <InfoCard title="Most Critical Issue" value={insights.top_problems[0] ?? "Not enough data yet"} accent="rose" />
                <InfoCard title="Biggest Opportunity" value={insights.improvement_suggestions[0] ?? "More feedback is needed"} accent="emerald" />
              </section>

              <section className="rounded-2xl border border-white/10 bg-slate-900/65 p-4 shadow lg:p-6">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Biggest Opportunities</p>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {insights.improvement_suggestions.map((suggestion, index) => (
                    <div key={`${suggestion}-${index}`} className="rounded-2xl border border-sky-300/20 bg-sky-400/10 p-4">
                      <p className="text-sm font-semibold text-sky-100">{shortTitle(suggestion)}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-200">{suggestion}</p>
                    </div>
                  ))}
                  {!insights.improvement_suggestions.length ? <EmptyState text="No improvement opportunities have been identified yet." /> : null}
                </div>
              </section>

              <InsightCarousel title="Top Problems Carousel" subtitle="Scroll horizontally to review the strongest recurring pain points.">
                {insights.top_problems.length ? (
                  insights.top_problems.map((problem, index) => (
                    <div key={`${problem}-${index}`} className="w-[280px] shrink-0 rounded-2xl border border-orange-300/20 bg-orange-400/10 p-4">
                      <p className="text-sm font-semibold text-orange-100">{shortTitle(problem)}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-200">{problem}</p>
                    </div>
                  ))
                ) : (
                  <div className="w-[280px] shrink-0 rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-400">
                    No top problems yet.
                  </div>
                )}
              </InsightCarousel>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: "orange" | "sky" | "emerald" }) {
  const accents = {
    orange: "from-orange-500/25 to-amber-300/10",
    sky: "from-sky-500/25 to-cyan-300/10",
    emerald: "from-emerald-500/25 to-lime-300/10",
  };

  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-br p-4 shadow lg:p-6 ${accents[accent]}`}>
      <p className="text-xs uppercase tracking-[0.24em] text-slate-300">{label}</p>
      <p className="mt-4 text-4xl font-bold text-white">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/65 p-4 shadow lg:p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{title}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/65 shadow">
      <div className="max-h-[68vh] overflow-auto">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="sticky top-0 bg-slate-950/95">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-semibold text-slate-300">
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
                className={`border-t border-white/5 ${onRowClick ? "cursor-pointer transition hover:bg-white/5" : ""}`}
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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/65 shadow">
      <div className="max-h-[68vh] overflow-auto">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="sticky top-0 bg-slate-950/95">
            <tr>
              {["Feedback ID", "Conversation ID", "User ID", "Rating", "Sentiment", "Issue Type", "Issue Tags", "Summary", "Created At"].map(
                (column) => (
                  <th key={column} className="px-4 py-3 font-semibold text-slate-300">
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
                <tr key={feedback.feedback_id} className="border-t border-white/5 align-top">
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
                        <span className="mt-2 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
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
  return <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-200">{text}</div>;
}

function InfoCard({ title, value, accent }: { title: string; value: string; accent: "rose" | "emerald" }) {
  const accentClass =
    accent === "rose"
      ? "from-rose-500/20 to-orange-300/10 text-rose-100"
      : "from-emerald-500/20 to-lime-300/10 text-emerald-100";

  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-br p-4 shadow lg:p-6 ${accentClass}`}>
      <p className="text-xs uppercase tracking-[0.24em] text-slate-300">{title}</p>
      <p className="mt-4 text-lg leading-8 text-white">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/45 p-4 text-sm text-slate-400">{text}</div>;
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
