import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession, resetVotes } from '@/lib/db';

function isAdmin(req: NextRequest) {
  const cookie = req.headers.get('cookie') || '';
  return cookie.split(';').some(c => c.trim() === 'drivenode_admin=1');
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
  return NextResponse.json(getSession());
}

export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
  const data = await req.json();
  const allowed = ['title', 'subtitle', 'max_votes', 'is_open', 'open_at', 'close_at', 'redirect_url', 'admin_password'];
  const filtered = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
  updateSession(filtered);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
  resetVotes();
  return NextResponse.json({ ok: true });
}
