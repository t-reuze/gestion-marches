import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { findAnswer, SUGGESTED_QUESTIONS, SYSTEM_PROMPT, KNOWLEDGE_BASE } from '../data/copilotKnowledge';

const AZURE_ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || '';
const AZURE_KEY = import.meta.env.VITE_AZURE_OPENAI_KEY || '';
const AZURE_DEPLOYMENT = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';

function isAzureConfigured() {
  return !!(AZURE_ENDPOINT && AZURE_KEY);
}

async function callAzureOpenAI(messages) {
  const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=2024-02-01`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': AZURE_KEY },
    body: JSON.stringify({ messages, temperature: 0.3, max_tokens: 800 }),
  });
  if (!res.ok) throw new Error('Erreur Azure OpenAI : ' + res.status);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';
}

function getPageContext(pathname) {
  if (pathname === '/' || pathname === '') return 'L\'utilisateur est sur le Tableau de bord (liste des marchés).';
  if (pathname.includes('/formations')) return 'L\'utilisateur consulte la section Formations.';
  if (pathname.includes('/reporting')) return 'L\'utilisateur est dans la section Reporting.';
  if (pathname.includes('/contacts')) return 'L\'utilisateur est dans la section Contacts / Annuaire CLCC.';
  if (pathname.includes('/analyse')) return 'L\'utilisateur est sur l\'onglet Analyse d\'un marché.';
  if (pathname.includes('/notation')) return 'L\'utilisateur est sur l\'onglet Notation d\'un marché.';
  if (pathname.includes('/reponses')) return 'L\'utilisateur est sur l\'onglet Réponses fournisseurs d\'un marché.';
  if (pathname.includes('/infos')) return 'L\'utilisateur est sur l\'onglet Informations d\'un marché.';
  if (pathname.includes('/interlocuteurs')) return 'L\'utilisateur est sur l\'onglet Interlocuteurs d\'un marché.';
  if (pathname.includes('/erp')) return 'L\'utilisateur est sur l\'onglet ERP/KPI d\'un marché.';
  return '';
}

export default function CopilotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const location = useLocation();

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
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      let answer;

      // 1. Try local knowledge base first
      const localAnswer = findAnswer(q);

      if (isAzureConfigured()) {
        // 2. If Azure configured, use it with full context
        const contextMsg = getPageContext(location.pathname);
        const knowledgeContext = KNOWLEDGE_BASE.map(e => e.answer).join('\n\n---\n\n');

        const apiMessages = [
          { role: 'system', content: SYSTEM_PROMPT + '\n\nBASE DE CONNAISSANCES :\n' + knowledgeContext + (contextMsg ? '\n\nCONTEXTE ACTUEL : ' + contextMsg : '') },
          ...messages.slice(-10),
          userMsg,
        ];
        answer = await callAzureOpenAI(apiMessages);
      } else if (localAnswer) {
        // 3. Local answer found
        answer = localAnswer;
      } else {
        // 4. No answer found, suggest questions
        answer = `Je n'ai pas trouvé de réponse précise à votre question dans ma base de connaissances.

Essayez de reformuler, ou posez une question sur :
- La **navigation** dans l'outil
- La **notation** des fournisseurs
- Les **contacts** et l'annuaire CLCC
- Le **reporting** et les exports
- Les **formations**

💡 *Pour des réponses plus précises, l'administrateur peut connecter Azure OpenAI (Copilot) via les variables d'environnement.*`;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Erreur : ' + err.message }]);
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
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(232,80,26,.45)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(232,80,26,.35), 0 2px 8px rgba(0,0,0,.1)'; }}
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
          width: 400, height: 540, borderRadius: 16,
          background: '#FFFFFF', border: '1px solid rgba(15,23,42,.1)',
          boxShadow: '0 12px 40px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.06)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
            borderBottom: '1px solid rgba(15,23,42,.08)',
            background: 'linear-gradient(135deg, #FFF3EE 0%, #FFFFFF 100%)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #E8501A 0%, #FF6B35 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1A2E' }}>Assistant UNICANCER</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                {isAzureConfigured() ? 'Copilot AI actif' : 'Base de connaissances locale'}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'rgba(15,23,42,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748B', fontSize: 16, transition: 'background .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,23,42,.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(15,23,42,.06)'}
            >
              &#x2715;
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>&#x1F44B;</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1A1A2E', marginBottom: 4 }}>
                  Comment puis-je vous aider ?
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>
                  Posez une question sur l'utilisation de la plateforme.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SUGGESTED_QUESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      style={{
                        padding: '8px 14px', borderRadius: 8,
                        border: '1px solid rgba(232,80,26,.2)',
                        background: '#FFF3EE', color: '#E8501A',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        textAlign: 'left', transition: 'all .15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#E8501A'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#FFF3EE'; e.currentTarget.style.color = '#E8501A'; }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 10,
              }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 14px', borderRadius: 12,
                  fontSize: 13, lineHeight: 1.6,
                  ...(msg.role === 'user'
                    ? { background: '#E8501A', color: '#fff', borderBottomRightRadius: 4 }
                    : { background: '#F5F6FA', color: '#1A1A2E', borderBottomLeftRadius: 4, border: '1px solid rgba(15,23,42,.06)' }
                  ),
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content.split('\n').map((line, j) => {
                    // Simple markdown bold
                    const parts = line.split(/(\*\*[^*]+\*\*)/g);
                    return (
                      <div key={j} style={{ marginBottom: line === '' ? 8 : 2 }}>
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
                  display: 'flex', gap: 4, alignItems: 'center',
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
            padding: '12px 16px', borderTop: '1px solid rgba(15,23,42,.08)',
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
                transition: 'border-color .15s',
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
                transition: 'background .15s',
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
