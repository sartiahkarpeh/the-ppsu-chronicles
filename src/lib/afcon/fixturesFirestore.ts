/**
 * Firestore helpers for AFCON 2025 Fixtures
 * Real-time listeners and CRUD operations
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    QueryConstraint,
    limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import type {
    Fixture,
    FixtureFilters,
    FixtureNotificationSubscription,
    FixtureStatusType,
} from '@/types/fixtureTypes';
import type { Team } from '@/types/afcon';

// Collection names
const FIXTURES_COLLECTION = 'fixtures';
const TEAMS_COLLECTION = 'afcon_teams';
const SUBSCRIPTIONS_COLLECTION = 'fixtureNotificationSubscriptions';

// ============= TEAMS =============

/**
 * Get all teams ordered by name
 */
export async function getTeams(): Promise<Team[]> {
    const q = query(collection(db, TEAMS_COLLECTION), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    })) as Team[];
}

/**
 * Get a single team by ID
 */
export async function getTeam(teamId: string): Promise<Team | null> {
    const docRef = doc(db, TEAMS_COLLECTION, teamId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists()
        ? ({ id: docSnap.id, ...docSnap.data() } as Team)
        : null;
}

/**
 * Get multiple teams by IDs and return as a map
 */
export async function getTeamsMap(teamIds: string[]): Promise<Map<string, Team>> {
    const teamsMap = new Map<string, Team>();
    if (teamIds.length === 0) return teamsMap;

    // Firestore 'in' query supports max 10 items, so fetch individually if needed
    const uniqueIds = [...new Set(teamIds)];

    await Promise.all(
        uniqueIds.map(async (id) => {
            const team = await getTeam(id);
            if (team) {
                teamsMap.set(id, team);
            }
        })
    );

    return teamsMap;
}

/**
 * Populate fixture with team data
 */
export function populateFixtureWithTeams(
    fixture: Fixture,
    teamsMap: Map<string, Team>
): Fixture {
    const homeTeam = teamsMap.get(fixture.homeTeamId);
    const awayTeam = teamsMap.get(fixture.awayTeamId);

    return {
        ...fixture,
        homeTeamName: homeTeam?.name || 'Unknown Team',
        homeTeamLogoUrl: homeTeam?.flag_url || homeTeam?.crest_url || '',
        awayTeamName: awayTeam?.name || 'Unknown Team',
        awayTeamLogoUrl: awayTeam?.flag_url || awayTeam?.crest_url || '',
    };
}

// ============= FIXTURES CRUD =============

/**
 * Get all fixtures with optional filters
 */
export async function getFixtures(filters?: FixtureFilters): Promise<Fixture[]> {
    const constraints: QueryConstraint[] = [];

    // Apply filters
    if (filters?.status) {
        constraints.push(where('status', '==', filters.status));
    }

    if (filters?.groupOrStage) {
        constraints.push(where('groupOrStage', '==', filters.groupOrStage));
    }

    if (filters?.featured) {
        constraints.push(where('isFeatured', '==', true));
    }

    // Always order by kickoff date
    constraints.push(orderBy('kickoffDateTime', 'asc'));

    // Apply limit
    if (filters?.limit) {
        constraints.push(firestoreLimit(filters.limit));
    }

    const q = query(collection(db, FIXTURES_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    let fixtures = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    })) as Fixture[];

    // Client-side team name filter (Firestore doesn't support OR queries easily)
    if (filters?.team) {
        const searchLower = filters.team.toLowerCase();
        fixtures = fixtures.filter(
            f =>
                (f.homeTeamName?.toLowerCase().includes(searchLower)) ||
                (f.awayTeamName?.toLowerCase().includes(searchLower))
        );
    }

    // Client-side date filter
    if (filters?.date) {
        const filterDate = new Date(filters.date).toDateString();
        fixtures = fixtures.filter(f => {
            const kickoff = f.kickoffDateTime instanceof Timestamp
                ? f.kickoffDateTime.toDate()
                : new Date(f.kickoffDateTime);
            return kickoff.toDateString() === filterDate;
        });
    }

    return fixtures;
}

/**
 * Get a single fixture by ID
 */
export async function getFixture(fixtureId: string): Promise<Fixture | null> {
    const docRef = doc(db, FIXTURES_COLLECTION, fixtureId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists()
        ? ({ id: docSnap.id, ...docSnap.data() } as Fixture)
        : null;
}

/**
 * Get a fixture by slug
 */
export async function getFixtureBySlug(slug: string): Promise<Fixture | null> {
    const q = query(
        collection(db, FIXTURES_COLLECTION),
        where('slug', '==', slug),
        firestoreLimit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Fixture;
}

/**
 * Get a fixture by slug or ID (tries slug first, then falls back to ID)
 * This allows URLs to work with either friendly slugs or document IDs
 */
export async function getFixtureBySlugOrId(slugOrId: string): Promise<Fixture | null> {
    // First, try to find by slug
    const bySlug = await getFixtureBySlug(slugOrId);
    if (bySlug) return bySlug;

    // Fall back to ID lookup
    return await getFixture(slugOrId);
}

/**
 * Create a new fixture
 */
export async function createFixture(
    fixture: Omit<Fixture, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, FIXTURES_COLLECTION), {
        ...fixture,
        createdAt: now,
        updatedAt: now,
    });
    return docRef.id;
}

