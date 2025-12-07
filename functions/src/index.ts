/**
 * Cloud Functions for AFCON 2025
 * Handles webhooks, scheduled syncs, and standings calculations
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// ============= WEBHOOK: Live Score Updates =============

/**
 * HTTP webhook to receive live score updates from third-party sports API
 * POST /webhookUpdate
 * 
 * Expected payload structure (example):
 * {
 *   "match_id": "external_id_123",
 *   "home_team": "Senegal",
 *   "away_team": "Egypt",
 *   "home_score": 2,
 *   "away_score": 1,
 *   "minute": 67,
 *   "status": "live",
 *   "events": [
 *     {
 *       "minute": 23,
 *       "type": "goal",
 *       "team": "Senegal",
 *       "player": "S. Mane",
 *       "description": "Header from corner"
 *     }
 *   ]
 * }
 */
export const webhookUpdate = functions.https.onRequest(async (req, res) => {
  // Security: Validate webhook signature (implement based on your provider)
  // const signature = req.headers['x-webhook-signature'];
  // if (!validateSignature(signature, req.body)) {
  //   res.status(401).send('Unauthorized');
  //   return;
  // }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const payload = req.body;
    functions.logger.info('Received webhook payload:', payload);

    // Normalize the payload to match Firestore schema
    const normalized = normalizeProviderPayload(payload);

    // Find the match by external ID or create if doesn't exist
    const matchesRef = db.collection('matches');
    const matchQuery = await matchesRef
      .where('externalId', '==', normalized.externalId)
      .limit(1)
      .get();

    let matchRef;
    if (!matchQuery.empty) {
      matchRef = matchQuery.docs[0].ref;
      
      // Check if autoImport is enabled
      const matchData = matchQuery.docs[0].data();
      if (!matchData.autoImport) {
        functions.logger.warn(`Match ${normalized.externalId} has autoImport disabled`);
        res.status(200).send({ message: 'Match locked for manual edits' });
        return;
      }
      
      // Update existing match
      await matchRef.update({
        homeScore: normalized.homeScore,
        awayScore: normalized.awayScore,
        minute: normalized.minute,
        status: normalized.status,
        updatedAt: Date.now(),
      });
      functions.logger.info(`Updated match: ${matchRef.id}`);
    } else {
      functions.logger.warn(`Match not found for external ID: ${normalized.externalId}`);
      res.status(404).send({ error: 'Match not found' });
      return;
    }

    // Process events
    if (normalized.events && normalized.events.length > 0) {
      const batch = db.batch();
      for (const event of normalized.events) {
        const eventRef = matchRef.collection('events').doc();
        batch.set(eventRef, {
          ...event,
          createdBy: 'webhook',
          createdAt: Date.now(),
        });
      }
      await batch.commit();
      functions.logger.info(`Added ${normalized.events.length} events`);
    }

    res.status(200).send({ message: 'Success', matchId: matchRef.id });
  } catch (error) {
    functions.logger.error('Webhook error:', error);
    res.status(500).send({ error: 'Internal server error' });
  }
});

/**
 * Normalize third-party API payload to Firestore schema
 * Adapt this function based on your actual sports API provider
 */
function normalizeProviderPayload(payload: any): any {
  return {
    externalId: payload.match_id || payload.id,
    homeScore: payload.home_score || 0,
    awayScore: payload.away_score || 0,
    minute: payload.minute || 0,
    status: mapStatus(payload.status),
    events: (payload.events || []).map((e: any) => ({
      minute: e.minute,
      type: mapEventType(e.type),
      teamId: e.team_id, // You'll need to map team names to IDs
      playerName: e.player,
      description: e.description || '',
    })),
  };
}

function mapStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    'NOT_STARTED': 'scheduled',
    'IN_PLAY': 'live',
    'FINISHED': 'finished',
    'POSTPONED': 'postponed',
  };
  return statusMap[status] || status.toLowerCase();
}

function mapEventType(type: string): string {
  const typeMap: { [key: string]: string } = {
    'GOAL': 'goal',
    'YELLOW_CARD': 'yellow',
    'RED_CARD': 'red',
    'SUBSTITUTION': 'sub',
    'VAR_DECISION': 'var',
  };
  return typeMap[type] || type.toLowerCase();
}

// ============= SCHEDULED SYNC: Fetch Fixtures =============

/**
 * Scheduled function to sync upcoming fixtures from sports API
 * Runs daily at 2:00 AM UTC
 * Schedule: 0 2 * * * (cron format)
 */
