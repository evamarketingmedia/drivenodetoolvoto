import { NextRequest, NextResponse } from 'next/server';
import { getItems, getSession } from '@/lib/db';
import { getOrCreateVoterId, voterCookieHeader } from '@/lib/voter';
import { getVoterVotes } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { voterId, isNew } = getOrCreateVoterId(req.headers.get('cookie'));
  const session = getSession();
  const items = getItems();
  const votedIds = getVoterVotes(voterId);

  const res = NextResponse.json({
    session: {
      title: session.title,
      subtitle: session.subtitle,
      max_votes: session.max_votes,
      is_open: session.is_open,
      open_at: session.open_at,
      close_at: session.close_at,
      redirect_url: session.redirect_url,
    },
    items,
    votedIds,
    voterId,
  });

  if (isNew) res.headers.set('Set-Cookie', voterCookieHeader(voterId));
  return res;
}
