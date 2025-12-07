import { db } from '@/firebase/config';
import {
    doc,
    collection,
    setDoc,
    updateDoc,
    addDoc,
    deleteDoc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    query,
    orderBy,
    where,
} from 'firebase/firestore';
import type {
    Match,
    LiveState,
    MatchEvent,
    Lineups,
    AuditLog,
    BroadcastSettings,
    Commentary,
} from '@/types/liveMatch';

// Collections
const MATCHES_COLLECTION = 'afcon_fixtures';

// Live State Management
export const initializeLiveState = async (matchId: string) => {
    const liveStateRef = doc(db, `${MATCHES_COLLECTION}/${matchId}/liveState/current`);

    const initialState: Partial<LiveState> = {
        matchId,
        homeScore: 0,
        awayScore: 0,
        clockMs: 0,
        period: '1H',
        isRunning: false,
        startedAt: serverTimestamp(),
        extraTime: 0,
        updatedAt: serverTimestamp(),
    };

    await setDoc(liveStateRef, initialState);
    return initialState;
};

export const updateLiveState = async (matchId: string, updates: Partial<LiveState>) => {
    const liveStateRef = doc(db, `${MATCHES_COLLECTION}/${matchId}/liveState/current`);
    await updateDoc(liveStateRef, {
        ...updates,
        updatedAt: serverTimestamp(),
    });
};

export const subscribeToLiveState = (matchId: string, callback: (state: LiveState | null) => void) => {
    const liveStateRef = doc(db, `${MATCHES_COLLECTION}/${matchId}/liveState/current`);
    return onSnapshot(liveStateRef, (snapshot) => {
        if (snapshot.exists()) {
            callback({ id: snapshot.id, ...snapshot.data() } as LiveState);
        } else {
            callback(null);
        }
    });
};

// Match Events Management
export const addMatchEvent = async (matchId: string, event: Omit<MatchEvent, 'id' | 'createdAt'>) => {
    const eventsRef = collection(db, `${MATCHES_COLLECTION}/${matchId}/events`);
    const docRef = await addDoc(eventsRef, {
        ...event,
        createdAt: serverTimestamp(),
    });

    // Log to audit
    await logAudit(matchId, {
        action: 'add_event',
        userId: event.createdBy,
        userName: event.createdByName,
        details: { eventType: event.type, eventId: docRef.id },
    });

    return docRef.id;
};

export const updateMatchEvent = async (matchId: string, eventId: string, updates: Partial<MatchEvent>) => {
    const eventRef = doc(db, `${MATCHES_COLLECTION}/${matchId}/events/${eventId}`);
    await updateDoc(eventRef, {
        ...updates,
        editedAt: serverTimestamp(),
    });

    // Log to audit
    await logAudit(matchId, {
        action: 'update_event',
        userId: updates.createdBy || '',
        userName: updates.createdByName || '',
        details: { eventId, updates },
    });
};

export const deleteMatchEvent = async (matchId: string, eventId: string, userId: string, userName: string) => {
    const eventRef = doc(db, `${MATCHES_COLLECTION}/${matchId}/events/${eventId}`);

    // Get event data before deleting for audit
    const eventSnap = await getDoc(eventRef);
    const eventData = eventSnap.data();

    await deleteDoc(eventRef);

    // Log to audit
    await logAudit(matchId, {
        action: 'delete_event',
        userId,
        userName,
        details: { eventId, deletedEvent: eventData },
    });
};

export const subscribeToMatchEvents = (matchId: string, callback: (events: MatchEvent[]) => void) => {
    const eventsRef = collection(db, `${MATCHES_COLLECTION}/${matchId}/events`);
    const q = query(eventsRef, orderBy('minute', 'asc'), orderBy('second', 'asc'));

    return onSnapshot(q, (snapshot) => {
        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatchEvent));
        callback(events);
    });
};

// Lineups Management
export const saveLineups = async (matchId: string, lineups: Lineups) => {
    const lineupsRef = doc(db, `${MATCHES_COLLECTION}/${matchId}/lineups/current`);
    await setDoc(lineupsRef, {
        ...lineups,
        updatedAt: serverTimestamp(),
    });
};

export const subscribeToLineups = (matchId: string, callback: (lineups: Lineups | null) => void) => {
    const lineupsRef = doc(db, `${MATCHES_COLLECTION}/${matchId}/lineups/current`);
    return onSnapshot(lineupsRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data() as Lineups);
        } else {
            callback(null);
        }
    });
};

// Audit Log
export const logAudit = async (
    matchId: string,
    log: Omit<AuditLog, 'id' | 'matchId' | 'timestamp'>
) => {
    const auditRef = collection(db, `${MATCHES_COLLECTION}/${matchId}/audit`);
    await addDoc(auditRef, {
        matchId,
        ...log,
        timestamp: serverTimestamp(),
    });
};

export const subscribeToAuditLogs = (matchId: string, callback: (logs: AuditLog[]) => void) => {
    const auditRef = collection(db, `${MATCHES_COLLECTION}/${matchId}/audit`);
    const q = query(auditRef, orderBy('timestamp', 'desc'));

    return onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
        callback(logs);
    });
};

// Broadcast Settings
export const saveBroadcastSettings = async (matchId: string, settings: BroadcastSettings) => {
    const broadcastRef = doc(db, `${MATCHES_COLLECTION}/${matchId}/broadcast/settings`);
    await setDoc(broadcastRef, settings);
};

export const subscribeToBroadcastSettings = (matchId: string, callback: (settings: BroadcastSettings | null) => void) => {
    const broadcastRef = doc(db, `${MATCHES_COLLECTION}/${matchId}/broadcast/settings`);
    return onSnapshot(broadcastRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data() as BroadcastSettings);
        } else {
            callback(null);
        }
    });
};

// Commentary
export const addCommentary = async (matchId: string, commentary: Omit<Commentary, 'id' | 'createdAt'>) => {
    const commentaryRef = collection(db, `${MATCHES_COLLECTION}/${matchId}/commentary`);
    const docRef = await addDoc(commentaryRef, {
        ...commentary,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
};

export const subscribeToCommentary = (matchId: string, callback: (commentary: Commentary[]) => void) => {
    const commentaryRef = collection(db, `${MATCHES_COLLECTION}/${matchId}/commentary`);
    const q = query(commentaryRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
        const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Commentary));
        callback(comments);
    });
};

// Match Status Update
export const updateMatchStatus = async (matchId: string, status: string, userId: string, userName: string) => {
    const matchRef = doc(db, MATCHES_COLLECTION, matchId);
    await updateDoc(matchRef, { status });

    // Initialize live state when going live
    if (status === 'live') {
        await initializeLiveState(matchId);
    }

    // Log to audit
    await logAudit(matchId, {
        action: 'update_status',
        userId,
        userName,
        details: { newStatus: status },
    });
};
