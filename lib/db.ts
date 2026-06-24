import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'votes.db');

let db: Database.Database;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initDb(db);
  }
  return db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS voting_session (
      id INTEGER PRIMARY KEY DEFAULT 1,
      title TEXT NOT NULL DEFAULT 'Votazione',
      subtitle TEXT NOT NULL DEFAULT 'Seleziona le tue preferite',
      max_votes INTEGER NOT NULL DEFAULT 3,
      is_open INTEGER NOT NULL DEFAULT 0,
      open_at TEXT,
      close_at TEXT,
      redirect_url TEXT NOT NULL DEFAULT 'https://drivenode.netlify.app',
      admin_password TEXT NOT NULL DEFAULT 'drivenode2024'
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      position INTEGER NOT NULL DEFAULT 0,
      vote_count INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voter_id TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(voter_id, item_id)
    );
  `);

  // seed default session
  const session = db.prepare('SELECT id FROM voting_session WHERE id = 1').get();
  if (!session) {
    db.prepare(`INSERT INTO voting_session (id, title, subtitle, max_votes, is_open, redirect_url, admin_password)
      VALUES (1, 'Votazione Auto', 'Seleziona le tue preferite', 3, 0, 'https://drivenode.netlify.app', 'drivenode2024')`).run();
  }

  // seed default items if empty
  const count = (db.prepare('SELECT COUNT(*) as c FROM items').get() as { c: number }).c;
  if (count === 0) {
    const insert = db.prepare('INSERT INTO items (name, position) VALUES (?, ?)');
    for (let i = 1; i <= 10; i++) {
      insert.run(`Auto #${i}`, i);
    }
  }
}

export type VotingSession = {
  id: number;
  title: string;
  subtitle: string;
  max_votes: number;
  is_open: number;
  open_at: string | null;
  close_at: string | null;
  redirect_url: string;
  admin_password: string;
};

export type Item = {
  id: number;
  name: string;
  description: string;
  image_url: string;
  position: number;
  vote_count: number;
  active: number;
};

export function getSession(): VotingSession {
  return getDb().prepare('SELECT * FROM voting_session WHERE id = 1').get() as VotingSession;
}

export function updateSession(data: Partial<VotingSession>) {
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
  getDb().prepare(`UPDATE voting_session SET ${fields} WHERE id = 1`).run(...Object.values(data));
}

export function getItems(): Item[] {
  return getDb().prepare('SELECT * FROM items WHERE active = 1 ORDER BY position').all() as Item[];
}

export function getAllItems(): Item[] {
  return getDb().prepare('SELECT * FROM items ORDER BY position').all() as Item[];
}

export function upsertItem(item: Partial<Item> & { id?: number }) {
  if (item.id) {
    const fields = Object.entries(item).filter(([k]) => k !== 'id').map(([k]) => `${k} = ?`).join(', ');
    getDb().prepare(`UPDATE items SET ${fields} WHERE id = ?`).run(...Object.entries(item).filter(([k]) => k !== 'id').map(([, v]) => v), item.id);
  } else {
    const maxPos = (getDb().prepare('SELECT MAX(position) as m FROM items').get() as { m: number }).m || 0;
    getDb().prepare('INSERT INTO items (name, description, image_url, position) VALUES (?, ?, ?, ?)').run(item.name || 'Nuovo', item.description || '', item.image_url || '', maxPos + 1);
  }
}

export function deleteItem(id: number) {
  getDb().prepare('DELETE FROM items WHERE id = ?').run(id);
}

export function getVoterVotes(voterId: string): number[] {
  const rows = getDb().prepare('SELECT item_id FROM votes WHERE voter_id = ?').all(voterId) as { item_id: number }[];
  return rows.map(r => r.item_id);
}

export function castVote(voterId: string, itemId: number): { ok: boolean; error?: string } {
  const session = getSession();

  if (!session.is_open) return { ok: false, error: 'La votazione non è aperta.' };

  const now = new Date();
  if (session.open_at && new Date(session.open_at) > now) return { ok: false, error: 'La votazione non è ancora iniziata.' };
  if (session.close_at && new Date(session.close_at) < now) return { ok: false, error: 'La votazione è terminata.' };

  const existing = getDb().prepare('SELECT COUNT(*) as c FROM votes WHERE voter_id = ?').get(voterId) as { c: number };
  if (existing.c >= session.max_votes) return { ok: false, error: `Puoi votare al massimo ${session.max_votes} preferiti.` };

  try {
    getDb().prepare('INSERT INTO votes (voter_id, item_id) VALUES (?, ?)').run(voterId, itemId);
    getDb().prepare('UPDATE items SET vote_count = vote_count + 1 WHERE id = ?').run(itemId);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Hai già votato per questo elemento.' };
  }
}

export function resetVotes() {
  getDb().exec('DELETE FROM votes; UPDATE items SET vote_count = 0;');
}
