import { useEffect, useMemo, useRef } from "react";

import type { ConversationMetadata, Message, TaskType } from "../types";

const TASK_TYPES: TaskType[] = ["text", "image", "audio", "video", "document"];

interface ChatWindowProps {
  messages: Message[];
  draft: string;
  metadata: ConversationMetadata;
  selectedOutputFile: File | null;
  onDraftChange: (value: string) => void;
  onMetadataChange: (metadata: ConversationMetadata) => void;
  onOutputFileChange: (file: File | null) => void;
  onSend: () => void;
  disabled?: boolean;
  currentState?: string;
}

export default function ChatWindow({
  messages,
  draft,
  metadata,
  selectedOutputFile,
  onDraftChange,
  onMetadataChange,
  onOutputFileChange,
  onSend,
  disabled,
  currentState,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const canReopen = currentState === "END";
  const metadataLocked = metadata.is_locked;
  const isTextTask = metadata.task_type === "text" || !metadata.task_type;
  const uploadedFileLabel = useMemo(() => {
    if (selectedOutputFile) {
      return selectedOutputFile.name;
    }
    if (metadata.ai_output_file_url) {
      return metadata.ai_output_file_url.split("/").pop() || "Uploaded file";
    }
    return "";
  }, [metadata.ai_output_file_url, selectedOutputFile]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <section className="flex min-h-0 flex-col overflow-hidden bg-[#081A35]">
      <div className="shrink-0 border-b border-cyan-300/10 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Task Type</p>
          <div className="flex flex-wrap gap-2">
            {TASK_TYPES.map((taskType) => {
              const active = metadata.task_type === taskType;
              return (
                <button
                  key={taskType}
                  type="button"
                  disabled={metadataLocked}
                  onClick={() => {
                    onOutputFileChange(null);
                    onMetadataChange({
                      ...metadata,
                      task_type: taskType,
                      ai_output: taskType === "text" ? metadata.ai_output : "",
                      ai_output_file_url: taskType === "text" ? "" : metadata.ai_output_file_url,
                    });
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
                    active ? "bg-cyan-300 text-slate-950" : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {taskType}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <label className="block rounded-3xl border border-white/10 bg-white/5 p-4">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Original Prompt</span>
            <textarea
              className="mt-3 h-32 w-full resize-none bg-transparent text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-500"
              value={metadata.prompt}
              onChange={(event) =>
                onMetadataChange({
                  ...metadata,
                  prompt: event.target.value,
                })
              }
              placeholder="Paste the original prompt here..."
              disabled={metadataLocked}
            />
          </label>

          {isTextTask ? (
            <label className="block rounded-3xl border border-white/10 bg-white/5 p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">AI Response Output</span>
              <textarea
                className="mt-3 h-32 w-full resize-none bg-transparent text-sm leading-6 text-slate-300 outline-none placeholder:text-slate-500"
                value={metadata.ai_output}
                onChange={(event) =>
                  onMetadataChange({
                    ...metadata,
                    ai_output: event.target.value,
                  })
                }
                placeholder="Paste the AI output here..."
                disabled={metadataLocked}
              />
            </label>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">AI Output File</span>
              <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-[#0A1830] p-4">
                {!metadataLocked ? (
                  <input
                    type="file"
                    className="w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-300 file:px-4 file:py-2 file:font-medium file:text-slate-950"
                    onChange={(event) => onOutputFileChange(event.target.files?.[0] ?? null)}
                  />
                ) : null}
                <p className="mt-3 text-sm text-slate-300">
                  {uploadedFileLabel ? `Selected: ${uploadedFileLabel}` : "Upload the generated file for this task type."}
                </p>
                {metadata.ai_output_file_url ? (
                  <a
                    className="mt-2 inline-block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300"
                    href={`http://localhost:8000${metadata.ai_output_file_url}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Uploaded File
                  </a>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="space-y-5">
          {messages.map((message) => {
            const isAssistant = message.role === "assistant";
            return (
              <div key={message.id} className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[80%] rounded-3xl border px-4 py-3 text-sm leading-6 ${
                    isAssistant
                      ? "border-white/10 bg-white/10 text-slate-100"
                      : "border-cyan-300/20 bg-cyan-300/10 text-slate-100"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            );
          })}
          {!messages.length ? <p className="text-sm text-slate-400">Start a conversation to collect feedback.</p> : null}
          {canReopen ? (
            <p className="text-sm text-slate-400">
              This conversation is paused, but you can still send another message to keep adding feedback.
            </p>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-cyan-300/10 px-4 py-4 sm:px-6">
        <div className="flex items-end gap-3">
          <textarea
            className="min-h-[72px] flex-1 resize-none rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300 disabled:opacity-60"
            placeholder={
              canReopen
                ? "Add more feedback whenever you are ready..."
                : "Tell the assistant what worked, what felt off, or what to improve..."
            }
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            disabled={disabled}
          />
          <button
            onClick={onSend}
            disabled={disabled || !draft.trim()}
            className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </div>
    </section>
  );
}
