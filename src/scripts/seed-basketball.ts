import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Since this is a script, we'll need to parse the private key carefully
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase Admin credentials in .env.local');
    process.exit(1);
}

if (getApps().length === 0) {
    initializeApp({
        credential: cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}

const db = getFirestore();

// Helper to wait a bit
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const conferences = ['East', 'West'];
const teamsData = [
    // East
    { name: 'PPSU Eagles', abbreviation: 'EGL', division: 'East', primaryColor: '#ea580c', logo: '' },
    { name: 'Royal Knights', abbreviation: 'KGT', division: 'East', primaryColor: '#3b82f6', logo: '' },
    { name: 'City Spartans', abbreviation: 'SPT', division: 'East', primaryColor: '#ef4444', logo: '' },
    { name: 'Metro Lions', abbreviation: 'LIO', division: 'East', primaryColor: '#eab308', logo: '' },
    // West
    { name: 'Valley Vipers', abbreviation: 'VIP', division: 'West', primaryColor: '#22c55e', logo: '' },
    { name: 'Coastal Sharks', abbreviation: 'SHK', division: 'West', primaryColor: '#0ea5e9', logo: '' },
    { name: 'Desert Scorpions', abbreviation: 'SCP', division: 'West', primaryColor: '#f97316', logo: '' },
    { name: 'Mountain Bears', abbreviation: 'BRS', division: 'West', primaryColor: '#a855f7', logo: '' },
];

const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
const statuses = ['active', 'active', 'active', 'active', 'active', 'injured', 'out'];

const firstNames = ['James', 'Michael', 'Robert', 'John', 'David', 'William', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

function getRandomName() {
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

function getRandomHeight() {
    const feet = Math.floor(Math.random() * 2) + 5; // 5 or 6 or 7
    const inches = Math.floor(Math.random() * 12);
    return `${feet >= 7 ? 6 : feet}'${inches}"`;
}

function getRandomWeight() {
    return `${Math.floor(Math.random() * 60) + 180} lbs`;
}

async function seedDatabase() {
    console.log('🌱 Starting Database Seeding...');

    try {
        // 1. Create Teams
        console.log('Creating 8 Teams...');
        const teamIds: string[] = [];
        for (const t of teamsData) {
            const teamRef = db.collection('basketball_teams').doc();
            await teamRef.set({
                name: t.name,
                abbreviation: t.abbreviation,
                division: t.division,
                primaryColor: t.primaryColor,
                logo: t.logo,
                wins: Math.floor(Math.random() * 10),
                losses: Math.floor(Math.random() * 10),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            teamIds.push(teamRef.id);
            console.log(`Created Team: ${t.name}`);
        }

        // 2. Create Players (15 per team)
        console.log('\nCreating 15 Players per Team...');
        for (const teamId of teamIds) {
            for (let i = 1; i <= 15; i++) {
                const playerRef = db.collection('basketball_players').doc();
                const pos = positions[Math.floor(Math.random() * positions.length)];

                await playerRef.set({
                    name: getRandomName(),
                    teamId: teamId,
                    number: i.toString(),
                    position: pos,
                    height: getRandomHeight(),
                    weight: getRandomWeight(),
                    status: statuses[Math.floor(Math.random() * statuses.length)],
                    bio: 'A highly talented basketball prospect playing for the current season.',
                    stats: {
                        pointsPerGame: parseFloat((Math.random() * 30).toFixed(1)),
                        reboundsPerGame: parseFloat((Math.random() * 12).toFixed(1)),
                        assistsPerGame: parseFloat((Math.random() * 10).toFixed(1)),
                        blocksPerGame: parseFloat((Math.random() * 3).toFixed(1)),
                        stealsPerGame: parseFloat((Math.random() * 3).toFixed(1)),
                        turnoversPerGame: parseFloat((Math.random() * 4).toFixed(1)),
                        gamesPlayed: Math.floor(Math.random() * 20) + 1,
                    },
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                });
            }
            console.log(`Created 15 players for team ID: ${teamId}`);
        }

        // 3. Create Games (10 past, 5 upcoming)
        console.log('\nCreating Games...');

        // 10 Past Games
        for (let i = 0; i < 10; i++) {
            const homeIdx = Math.floor(Math.random() * 8);
            let awayIdx = Math.floor(Math.random() * 8);
            while (awayIdx === homeIdx) awayIdx = Math.floor(Math.random() * 8);

            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - (Math.floor(Math.random() * 30) + 1)); // 1-30 days ago
            pastDate.setHours(pastDate.getHours() - Math.floor(Math.random() * 24)); // Random hour

            const gameRef = db.collection('basketball_games').doc();
            await gameRef.set({
                homeTeamId: teamIds[homeIdx],
                awayTeamId: teamIds[awayIdx],
                homeScore: Math.floor(Math.random() * 40) + 80, // 80 - 120
                awayScore: Math.floor(Math.random() * 40) + 80,
                status: 'ft',
                period: 4,
                clock: '0:00',
                date: Timestamp.fromDate(pastDate),
                venue: 'PPSU Arena',
                gameType: 'regular-season',
                broadcastInfo: 'PPSU TV',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        }
        console.log('Created 10 past games.');

        // 5 Upcoming Games
        for (let i = 0; i < 5; i++) {
            const homeIdx = Math.floor(Math.random() * 8);
            let awayIdx = Math.floor(Math.random() * 8);
            while (awayIdx === homeIdx) awayIdx = Math.floor(Math.random() * 8);

            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + (Math.floor(Math.random() * 10) + 1)); // 1-10 days in future
            futureDate.setHours(19, 0, 0, 0); // 7 PM

            const gameRef = db.collection('basketball_games').doc();
            await gameRef.set({
                homeTeamId: teamIds[homeIdx],
                awayTeamId: teamIds[awayIdx],
                homeScore: 0,
                awayScore: 0,
                status: 'scheduled',
                date: Timestamp.fromDate(futureDate),
                venue: 'PPSU Arena',
                gameType: 'regular-season',
                broadcastInfo: 'PPSU Network',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        }
        console.log('Created 5 upcoming games.');

        // Also add 1 LIVE game just for fun
        const liveHomeIdx = 0;
        const liveAwayIdx = 1;
        const liveGameRef = db.collection('basketball_games').doc();
        await liveGameRef.set({
            homeTeamId: teamIds[liveHomeIdx],
            awayTeamId: teamIds[liveAwayIdx],
            homeScore: 56,
            awayScore: 52,
            status: 'live',
            period: 3,
            clock: '05:34',
            date: Timestamp.fromDate(new Date()),
            venue: 'PPSU Mega Dome',
            gameType: 'regular-season',
            broadcastInfo: 'ESPN+',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        console.log('Created 1 LIVE game.');

        // Set Page Config to use the LIVE game
        await db.collection('basketball_configs').doc('page').set({
            heroGameId: liveGameRef.id,
            showHeroSection: true,
            showScoresTicker: true,
            showScoreboard: true,
            showTeamGrid: true,
            showInjuryReport: true,
            seoTitle: 'Basketball | PPSU Chronicles',
            seoDescription: 'Follow the PPSU Basketball League',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        }, { merge: true });
        console.log('Set Page Config.');

        console.log('✅ Seeding Complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error Seeding Database:', error);
        process.exit(1);
    }
}

seedDatabase();
