import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getAdminConversationDetail } from "../api/admin";
import { useAuth } from "../context/AuthContext";
import type { AdminConversationDetail } from "../types";

export default function AdminConversationDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const { logoutAdmin } = useAuth();
  const [detail, setDetail] = useState<AdminConversationDetail | null>(null);

  useEffect(() => {
    if (!params.conversationId) {
      return;
    }

    void (async () => {
      try {
        setDetail(await getAdminConversationDetail(Number(params.conversationId)));
      } catch {
        logoutAdmin();
        navigate("/login?mode=admin");
      }
    })();
  }, [logoutAdmin, navigate, params.conversationId]);

  return (
    <main className="h-screen overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex h-full w-full max-w-[1500px] flex-col gap-4 rounded-[32px] border border-white/10 bg-slate-950/60 p-4 shadow-panel backdrop-blur sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-orange-200">Conversation Detail</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Admin Review</h1>
          </div>
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Back to Admin Dashboard
          </button>
        </header>

        {!detail ? (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-slate-300">Loading conversation...</div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[1.15fr,0.85fr]">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/65">
              <div className="border-b border-white/10 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Chat Messages</p>
                <div className="mt-2 text-sm text-slate-300">
                  User {detail.conversation.user_id} • {detail.conversation.task_type ?? "text"} •{" "}
                  {new Date(detail.conversation.created_at).toLocaleString()}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-4">
                  {detail.messages.map((message) => {
                    const isAssistant = message.role === "assistant";
                    return (
                      <div key={message.id} className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm leading-7 ${
                            isAssistant ? "bg-white/10 text-slate-100" : "bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950"
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <aside className="min-h-0 overflow-y-auto rounded-3xl border border-white/10 bg-slate-900/65 p-5">
              <div className="grid gap-4">
                <InfoCard title="Prompt" value={detail.conversation.prompt || "No prompt stored"} />
                <InfoCard title="AI Output" value={detail.conversation.ai_output || "No output stored"} />
                {detail.conversation.ai_output_file_url ? (
                  <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Uploaded Output File</p>
                    <a
                      className="mt-3 inline-block text-sm font-semibold text-sky-300 hover:text-sky-200"
                      href={`http://localhost:8000${detail.conversation.ai_output_file_url}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open uploaded file
                    </a>
                  </div>
                ) : null}
                <InfoCard title="Feedback Summary" value={detail.feedback.summary || "No summary available yet"} />
                <StatsCard
                  rating={detail.feedback.rating}
                  sentiment={detail.feedback.sentiment}
                  issueType={detail.feedback.issue_type}
                />
                <TagCard title="Positives" items={detail.feedback.positives} accent="emerald" />
                <TagCard title="Negatives" items={detail.feedback.negatives} accent="rose" />
                <TagCard title="Suggestions" items={detail.feedback.suggestions} accent="sky" />
                <TagCard title="Issue Tags" items={detail.feedback.issue_tags} accent="orange" />
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{title}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-100">{value}</p>
    </div>
  );
}

function StatsCard({
  rating,
  sentiment,
  issueType,
}: {
  rating: number | null;
  sentiment: string | null;
  issueType: string | null;
}) {
  return (
    <div className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/45 p-4 md:grid-cols-3">
      <Stat label="Rating" value={rating ? `${rating}/5` : "-"} />
      <Stat label="Sentiment" value={sentiment ?? "-"} />
      <Stat label="Issue Type" value={issueType ?? "-"} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold capitalize text-white">{value}</p>
    </div>
  );
}

function TagCard({ title, items, accent }: { title: string; items: string[]; accent: "emerald" | "rose" | "sky" | "orange" }) {
  const accentClasses = {
    emerald: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
    rose: "border-rose-300/20 bg-rose-400/10 text-rose-100",
    sky: "border-sky-300/20 bg-sky-400/10 text-sky-100",
    orange: "border-orange-300/20 bg-orange-400/10 text-orange-100",
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className={`rounded-full border px-3 py-2 text-sm ${accentClasses[accent]}`}>
            {item}
          </span>
        ))}
        {!items.length ? <p className="text-sm text-slate-400">No data captured yet.</p> : null}
      </div>
    </div>
  );
}
