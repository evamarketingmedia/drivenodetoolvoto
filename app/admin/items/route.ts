import { NextRequest, NextResponse } from 'next/server';
import { getAllItems, upsertItem, deleteItem } from '@/lib/db';

function isAdmin(req: NextRequest) {
  const cookie = req.headers.get('cookie') || '';
  return cookie.split(';').some(c => c.trim() === 'drivenode_admin=1');
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
  return NextResponse.json(getAllItems());
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
  const item = await req.json();
  upsertItem(item);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
  const { id } = await req.json();
  deleteItem(id);
  return NextResponse.json({ ok: true });
}
