"use client";
import { useState } from "react";
import { sendChatMessage } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import MarkdownLite from "@/components/MarkdownLite";

function BotAvatar() {
  return (
    <div className="shrink-0 w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <rect x="4" y="8" width="16" height="12" rx="3" />
        <path d="M12 8V4" />
        <circle cx="12" cy="3" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="9" cy="14" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="15" cy="14" r="1.2" fill="currentColor" stroke="none" />
        <path d="M9 18h6" />
      </svg>
    </div>
  );
}

function UserAvatar({ initial }) {
  return (
    <div className="shrink-0 w-7 h-7 rounded-full bg-violetSoft text-violet flex items-center justify-center font-display font-bold text-xs">
      {initial}
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2">
      <BotAvatar />
      <div className="bg-surface border border-line rounded-md px-3 py-2.5 flex gap-1 items-center">
        <span className="w-1.5 h-1.5 bg-slate rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-slate rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-slate rounded-full animate-bounce" />
      </div>
    </div>
  );
}

export default function ChatAssistant({ jobId, resumeProfileId }) {
  const [apiKey, setApiKey] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const user = typeof window !== "undefined" ? getStoredUser() : null;
  const userInitial = (user?.full_name || user?.email || "Y").trim().charAt(0).toUpperCase();

  // Tailored to context -- a job detail page gets fit/prep questions, the
  // resume page (no jobId) gets more general job-search questions.
  const suggestedQuestions = jobId
    ? ["Am I a good fit for this role?", "What skills am I missing?", "How should I prepare for an interview?"]
    : ["What kind of roles should I look for?", "How can I improve my resume?", "What skills are in demand right now?"];

  async function handleSend(overrideText) {
    const text = (overrideText ?? input).trim();
    if (!text || !apiKey.trim()) return;
    const userMsg = { role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await sendChatMessage({
        message: text,
        apiKey,
        jobId,
        resumeProfileId,
      });
      setMessages((m) => [...m, { role: "assistant", text: res.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: e.message || "Something went wrong — please check your API key and try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestionClick(question) {
    // No key yet -- just fill the box so they can see what they're about
    // to ask, rather than silently swallowing the click.
    if (!apiKey.trim()) {
      setInput(question);
      return;
    }
    handleSend(question);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-2 bg-violet text-white rounded-full pl-3 pr-4 py-3 sm:pl-4 sm:pr-5 text-sm sm:text-base font-display shadow-lg hover:bg-violet/90 transition-colors z-40"
      >
        <BotAvatar />
        Ask the AI assistant
      </button>
    );
  }

  return (
    // Mobile: full-width bottom sheet with side margins (never overflows
    // the viewport). Desktop (sm+): fixed 24rem panel anchored bottom-right.
    <div className="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-96 bg-white border border-line rounded-lg shadow-2xl flex flex-col max-h-[75vh] sm:max-h-[70vh] z-40">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-ink text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <BotAvatar />
          <span className="font-display">Job Assistant</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-lg leading-none px-1">✕</button>
      </div>

      <div className="p-3">
        <input
          type="password"
          placeholder="Paste your Gemini API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full border border-line rounded-md px-3 py-2 text-sm"
        />
        

        {resumeProfileId ? (
          <p className="flex items-center gap-1.5 text-[11px] text-mint mt-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Using your uploaded resume as context
          </p>
        ) : (
          <p className="text-[11px] text-slate mt-2">
            <a href="/resume" className="text-violet underline underline-offset-2">
              Upload your resume
            </a>{" "}
            for answers tailored to your background.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-3 min-h-[100px]">
        {messages.length === 0 && !loading && (
          <div className="flex flex-wrap gap-2 pb-1">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => handleSuggestionClick(q)}
                className="text-xs px-2.5 py-1.5 rounded-full border border-line bg-surface text-ink/80 hover:border-violet hover:text-violet hover:bg-violetSoft transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            {m.role === "assistant" ? <BotAvatar /> : <UserAvatar initial={userInitial} />}
            <div
              className={`text-sm px-3 py-2 rounded-md max-w-[80%] break-words ${
                m.role === "user"
                  ? "bg-violetSoft text-ink"
                  : "bg-surface border border-line"
              }`}
            >
              {m.role === "assistant" ? <MarkdownLite text={m.text} /> : m.text}
            </div>
          </div>
        ))}

        {loading && <TypingBubble />}
      </div>

      <div className="p-3 border-t border-line flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Am I suitable for this job?"
          className="flex-1 min-w-0 border border-line rounded-md px-3 py-2 text-sm"
        />
        <button
          onClick={() => handleSend()}
          className="bg-violet text-white px-3 py-2 rounded-md text-sm font-semibold shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  );
}
