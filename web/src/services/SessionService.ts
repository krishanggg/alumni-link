import { SessionRepository } from '../repositories/SessionRepository';
import type { SessionItem } from '../types/Profile';

export const SessionService = {
  listSessionsForCurrentUser(): Promise<{ sessions: SessionItem[] }> {
    return SessionRepository.listSessions();
  },

  terminateSessionForCurrentUser(id: string): Promise<{ message: string }> {
    return SessionRepository.terminateSession(id);
  },

  terminateAllSessionsForCurrentUser(): Promise<{ message: string }> {
    return SessionRepository.terminateAllSessions();
  },
};
