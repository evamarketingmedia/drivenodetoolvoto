'use client';
import { useEffect, useState, useCallback } from 'react';

type Item = { id: number; name: string; description: string; image_url: string; position: number; vote_count: number; active: number };
type Session = {
  title: string; subtitle: string; max_votes: number; is_open: number;
  open_at: string | null; close_at: string | null; redirect_url: string; admin_password: string;
};

function formatDatetimeLocal(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 16);
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [editItem, setEditItem] = useState<Partial<Item> | null>(null);
  const [tab, setTab] = useState<'session' | 'items' | 'results'>('session');

  const load = useCallback(async () => {
    const [sRes, iRes] = await Promise.all([
      fetch('/api/admin/session'),
      fetch('/api/admin/items'),
    ]);
    if (sRes.status === 401) { setAuthed(false); return; }
    setSession(await sRes.json());
    setItems(await iRes.json());
  }, []);

  useEffect(() => {
    fetch('/api/admin/session').then(r => {
      if (r.ok) { setAuthed(true); load(); }
    });
  }, [load]);

  async function login() {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) { setAuthed(true); load(); }
    else setLoginError('Password errata.');
  }

  async function saveSession() {
    if (!session) return;
    setSaving(true);
    await fetch('/api/admin/session', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    setSaving(false);
    setMsg('Salvato!');
    setTimeout(() => setMsg(''), 2000);
  }

  async function toggleOpen() {
    if (!session) return;
    const newSession = { ...session, is_open: session.is_open ? 0 : 1 };
    if (newSession.is_open && !newSession.open_at) {
      newSession.open_at = new Date().toISOString();
    }
    setSession(newSession);
    await fetch('/api/admin/session', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSession),
    });
  }

  async function openFor5Minutes() {
    if (!session) return;
    const now = new Date();
    const close = new Date(now.getTime() + 5 * 60 * 1000);
    const newSession = {
      ...session,
      is_open: 1,
      open_at: now.toISOString(),
      close_at: close.toISOString(),
    };
    setSession(newSession);
    await fetch('/api/admin/session', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSession),
    });
    setMsg('Votazione aperta per 5 minuti!');
    setTimeout(() => setMsg(''), 3000);
  }

  async function saveItem() {
    if (!editItem) return;
    await fetch('/api/admin/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editItem),
    });
    setEditItem(null);
    load();
  }

  async function removeItem(id: number) {
    if (!confirm('Eliminare questo elemento?')) return;
    await fetch('/api/admin/items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function resetVotes() {
    if (!confirm('Azzerare tutti i voti? Questa azione non è reversibile.')) return;
    await fetch('/api/admin/session', { method: 'DELETE' });
    load();
  }

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    setAuthed(false);
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-2xl font-black mb-1">DRIVENODE</div>
            <div className="text-gray-500 text-sm">Pannello amministratore</div>
          </div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-3 text-sm outline-none focus:border-black"
          />
          {loginError && <p className="text-red-500 text-sm mb-3">{loginError}</p>}
          <button onClick={login} className="w-full bg-black text-white rounded-xl py-3 font-semibold hover:bg-gray-800">
            Accedi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="font-black text-xl">DRIVENODE <span className="font-normal text-gray-400 text-base">Admin</span></div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-green-600 text-sm font-medium">{msg}</span>}
          <button onClick={logout} className="text-sm text-gray-500 hover:text-black">Esci</button>
        </div>
      </div>

      {/* Quick status bar */}
      <div className={`px-6 py-3 text-center text-sm font-medium ${session?.is_open ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {session?.is_open ? '🟢 Votazione APERTA' : '🔴 Votazione CHIUSA'}
        {session?.close_at && session.is_open ? ` · Chiude: ${new Date(session.close_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : ''}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        {(['session', 'items', 'results'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-black text-black' : 'text-gray-500'}`}>
            {t === 'session' ? 'Sessione' : t === 'items' ? 'Elementi' : 'Risultati'}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto p-6">

        {tab === 'session' && session && (
          <div className="space-y-5">
            <div className="flex gap-3">
              <button onClick={openFor5Minutes}
                className="flex-1 bg-black text-white rounded-xl py-3 font-semibold hover:bg-gray-800 text-sm">
                ⏱ Apri per 5 minuti
              </button>
              <button onClick={toggleOpen}
                className={`flex-1 rounded-xl py-3 font-semibold text-sm border-2 ${session.is_open ? 'border-red-400 text-red-600 hover:bg-red-50' : 'border-green-500 text-green-700 hover:bg-green-50'}`}>
                {session.is_open ? 'Chiudi votazione' : 'Apri votazione'}
              </button>
            </div>

            <Card title="Testi">
              <Label>Titolo</Label>
              <Input value={session.title} onChange={v => setSession({ ...session, title: v })} />
              <Label>Sottotitolo</Label>
              <Input value={session.subtitle} onChange={v => setSession({ ...session, subtitle: v })} />
            </Card>

            <Card title="Regole">
              <Label>Voti massimi per persona</Label>
              <input type="number" min={1} max={10} value={session.max_votes}
                onChange={e => setSession({ ...session, max_votes: Number(e.target.value) })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black" />
            </Card>

            <Card title="Finestra temporale (opzionale)">
              <Label>Apertura</Label>
              <input type="datetime-local" value={formatDatetimeLocal(session.open_at)}
                onChange={e => setSession({ ...session, open_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black" />
              <Label>Chiusura</Label>
              <input type="datetime-local" value={formatDatetimeLocal(session.close_at)}
                onChange={e => setSession({ ...session, close_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black" />
            </Card>

            <Card title="Redirect">
              <Label>URL sito (dopo il voto)</Label>
              <Input value={session.redirect_url} onChange={v => setSession({ ...session, redirect_url: v })} />
            </Card>

            <Card title="Sicurezza">
              <Label>Password admin</Label>
              <Input value={session.admin_password} onChange={v => setSession({ ...session, admin_password: v })} />
            </Card>

            <button onClick={saveSession} disabled={saving}
              className="w-full bg-black text-white rounded-xl py-3 font-semibold hover:bg-gray-800 disabled:opacity-50">
              {saving ? 'Salvataggio...' : 'Salva impostazioni'}
            </button>

            <button onClick={resetVotes}
              className="w-full border border-red-300 text-red-600 rounded-xl py-3 font-semibold hover:bg-red-50 text-sm">
              Azzera tutti i voti
            </button>
          </div>
        )}

        {tab === 'items' && (
          <div className="space-y-3">
            <button onClick={() => setEditItem({ name: '', description: '', image_url: '' })}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-gray-500 hover:border-black hover:text-black text-sm font-medium">
              + Aggiungi elemento
            </button>

            {editItem && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
                <div className="font-semibold text-sm">{editItem.id ? 'Modifica' : 'Nuovo elemento'}</div>
                <Label>Nome *</Label>
                <Input value={editItem.name || ''} onChange={v => setEditItem({ ...editItem, name: v })} placeholder="Es. Ferrari 458" />
                <Label>Descrizione</Label>
                <Input value={editItem.description || ''} onChange={v => setEditItem({ ...editItem, description: v })} placeholder="Opzionale" />
                <Label>URL immagine</Label>
                <Input value={editItem.image_url || ''} onChange={v => setEditItem({ ...editItem, image_url: v })} placeholder="https://..." />
                <div className="flex gap-2 pt-1">
                  <button onClick={saveItem} className="flex-1 bg-black text-white rounded-xl py-2.5 text-sm font-semibold">Salva</button>
                  <button onClick={() => setEditItem(null)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-500">Annulla</button>
                </div>
              </div>
            )}

            {items.map(item => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center gap-3">
                {item.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{item.name}</div>
                  {item.description && <div className="text-xs text-gray-400 truncate">{item.description}</div>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditItem(item)}
                    className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-black hover:text-black">
                    Modifica
                  </button>
                  <button onClick={() => removeItem(item.id)}
                    className="text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50">
                    Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'results' && (
          <div className="space-y-3">
            <div className="text-sm text-gray-500 mb-4">
              Totale voti: {items.reduce((a, i) => a + i.vote_count, 0)}
            </div>
            {[...items].sort((a, b) => b.vote_count - a.vote_count).map((item, idx) => {
              const max = Math.max(...items.map(i => i.vote_count), 1);
              return (
                <div key={item.id} className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-medium w-4">{idx + 1}</span>
                      <span className="font-semibold text-sm">{item.name}</span>
                    </div>
                    <span className="font-bold">{item.vote_count} voti</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-black rounded-full transition-all"
                      style={{ width: `${(item.vote_count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            <button onClick={load} className="w-full border border-gray-200 rounded-xl py-2.5 text-sm text-gray-500 hover:border-black hover:text-black mt-2">
              Aggiorna risultati
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
      <div className="font-semibold text-sm text-gray-700">{title}</div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-gray-500 font-medium -mb-1">{children}</div>;
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black" />
  );
}
