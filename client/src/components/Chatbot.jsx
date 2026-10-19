import { useState } from 'react';
import { api } from '../api';

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'bot', text: 'Hi! Ask me about plans, timings, or how to join.' }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!input.trim() || busy) return;
    const text = input.trim();
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput(''); setBusy(true);
    try {
      const { reply } = await api.post('/chatbot/ask', { message: text });
      setMessages((m) => [...m, { role: 'bot', text: reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: 'Sorry, I could not answer. Please call the gym directly.' }]);
    } finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-gymred p-4 font-bold text-white shadow-lg hover:scale-105 transition">
        {open ? '×' : 'Chat'}
      </button>
      {open && (
        <div className="fixed bottom-20 right-5 z-40 flex h-96 w-80 flex-col rounded-2xl border border-electricblue bg-card shadow-2xl">
          <div className="border-b border-electricblue p-3 text-sm font-bold">GoGym Assistant</div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                <span className={`inline-block rounded-2xl px-3 py-1.5 ${m.role === 'user' ? 'bg-electricblue text-charcoal' : 'bg-card'}`}>{m.text}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-electricblue p-2">
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              className="flex-1 rounded-full bg-card px-3 py-2 text-sm outline-none" placeholder="Ask…" />
            <button onClick={send} disabled={busy} className="rounded-full bg-gymred px-3 text-sm font-bold text-white disabled:opacity-50">Send</button>
          </div>
        </div>
      )}
    </>
  );
}