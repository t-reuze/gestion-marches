import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { findAnswer, getClarification } from '../data/copilotKnowledge';

const PROXY_URL = 'http://localhost:3001/api';

function getPageContext(pathname) {
  if (pathname === '/' || pathname === '') return 'Tableau de bord (liste des marchés)';
  if (pathname.includes('/formations')) return 'Section Formations';
  if (pathname.includes('/reporting')) return 'Section Reporting';
  if (pathname.includes('/contacts')) return 'Section Contacts / Annuaire CLCC';
  if (pathname.includes('/analyse')) return 'Onglet Analyse d\'un marché';
  if (pathname.includes('/notation')) return 'Onglet Notation d\'un marché';
  if (pathname.includes('/reponses')) return 'Onglet Réponses fournisseurs';
  if (pathname.includes('/infos')) return 'Onglet Informations d\'un marché';
  if (pathname.includes('/interlocuteurs')) return 'Onglet Interlocuteurs d\'un marché';
  if (pathname.includes('/erp')) return 'Onglet ERP/KPI d\'un marché';
  return '';
}

export default function CopilotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState(null); // null = not checked, 'ai' = proxy ok, 'local' = fallback
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const location = useLocation();

  // Check if proxy is running
  useEffect(() => {
    fetch(PROXY_URL + '/health').then(r => r.json())
      .then(d => setAiMode(d.hasApiKey ? 'ai' : 'local'))
      .catch(() => setAiMode('local'));
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  async function handleSend(text) {
    const q = (text || input).trim();
    if (!q) return;
    setInput('');

    const userMsg = { role: 'user', content: q };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      let answer;

      if (aiMode === 'ai') {
        // Mode Claude AI — proxy local
        const res = await fetch(PROXY_URL + '/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newMessages.slice(-12),
            pageContext: getPageContext(location.pathname),
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        answer = data.answer;
      } else {
        // Mode local — moteur sémantique
        const clarification = getClarification(q);
        const localAnswer = findAnswer(q, messages);
        answer = localAnswer || clarification || 'Je n\'ai pas trouvé de réponse précise. Pourriez-vous reformuler votre question ?';
      }

      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erreur : ' + err.message }]);
    }
    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <>
      {/* ── Bouton flottant ──────────────────────────── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, #E8501A 0%, #FF6B35 100%)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(232,80,26,.35), 0 2px 8px rgba(0,0,0,.1)',
            transition: 'transform .2s, box-shadow .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      )}

      {/* ── Panel chat ───────────────────────────────── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 420, height: 560, borderRadius: 16,
          background: '#FFFFFF', border: '1px solid rgba(15,23,42,.1)',
          boxShadow: '0 12px 40px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.06)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
            borderBottom: '1px solid rgba(15,23,42,.08)',
            background: 'linear-gradient(135deg, #FFF3EE 0%, #FFFFFF 100%)',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #E8501A 0%, #FF6B35 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1A1A2E' }}>Assistant UNICANCER</div>
              <div style={{ fontSize: 10, color: aiMode === 'ai' ? '#16A34A' : '#64748B' }}>
                {aiMode === 'ai' ? 'Claude AI connecté' : 'Mode local'}
              </div>
            </div>
            <button
              onClick={() => { setMessages([]); }}
              style={{
                width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'rgba(15,23,42,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748B', fontSize: 12, marginRight: 4,
              }}
              title="Nouvelle conversation"
            >&#x21BB;</button>
            <button
              onClick={() => setOpen(false)}
              style={{
                width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'rgba(15,23,42,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748B', fontSize: 14,
              }}
            >&#x2715;</button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B', fontSize: 13 }}>
                Posez votre question ci-dessous.
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 10,
              }}>
                <div style={{
                  maxWidth: '88%', padding: '10px 14px', borderRadius: 12,
                  fontSize: 13, lineHeight: 1.65,
                  ...(msg.role === 'user'
                    ? { background: '#E8501A', color: '#fff', borderBottomRightRadius: 4 }
                    : { background: '#F5F6FA', color: '#1A1A2E', borderBottomLeftRadius: 4, border: '1px solid rgba(15,23,42,.06)' }
                  ),
                }}>
                  {msg.content.split('\n').map((line, j) => {
                    const parts = line.split(/(\*\*[^*]+\*\*)/g);
                    return (
                      <div key={j} style={{ marginBottom: line === '' ? 6 : 1 }}>
                        {parts.map((part, k) =>
                          part.startsWith('**') && part.endsWith('**')
                            ? <strong key={k}>{part.slice(2, -2)}</strong>
                            : <span key={k}>{part}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
                <div style={{
                  padding: '10px 18px', borderRadius: 12, background: '#F5F6FA',
                  borderBottomLeftRadius: 4, border: '1px solid rgba(15,23,42,.06)',
                  display: 'flex', gap: 5, alignItems: 'center',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8501A', animation: 'copilotDot 1s infinite 0s' }} />
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8501A', animation: 'copilotDot 1s infinite .2s' }} />
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8501A', animation: 'copilotDot 1s infinite .4s' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 14px', borderTop: '1px solid rgba(15,23,42,.08)',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question..."
              style={{
                flex: 1, height: 38, padding: '0 14px', borderRadius: 10,
                border: '1px solid rgba(15,23,42,.12)', fontSize: 13,
                outline: 'none', background: '#FFFFFF', color: '#1A1A2E',
              }}
              onFocus={e => e.target.style.borderColor = '#E8501A'}
              onBlur={e => e.target.style.borderColor = 'rgba(15,23,42,.12)'}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: input.trim() ? 'linear-gradient(135deg, #E8501A, #FF6B35)' : '#F1F5F9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={input.trim() ? '#fff' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes copilotDot {
          0%, 60%, 100% { opacity: .25; transform: scale(.8); }
          30% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
