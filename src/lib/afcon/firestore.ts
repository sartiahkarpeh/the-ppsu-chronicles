/**
 * Firestore helpers for AFCON 2025
 * Realtime listeners and CRUD operations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  QueryConstraint,
  addDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import type {
  Team,
  Player,
  Match,
  MatchEvent,
  Highlight,
  GroupStandings,
  MatchWithTeams,
} from '@/types/afcon';

// Collections
const TEAMS_COLLECTION = 'afcon_teams';
const PLAYERS_COLLECTION = 'afcon_players';
const MATCHES_COLLECTION = 'afcon_fixtures';
const HIGHLIGHTS_COLLECTION = 'afcon_highlights';
const STANDINGS_COLLECTION = 'afcon_standings';
const ADMIN_LOGS_COLLECTION = 'afcon_admin_logs';

// ============= TEAMS =============

export const getTeams = async (): Promise<Team[]> => {
  const snapshot = await getDocs(collection(db, TEAMS_COLLECTION));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
};

export const getTeam = async (teamId: string): Promise<Team | null> => {
  const docRef = doc(db, TEAMS_COLLECTION, teamId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Team : null;
};

export const createTeam = async (team: Omit<Team, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, TEAMS_COLLECTION), {
    ...team,
    updatedAt: Date.now(),
  });
  return docRef.id;
};

export const updateTeam = async (teamId: string, data: Partial<Team>): Promise<void> => {
  const docRef = doc(db, TEAMS_COLLECTION, teamId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Date.now(),
  });
};

export const deleteTeam = async (teamId: string): Promise<void> => {
  await deleteDoc(doc(db, TEAMS_COLLECTION, teamId));
};

// ============= PLAYERS =============

export const getPlayers = async (teamId?: string): Promise<Player[]> => {
  const constraints: QueryConstraint[] = teamId ? [where('teamId', '==', teamId)] : [];
  const q = query(collection(db, PLAYERS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
};

export const createPlayer = async (player: Omit<Player, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, PLAYERS_COLLECTION), {
    ...player,
    updatedAt: Date.now(),
  });
  return docRef.id;
};

export const updatePlayer = async (playerId: string, data: Partial<Player>): Promise<void> => {
  const docRef = doc(db, PLAYERS_COLLECTION, playerId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Date.now(),
  });
};

export const deletePlayer = async (playerId: string): Promise<void> => {
  await deleteDoc(doc(db, PLAYERS_COLLECTION, playerId));
};

// ============= MATCHES =============

export const getMatches = async (status?: string): Promise<Match[]> => {
  const constraints: QueryConstraint[] = status
    ? [where('status', '==', status), orderBy('kickoffUTC', 'desc')]
    : [orderBy('kickoffUTC', 'desc')];
  const q = query(collection(db, MATCHES_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
};

export const getMatch = async (matchId: string): Promise<Match | null> => {
  const docRef = doc(db, MATCHES_COLLECTION, matchId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Match : null;
};

export const createMatch = async (match: Omit<Match, 'id'>, userId: string): Promise<string> => {
  const docRef = await addDoc(collection(db, MATCHES_COLLECTION), {
    ...match,
    createdBy: userId,
    updatedAt: Date.now(),
  });
  return docRef.id;
};

export const updateMatch = async (matchId: string, data: Partial<Match>): Promise<void> => {
  const docRef = doc(db, MATCHES_COLLECTION, matchId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Date.now(),
  });
};

export const deleteMatch = async (matchId: string): Promise<void> => {
  await deleteDoc(doc(db, MATCHES_COLLECTION, matchId));
};

// Listen to live matches
export const subscribeToLiveMatches = (callback: (matches: Match[]) => void) => {
  const q = query(
    collection(db, MATCHES_COLLECTION),
    where('status', '==', 'live'),
    orderBy('kickoffUTC', 'asc')
  );
  return onSnapshot(q, snapshot => {
    const matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
    callback(matches);
  });
};

// Listen to all matches
export const subscribeToMatches = (callback: (matches: Match[]) => void) => {
  const q = query(collection(db, MATCHES_COLLECTION), orderBy('kickoffUTC', 'asc'));
  return onSnapshot(q, snapshot => {
    const matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
    callback(matches);
  });
};

// Listen to a single match
export const subscribeToMatch = (matchId: string, callback: (match: Match | null) => void) => {
  const docRef = doc(db, MATCHES_COLLECTION, matchId);
  return onSnapshot(docRef, snapshot => {
    const match = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Match : null;
    callback(match);
  });
};

// ============= MATCH EVENTS =============

export const getMatchEvents = async (matchId: string): Promise<MatchEvent[]> => {
  const q = query(
    collection(db, MATCHES_COLLECTION, matchId, 'events'),
    orderBy('minute', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatchEvent));
};

export const createMatchEvent = async (
  matchId: string,
  event: Omit<MatchEvent, 'id'>,
  userId: string
): Promise<string> => {
  const docRef = await addDoc(collection(db, MATCHES_COLLECTION, matchId, 'events'), {
    ...event,
    createdBy: userId,
    createdAt: Date.now(),
  });
  return docRef.id;
};

export const updateMatchEvent = async (
  matchId: string,
  eventId: string,
  data: Partial<MatchEvent>
): Promise<void> => {
  const docRef = doc(db, MATCHES_COLLECTION, matchId, 'events', eventId);
  await updateDoc(docRef, data);
};

export const deleteMatchEvent = async (matchId: string, eventId: string): Promise<void> => {
  await deleteDoc(doc(db, MATCHES_COLLECTION, matchId, 'events', eventId));
};

// Listen to match events
export const subscribeToMatchEvents = (
  matchId: string,
  callback: (events: MatchEvent[]) => void
) => {
  const q = query(
    collection(db, MATCHES_COLLECTION, matchId, 'events'),
    orderBy('minute', 'asc')
  );
  return onSnapshot(q, snapshot => {
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatchEvent));
    callback(events);
  });
};

// ============= HIGHLIGHTS =============

export const getHighlights = async (matchId?: string): Promise<Highlight[]> => {
  const constraints: QueryConstraint[] = matchId
    ? [where('matchId', '==', matchId), orderBy('uploadedAt', 'desc')]
    : [orderBy('uploadedAt', 'desc')];
  const q = query(collection(db, HIGHLIGHTS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Highlight));
};

export const createHighlight = async (highlight: Omit<Highlight, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, HIGHLIGHTS_COLLECTION), {
    ...highlight,
    uploadedAt: Date.now(),
  });
  return docRef.id;
};

export const deleteHighlight = async (highlightId: string): Promise<void> => {
  await deleteDoc(doc(db, HIGHLIGHTS_COLLECTION, highlightId));
};

// ============= STANDINGS =============

export const getStandings = async (groupId?: string): Promise<GroupStandings[]> => {
  if (groupId) {
    const docRef = doc(db, STANDINGS_COLLECTION, groupId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? [{ id: docSnap.id, ...docSnap.data() } as GroupStandings] : [];
  }
  const snapshot = await getDocs(collection(db, STANDINGS_COLLECTION));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupStandings));
};

// Listen to standings
export const subscribeToStandings = (callback: (standings: GroupStandings[]) => void) => {
  return onSnapshot(collection(db, STANDINGS_COLLECTION), snapshot => {
    // Get all team standings
    const teamStandings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    // Group by group letter
    const grouped = teamStandings.reduce((acc: Record<string, any[]>, standing: any) => {
      const group = standing.group || 'A';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push({
        teamId: standing.teamId,
        teamName: standing.teamName,
        played: standing.played || 0,
        won: standing.won || 0,
        drawn: standing.drawn || 0,
        lost: standing.lost || 0,
        goalsFor: standing.goalsFor || 0,
        goalsAgainst: standing.goalsAgainst || 0,
        goalDifference: standing.goalDifference || 0,
        points: standing.points || 0,
      });
      return acc;
    }, {});

    // Convert to GroupStandings array
    const groupStandings: GroupStandings[] = Object.entries(grouped).map(([groupLetter, teams]) => ({
      groupId: `group-${groupLetter.toLowerCase()}`,
      groupName: `Group ${groupLetter}`,
      teams: teams as any,
      updatedAt: Date.now(),
    }));

    callback(groupStandings);
  });
};

// ============= HELPER: Get Match with Teams =============

export const getMatchWithTeams = async (matchId: string): Promise<MatchWithTeams | null> => {
  const match = await getMatch(matchId);
  if (!match) return null;

  const [homeTeam, awayTeam, events] = await Promise.all([
    getTeam(match.homeTeamId),
    getTeam(match.awayTeamId),
    getMatchEvents(matchId),
  ]);

  return {
    ...match,
    homeTeam: homeTeam || undefined,
    awayTeam: awayTeam || undefined,
    events,
  };
};

// Admin log helper
export const logAdminAction = async (
  userId: string,
  userEmail: string,
  action: string,
  collection: string,
  documentId: string,
  details?: Record<string, any>
): Promise<void> => {
  await addDoc(collection(db, ADMIN_LOGS_COLLECTION), {
    userId,
    userEmail,
    action,
    collection,
    documentId,
    timestamp: Date.now(),
    details: details || {},
  });
};