export const scheduledFixtureSync = functions.pubsub
  .schedule('0 2 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    functions.logger.info('Starting scheduled fixture sync');

    try {
      // Fetch from your sports API (replace with actual API)
      const apiKey = functions.config().sports?.api_key || process.env.SPORTS_API_KEY;
      const response = await axios.get('https://api.sportsprovider.com/afcon/fixtures', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      const fixtures = response.data.fixtures || [];
      functions.logger.info(`Fetched ${fixtures.length} fixtures`);

      // Batch write to Firestore
      const batch = db.batch();
      let count = 0;

      for (const fixture of fixtures) {
        const matchRef = db.collection('matches').doc();
        batch.set(matchRef, {
          externalId: fixture.id,
          homeTeamId: fixture.home_team_id,
          awayTeamId: fixture.away_team_id,
          kickoffUTC: new Date(fixture.kickoff_time).toISOString(),
          venue: fixture.venue,
          stage: fixture.stage || 'Group Stage',
          status: 'scheduled',
          homeScore: 0,
          awayScore: 0,
          minute: 0,
          autoImport: true,
          createdBy: 'scheduled_sync',
          updatedAt: Date.now(),
        });
        count++;

        // Firestore batch limit is 500
        if (count === 500) {
          await batch.commit();
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      functions.logger.info('Fixture sync completed successfully');
    } catch (error) {
      functions.logger.error('Fixture sync error:', error);
    }
  });

// ============= FIRESTORE TRIGGER: Calculate Standings =============

/**
 * Triggered when a match status changes to 'finished'
 * Automatically recalculates group standings
 */
export const onMatchFinalized = functions.firestore
  .document('matches/{matchId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger if status changed to 'finished'
    if (before.status !== 'finished' && after.status === 'finished') {
      functions.logger.info(`Match ${context.params.matchId} finished, recalculating standings`);

      try {
        await recalculateStandings(after.stage);
        functions.logger.info(`Standings updated for ${after.stage}`);
      } catch (error) {
        functions.logger.error('Error calculating standings:', error);
      }
    }
  });

/**
 * Recalculate standings for a specific group
 */
async function recalculateStandings(stage: string): Promise<void> {
  // Extract group name (e.g., "Group A" -> "group_a")
  const groupId = stage.toLowerCase().replace(/\s+/g, '_');

  // Get all matches for this group
  const matchesSnapshot = await db.collection('matches')
    .where('stage', '==', stage)
    .where('status', '==', 'finished')
    .get();

  // Initialize standings map
  const standings: { [teamId: string]: any } = {};

  // Process each match
  for (const matchDoc of matchesSnapshot.docs) {
    const match = matchDoc.data();
    
    // Initialize team entries if needed
    if (!standings[match.homeTeamId]) {
      const teamDoc = await db.collection('teams').doc(match.homeTeamId).get();
      standings[match.homeTeamId] = {
        teamId: match.homeTeamId,
        teamName: teamDoc.data()?.name || 'Unknown',
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      };
    }
    if (!standings[match.awayTeamId]) {
      const teamDoc = await db.collection('teams').doc(match.awayTeamId).get();
      standings[match.awayTeamId] = {
        teamId: match.awayTeamId,
        teamName: teamDoc.data()?.name || 'Unknown',
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      };
    }

    // Update stats
    standings[match.homeTeamId].played++;
    standings[match.awayTeamId].played++;
    standings[match.homeTeamId].goalsFor += match.homeScore;
    standings[match.homeTeamId].goalsAgainst += match.awayScore;
    standings[match.awayTeamId].goalsFor += match.awayScore;
    standings[match.awayTeamId].goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      standings[match.homeTeamId].won++;
      standings[match.homeTeamId].points += 3;
      standings[match.awayTeamId].lost++;
    } else if (match.homeScore < match.awayScore) {
      standings[match.awayTeamId].won++;
      standings[match.awayTeamId].points += 3;
      standings[match.homeTeamId].lost++;
    } else {
      standings[match.homeTeamId].drawn++;
      standings[match.awayTeamId].drawn++;
      standings[match.homeTeamId].points++;
      standings[match.awayTeamId].points++;
    }
  }

  // Calculate goal difference
  Object.values(standings).forEach((team: any) => {
    team.goalDifference = team.goalsFor - team.goalsAgainst;
  });

  // Write to standings collection
  await db.collection('standings').doc(groupId).set({
    groupId,
    groupName: stage,
    teams: Object.values(standings),
    updatedAt: Date.now(),
  });
}

// ============= OPTIONAL: YouTube Live Metadata =============

/**
 * HTTP function to fetch YouTube live stream metadata
 * GET /getYouTubeMeta?videoId=YOUTUBE_ID
 */
export const getYouTubeMeta = functions.https.onRequest(async (req, res) => {
  const videoId = req.query.videoId as string;
  
  if (!videoId) {
    res.status(400).send({ error: 'Missing videoId parameter' });
    return;
  }

  try {
    const apiKey = functions.config().youtube?.api_key || process.env.YOUTUBE_API_KEY;
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,liveStreamingDetails&key=${apiKey}`
    );

    if (response.data.items && response.data.items.length > 0) {
      const video = response.data.items[0];
      res.status(200).send({
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.high.url,
        isLive: video.snippet.liveBroadcastContent === 'live',
        viewerCount: video.liveStreamingDetails?.concurrentViewers || 0,
      });
    } else {
      res.status(404).send({ error: 'Video not found' });
    }
  } catch (error) {
    functions.logger.error('YouTube API error:', error);
    res.status(500).send({ error: 'Failed to fetch video metadata' });
  }
});

// ============= ADMIN LOG TRIGGER =============

/**
 * Write admin action logs automatically
 */
export const logAdminAction = functions.firestore
  .document('{collection}/{docId}')
  .onWrite(async (change, context) => {
    // Only log specific collections
    const allowedCollections = ['teams', 'matches', 'players', 'highlights'];
    if (!allowedCollections.includes(context.params.collection)) {
      return;
    }

    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    let action = 'update';
    if (!before && after) action = 'create';
    if (before && !after) action = 'delete';

    // Skip if no createdBy field (likely a system update)
    if (!after?.createdBy && action !== 'delete') {
      return;
    }

    await db.collection('adminLogs').add({
      userId: after?.createdBy || 'system',
      userEmail: 'system',
      action,
      collection: context.params.collection,
      documentId: context.params.docId,
      timestamp: Date.now(),
      details: { before, after },
    });
  });

