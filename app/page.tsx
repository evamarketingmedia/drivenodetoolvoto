'use client';
import { useEffect, useState, useRef } from 'react';

type Item = { id: number; name: string; description: string; image_url: string; vote_count: number };
type Session = {
  title: string; subtitle: string; max_votes: number; is_open: number;
  open_at: string | null; close_at: string | null; redirect_url: string;
};

function Countdown({ closeAt, onExpire }: { closeAt: string; onExpire: () => void }) {
  const [secs, setSecs] = useState(0);
  const called = useRef(false);

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(closeAt).getTime() - Date.now()) / 1000));
      setSecs(diff);
      if (diff === 0 && !called.current) { called.current = true; onExpire(); }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [closeAt, onExpire]);

  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return (
    <div className="text-center mb-6">
      <span className="text-sm text-gray-500 uppercase tracking-widest">Votazione chiude tra</span>
      <div className="text-4xl font-bold text-black mt-1 tabular-nums">{m}:{s}</div>
    </div>
  );
}

export default function VotePage() {
  const [data, setData] = useState<{ session: Session; items: Item[]; votedIds: number[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [sessionClosed, setSessionClosed] = useState(false);

  useEffect(() => {
    fetch('/api/items').then(r => r.json()).then(d => {
      setData(d);
      setVoted(d.votedIds || []);
      setLoading(false);
    });
  }, []);

  const session = data?.session;
  const isOpen = session?.is_open && !sessionClosed;
  const remaining = session ? session.max_votes - voted.length : 0;

  async function handleVote(itemId: number) {
    if (!isOpen || voted.includes(itemId) || remaining <= 0) return;
    setSubmitting(itemId);
    setError('');
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
    const json = await res.json();
    setSubmitting(null);
    if (json.ok) {
      const newVoted = [...voted, itemId];
      setVoted(newVoted);
      if (newVoted.length >= (session?.max_votes || 3)) {
        setTimeout(() => setDone(true), 600);
      }
    } else {
      setError(json.error || 'Errore durante il voto.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-8">
          <DrivenodeLogo />
        </div>
        <h2 className="text-3xl font-bold mb-3">Grazie per aver votato!</h2>
        <p className="text-gray-500 mb-10">Il tuo voto è stato registrato.</p>
        <a
          href={session?.redirect_url || 'https://drivenode.netlify.app'}
          className="bg-black text-white text-xl font-semibold px-10 py-5 rounded-2xl w-full max-w-sm text-center block hover:bg-gray-800 transition-colors"
        >
          Visita Drivenode
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-10 max-w-lg mx-auto">
      <div className="text-center mb-8">
        <DrivenodeLogo />
        <h1 className="text-3xl font-bold mt-4 mb-1">{session?.title || 'Votazione'}</h1>
        <p className="text-gray-500 text-sm">{session?.subtitle || 'Seleziona le tue preferite'}</p>
      </div>

      {session?.close_at && isOpen && (
        <Countdown closeAt={session.close_at} onExpire={() => setSessionClosed(true)} />
      )}

      {!isOpen ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔒</div>
          <p className="text-xl font-semibold text-gray-700">La votazione non è aperta.</p>
          <p className="text-gray-400 mt-2 text-sm">Segui le istruzioni dell'organizzatore.</p>
        </div>
      ) : (
        <>
          <div className="mb-6 text-center">
            <span className="inline-block bg-gray-100 rounded-full px-4 py-1.5 text-sm font-medium text-gray-700">
              {remaining > 0
                ? `Puoi ancora votare ${remaining} ${remaining === 1 ? 'preferito' : 'preferiti'}`
                : 'Hai utilizzato tutti i tuoi voti'}
            </span>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm text-center">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {data?.items.map(item => {
              const isVoted = voted.includes(item.id);
              const isDisabled = (!isVoted && remaining <= 0) || submitting !== null;
              return (
                <button
                  key={item.id}
                  onClick={() => handleVote(item.id)}
                  disabled={isDisabled || isVoted}
                  className={`
                    w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all
                    ${isVoted
                      ? 'border-black bg-black text-white'
                      : isDisabled
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'border-gray-200 bg-white text-black hover:border-black hover:shadow-md active:scale-98'
                    }
                  `}
                >
                  {item.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.name} className="w-14 h-14 object-cover rounded-xl flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-lg leading-tight">{item.name}</div>
                    {item.description && <div className={`text-sm mt-0.5 truncate ${isVoted ? 'text-gray-300' : 'text-gray-500'}`}>{item.description}</div>}
                  </div>
                  <div className="flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all
                    ${isVoted ? 'border-white bg-white' : 'border-gray-300'}">
                    {submitting === item.id ? (
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : isVoted ? (
                      <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {voted.length > 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setDone(true)}
                className="bg-black text-white font-semibold text-lg px-10 py-4 rounded-2xl w-full hover:bg-gray-800 transition-colors"
              >
                Conferma e vai al sito →
              </button>
            </div>
          )}
        </>
      )}

      <div className="mt-12 text-center">
        <a
          href={session?.redirect_url || 'https://drivenode.netlify.app'}
          className="text-gray-400 text-sm underline hover:text-black"
        >
          drivenode.netlify.app
        </a>
      </div>
    </div>
  );
}

function DrivenodeLogo() {
  return (
    <div className="flex items-center justify-center gap-3">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="8" fill="black" />
        <path d="M8 18 L14 10 L28 10 L28 26 L14 26 Z" fill="white" />
        <circle cx="13" cy="26" r="3" fill="black" />
        <circle cx="25" cy="26" r="3" fill="black" />
      </svg>
      <span className="text-2xl font-black tracking-tight text-black">DRIVENODE</span>
    </div>
  );
}
