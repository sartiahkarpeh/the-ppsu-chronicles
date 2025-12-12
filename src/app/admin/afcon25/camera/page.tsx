'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Camera, Wifi, Play, ChevronRight, Clock } from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Fixture } from '@/types/fixtureTypes';
import type { Team } from '@/types/afcon';
import dayjs from 'dayjs';

export default function CameraSelectPage() {
    const router = useRouter();
    const [fixtures, setFixtures] = useState<Fixture[]>([]);
    const [teams, setTeams] = useState<Map<string, Team>>(new Map());
    const [loading, setLoading] = useState(true);
    const [selectedCamera, setSelectedCamera] = useState<1 | 2 | 3 | 4>(1);

    // Fetch teams
    useEffect(() => {
        const fetchTeams = async () => {
            const q = query(collection(db, 'afcon_teams'), orderBy('name'));
            const snapshot = await getDocs(q);
            const teamsMap = new Map<string, Team>();
            snapshot.docs.forEach(doc => {
                teamsMap.set(doc.id, { id: doc.id, ...doc.data() } as Team);
            });
            setTeams(teamsMap);
        };
        fetchTeams();
    }, []);

    // Subscribe to live/upcoming fixtures
    useEffect(() => {
        const q = query(
            collection(db, 'fixtures'),
            where('status', 'in', ['live', 'ht', 'upcoming']),
            orderBy('kickoffDateTime', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fixturesData = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                const homeTeam = teams.get(data.homeTeamId);
                const awayTeam = teams.get(data.awayTeamId);

                return {
                    id: docSnap.id,
                    ...data,
                    homeTeamName: homeTeam?.name || 'TBD',
                    homeTeamLogoUrl: homeTeam?.flag_url || homeTeam?.crest_url || '',
                    awayTeamName: awayTeam?.name || 'TBD',
                    awayTeamLogoUrl: awayTeam?.flag_url || awayTeam?.crest_url || '',
                } as Fixture;
            });
            setFixtures(fixturesData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [teams]);

    const handleSelectFixture = (fixtureId: string) => {
        router.push(`/admin/afcon25/camera/${fixtureId}?cam=${selectedCamera}`);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-gradient-to-b from-[#12121a] to-transparent pb-6">
                <div className="px-4 pt-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
                            <Camera className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Camera Mode</h1>
                            <p className="text-sm text-gray-400">Stream to broadcast dashboard</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Camera Selection */}
            <div className="px-4 mb-6">
                <h2 className="text-sm text-gray-400 uppercase tracking-wider mb-3">Select Camera ID</h2>
                <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((cam) => (
                        <button
                            key={cam}
                            onClick={() => setSelectedCamera(cam as 1 | 2 | 3 | 4)}
                            className={`py-4 rounded-xl text-center font-bold transition-all ${selectedCamera === cam
                                    ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            <Camera className="w-5 h-5 mx-auto mb-1" />
                            <span className="text-xs">CAM {cam}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Connection Status */}
            <div className="px-4 mb-6">
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                    <Wifi className="w-5 h-5 text-green-400" />
                    <div className="flex-1">
                        <p className="text-sm text-green-400 font-medium">Ready to Connect</p>
                        <p className="text-xs text-gray-400">Select a match below to start streaming</p>
                    </div>
                </div>
            </div>

            {/* Fixtures List */}
            <div className="px-4 pb-8">
                <h2 className="text-sm text-gray-400 uppercase tracking-wider mb-3">Available Matches</h2>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : fixtures.length === 0 ? (
                    <div className="text-center py-12">
                        <Camera className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400">No live or upcoming matches</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {fixtures.map((fixture) => (
                            <motion.button
                                key={fixture.id}
                                onClick={() => handleSelectFixture(fixture.id)}
                                whileTap={{ scale: 0.98 }}
                                className="w-full bg-[#12121a] rounded-2xl p-4 border border-gray-800 hover:border-red-500/50 transition-all flex items-center gap-4"
                            >
                                {/* Match Info */}
                                <div className="flex-1 text-left">
                                    <div className="flex items-center gap-2 mb-2">
                                        {fixture.status === 'live' || fixture.status === 'ht' ? (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 rounded-full text-xs text-red-400">
                                                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                                                {fixture.status === 'live' ? 'LIVE' : 'HT'}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 rounded-full text-xs text-blue-400">
                                                <Clock className="w-3 h-3" />
                                                {dayjs(fixture.kickoffDateTime).format('HH:mm')}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 mb-1">
                                        {fixture.homeTeamLogoUrl && (
                                            <img src={fixture.homeTeamLogoUrl} alt="" className="w-6 h-6 object-contain" />
                                        )}
                                        <span className="text-white font-medium text-sm">{fixture.homeTeamName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {fixture.awayTeamLogoUrl && (
                                            <img src={fixture.awayTeamLogoUrl} alt="" className="w-6 h-6 object-contain" />
                                        )}
                                        <span className="text-white font-medium text-sm">{fixture.awayTeamName}</span>
                                    </div>
                                </div>

                                {/* Action */}
                                <div className="flex items-center gap-2 text-red-400">
                                    <Play className="w-5 h-5" />
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </motion.button>
                        ))}
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="px-4 pb-20">
                <div className="bg-gray-800/50 rounded-xl p-4">
                    <h3 className="text-sm text-white font-medium mb-2">📱 How to Stream</h3>
                    <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                        <li>Select your Camera ID (1-4)</li>
                        <li>Tap on a match to open streaming view</li>
                        <li>Grant camera and microphone access</li>
                        <li>Tap "Start Streaming" to connect</li>
                        <li>Admin will see your feed on their dashboard</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