/**
 * Update a fixture
 */
export async function updateFixture(
    fixtureId: string,
    data: Partial<Fixture>
): Promise<void> {
    const docRef = doc(db, FIXTURES_COLLECTION, fixtureId);
    await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
    });
}

/**
 * Delete a fixture
 */
export async function deleteFixture(fixtureId: string): Promise<void> {
    await deleteDoc(doc(db, FIXTURES_COLLECTION, fixtureId));
}

// ============= REAL-TIME SUBSCRIPTIONS =============

/**
 * Subscribe to a single fixture for real-time updates
 */
export function subscribeToFixture(
    fixtureId: string,
    callback: (fixture: Fixture | null) => void
): () => void {
    const docRef = doc(db, FIXTURES_COLLECTION, fixtureId);
    return onSnapshot(docRef, snapshot => {
        const fixture = snapshot.exists()
            ? ({ id: snapshot.id, ...snapshot.data() } as Fixture)
            : null;
        callback(fixture);
    });
}

/**
 * Subscribe to fixtures list for real-time updates
 */
export function subscribeToFixtures(
    callback: (fixtures: Fixture[]) => void,
    status?: FixtureStatusType
): () => void {
    const constraints: QueryConstraint[] = [];

    if (status) {
        constraints.push(where('status', '==', status));
    }

    constraints.push(orderBy('kickoffDateTime', 'asc'));

    const q = query(collection(db, FIXTURES_COLLECTION), ...constraints);

    return onSnapshot(q, snapshot => {
        const fixtures = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Fixture[];
        callback(fixtures);
    });
}

/**
 * Subscribe to live fixtures only
 */
export function subscribeToLiveFixtures(
    callback: (fixtures: Fixture[]) => void
): () => void {
    const q = query(
        collection(db, FIXTURES_COLLECTION),
        where('status', '==', 'live'),
        orderBy('kickoffDateTime', 'asc')
    );

    return onSnapshot(q, snapshot => {
        const fixtures = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Fixture[];
        callback(fixtures);
    });
}

// ============= NOTIFICATION SUBSCRIPTIONS =============

/**
 * Check if user is subscribed to a fixture
 */
export async function isSubscribedToFixture(
    fixtureId: string,
    userIdentifier: string
): Promise<boolean> {
    const q = query(
        collection(db, SUBSCRIPTIONS_COLLECTION),
        where('fixtureId', '==', fixtureId),
        where('userIdentifier', '==', userIdentifier),
        firestoreLimit(1)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
}

/**
 * Get subscription document ID for user and fixture
 */
export async function getSubscriptionId(
    fixtureId: string,
    userIdentifier: string
): Promise<string | null> {
    const q = query(
        collection(db, SUBSCRIPTIONS_COLLECTION),
        where('fixtureId', '==', fixtureId),
        where('userIdentifier', '==', userIdentifier),
        firestoreLimit(1)
    );
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : snapshot.docs[0].id;
}

/**
 * Subscribe to fixture notifications
 */
export async function subscribeToFixtureNotifications(
    fixtureId: string,
    userIdentifier: string,
    channel: 'push' | 'inApp' = 'inApp'
): Promise<string> {
    // Check if already subscribed
    const existingId = await getSubscriptionId(fixtureId, userIdentifier);
    if (existingId) return existingId;

    const docRef = await addDoc(collection(db, SUBSCRIPTIONS_COLLECTION), {
        fixtureId,
        userIdentifier,
        channel,
        createdAt: Timestamp.now(),
    });
    return docRef.id;
}

/**
 * Unsubscribe from fixture notifications
 */
export async function unsubscribeFromFixtureNotifications(
    fixtureId: string,
    userIdentifier: string
): Promise<boolean> {
    const subscriptionId = await getSubscriptionId(fixtureId, userIdentifier);
    if (!subscriptionId) return false;

    await deleteDoc(doc(db, SUBSCRIPTIONS_COLLECTION, subscriptionId));
    return true;
}

/**
 * Get all subscriptions for a user
 */
export async function getUserSubscriptions(
    userIdentifier: string
): Promise<FixtureNotificationSubscription[]> {
    const q = query(
        collection(db, SUBSCRIPTIONS_COLLECTION),
        where('userIdentifier', '==', userIdentifier)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    })) as FixtureNotificationSubscription[];
}

// ============= TODAY'S FIXTURES =============

/**
 * Get today's fixtures
 */
export async function getTodayFixtures(): Promise<Fixture[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const q = query(
        collection(db, FIXTURES_COLLECTION),
        where('kickoffDateTime', '>=', Timestamp.fromDate(today)),
        where('kickoffDateTime', '<', Timestamp.fromDate(tomorrow)),
        orderBy('kickoffDateTime', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    })) as Fixture[];
}
