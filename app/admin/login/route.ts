import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const session = getSession();
  if (password === session.admin_password) {
    const res = NextResponse.json({ ok: true });
    const secure = req.headers.get('x-forwarded-proto') === 'https' ? '; Secure' : '';
    res.headers.set('Set-Cookie', `drivenode_admin=1; Path=/; Max-Age=${60 * 60 * 8}; SameSite=Lax; HttpOnly${secure}`);
    return res;
  }
  return NextResponse.json({ ok: false, error: 'Password errata.' }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', `drivenode_admin=; Path=/; Max-Age=0; Path=/`);
  return res;
}
