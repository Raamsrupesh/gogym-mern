import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

const WELCOME =
  "Hello! 👋 I'm your GoGym assistant. Ask me about plans, gym services, referrals, or—when signed in—your workouts, progress, attendance, and published trainer feedback.";

const ROBOT_STYLES = `
@keyframes gg-wave {
  0%, 55%, 100% { transform: rotate(0deg); }
  10%, 30% { transform: rotate(-28deg); }
  20%, 40% { transform: rotate(14deg); }
}
.gg-wave { transform-box: view-box; transform-origin: 48px 40px; animation: gg-wave 2.4s ease-in-out infinite; }

@keyframes gg-blink {
  0%, 92%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.12); }
}
.gg-blink { transform-box: fill-box; transform-origin: center; animation: gg-blink 4.5s ease-in-out infinite; }

@keyframes gg-pop {
  from { opacity: 0; transform: translateY(8px) scale(0.9); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.gg-pop { animation: gg-pop 0.35s ease-out both; }

@keyframes gg-dot {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30%           { transform: translateY(-4px); opacity: 1; }
}
.gg-dot { animation: gg-dot 1s ease-in-out infinite; }
`;

function Robot({ className = 'h-10 w-10', waving = false }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {/* antenna */}
      <g className={waving ? 'text-brand animate-pulse' : 'text-brand'} fill="currentColor">
        <circle cx="32" cy="6" r="3" />
      </g>
      <line x1="32" y1="9" x2="32" y2="14" className="text-brand" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

      {/* head */}
      <g className="text-brand" fill="currentColor">
        <rect x="12" y="14" width="40" height="26" rx="9" />
      </g>

      {/* eyes */}
      <g className="text-charcoal" fill="currentColor">
        <circle cx="25" cy="26" r="3.5" className="gg-blink" />
        <circle cx="39" cy="26" r="3.5" className="gg-blink" />
      </g>

      {/* smile */}
      <path
        d="M25 32.5 Q32 38 39 32.5"
        className="text-charcoal"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* body + left arm */}
      <g className="text-brand" fill="currentColor">
        <rect x="20" y="42" width="24" height="15" rx="5" />
        <rect x="13" y="42" width="6" height="12" rx="3" />
      </g>

      {/* chest light */}
      <circle cx="32" cy="49.5" r="2.2" className="text-brand" fill="currentColor" />

      {/* right arm (waves hello) */}
      <g className={waving ? 'text-brand gg-wave' : 'text-brand'} fill="currentColor">
        <rect x="45" y="36" width="6" height="14" rx="3" />
      </g>
    </svg>
  );
}

/** Three bouncing dots shown while we wait for Gemini's reply. */
function TypingIndicator() {
  return (
    <div className="gg-pop flex items-end gap-2" role="status" aria-live="polite">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-brand bg-card">
        <Robot className="h-4 w-4" waving />
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-2xl bg-card px-3.5 py-2.5">
        <span className="gg-dot h-1.5 w-1.5 rounded-full bg-brand" style={{ animationDelay: '0ms' }} />
        <span className="gg-dot h-1.5 w-1.5 rounded-full bg-brand" style={{ animationDelay: '150ms' }} />
        <span className="gg-dot h-1.5 w-1.5 rounded-full bg-brand" style={{ animationDelay: '300ms' }} />
        <span className="sr-only">Robo is typing…</span>
      </span>
    </div>
  );
}

export default function Chatbot() {
  const [open, setOpen] = useState(true); // chat is active by default
  const [showGreeting, setShowGreeting] = useState(true);
  const [messages, setMessages] = useState([{ role: 'bot', text: WELCOME }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  // Robo waves + says hello for a few seconds after the page loads
  useEffect(() => {
    const timer = setTimeout(() => setShowGreeting(false), 7000);
    return () => clearTimeout(timer);
  }, []);

  // Keep the newest message (or the typing dots) in view
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, open]);

  async function send() {
    if (!input.trim() || busy) return;
    const text = input.trim();
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput(''); setBusy(true);
    try {
      const { reply } = await api.post('/chatbot/ask', { message: text });
      setMessages((m) => [...m, { role: 'bot', text: reply }]);
    } catch (error) {
      setMessages((m) => [...m, { role: 'bot', text: error.message || 'Sorry, I could not answer. Please try again later.' }]);
    } finally { setBusy(false); }
  }

  const waving = !open || showGreeting || busy;
  const bubbleVisible = showGreeting || !open;

  return (
    <>
      <style>{ROBOT_STYLES}</style>

      {/* Robo launcher — greets by default and toggles the chat */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close the GoGym chat assistant' : 'Open the GoGym chat assistant'}
        className="fixed bottom-5 right-5 z-50 flex items-end gap-2 text-left"
      >
        {bubbleVisible && (
          <span className="gg-pop relative mb-1 max-w-[190px] rounded-2xl rounded-br-md border border-brand bg-card px-3 py-2 text-xs font-semibold leading-snug text-white shadow-lg">
            {open ? "Hello! 👋 I'm Robo. Ask me anything!" : 'Hello! 👋 Tap me to chat!'}
            <span className="absolute -right-1.5 bottom-3 h-2.5 w-2.5 rotate-45 border-r border-b border-brand bg-card" />
          </span>
        )}
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-brand bg-card shadow-[0_0_18px_rgba(240,84,35,0.45)] transition-transform hover:scale-105">
          <Robot className="h-12 w-12" waving={waving} />
        </span>
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex h-96 w-80 flex-col rounded-2xl border border-brand bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b border-brand p-3">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-brand bg-card">
              <Robot className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-bold leading-tight">GoGym Assistant</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand">
                {busy ? 'Robo is typing…' : 'Robo · Online'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="ml-auto rounded-full px-2 text-lg leading-none text-white/70 transition hover:text-white"
            >
              ×
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                <span className={`inline-block rounded-2xl px-3 py-1.5 ${m.role === 'user' ? 'bg-brand text-charcoal' : 'bg-card'}`}>{m.text}</span>
              </div>
            ))}
            {busy && <TypingIndicator />}
          </div>
          <div className="flex gap-2 border-t border-brand p-2">
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              className="flex-1 rounded-full bg-card px-3 py-2 text-sm outline-none" placeholder="Ask…" />
            <button onClick={send} disabled={busy} className="rounded-full bg-brand px-3 text-sm font-bold text-white disabled:opacity-50">
              {busy ? '…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}