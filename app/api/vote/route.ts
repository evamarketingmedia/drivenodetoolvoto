import { NextRequest, NextResponse } from 'next/server';
import { castVote } from '@/lib/db';
import { getOrCreateVoterId, voterCookieHeader } from '@/lib/voter';

export async function POST(req: NextRequest) {
  const { voterId, isNew } = getOrCreateVoterId(req.headers.get('cookie'));
  const { itemId } = await req.json();

  if (!itemId || typeof itemId !== 'number') {
    return NextResponse.json({ ok: false, error: 'Parametro non valido.' }, { status: 400 });
  }

  const result = castVote(voterId, itemId);
  const res = NextResponse.json(result, { status: result.ok ? 200 : 400 });
  if (isNew) res.headers.set('Set-Cookie', voterCookieHeader(voterId));
  return res;
}
