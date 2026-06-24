import { v4 as uuidv4 } from 'uuid';

const COOKIE_NAME = 'drivenode_voter_id';

export function getOrCreateVoterId(cookieHeader: string | null): { voterId: string; isNew: boolean } {
  if (cookieHeader) {
    const match = cookieHeader.split(';').find(c => c.trim().startsWith(COOKIE_NAME + '='));
    if (match) {
      const id = match.split('=')[1]?.trim();
      if (id) return { voterId: id, isNew: false };
    }
  }
  return { voterId: uuidv4(), isNew: true };
}

export function voterCookieHeader(voterId: string): string {
  return `${COOKIE_NAME}=${voterId}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax; HttpOnly`;
}
