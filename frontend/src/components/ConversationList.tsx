import type { ConversationSummary } from "../types";

interface ConversationListProps {
  conversations: ConversationSummary[];
  activeConversationId: number | null;
  onCreateConversation: () => void;
  onSelectConversation: (conversationId: number) => void;
}

export default function ConversationList({
  conversations,
  activeConversationId,
  onCreateConversation,
  onSelectConversation,
}: ConversationListProps) {
  return (
    <aside className="flex min-h-0 flex-col border-r border-cyan-300/10 bg-[#0D1D39]">
      <div className="border-b border-cyan-300/10 px-4 py-4">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Sessions</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Feedback Threads</h2>
        </div>
        <button
          onClick={onCreateConversation}
          className="w-full rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/20"
        >
          New conversation
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {conversations.map((conversation) => {
            const isActive = activeConversationId === conversation.id;
            return (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-cyan-300/30 bg-cyan-300/10 text-white"
                    : "border-white/10 bg-[#0A1830] text-slate-300 hover:border-white/20 hover:bg-[#112342]"
                }`}
              >
                <p className="truncate text-sm font-medium">{conversation.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{conversation.state}</p>
              </button>
            );
          })}

          {!conversations.length ? <p className="text-sm text-slate-400">No conversations yet.</p> : null}
        </div>
      </div>
    </aside>
  );
}
