'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Camera, Wifi, Play, ChevronRight, Clock, ArrowLeft } from 'lucide-react';
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
        // Fixed fullscreen overlay - covers admin panel in landscape
        <div className="fixed inset-0 z-[9999] bg-[#0a0a0f] overflow-auto">
            {/* Compact Header */}
            <div className="sticky top-0 z-50 bg-gradient-to-b from-[#0a0a0f] to-transparent">
                <div className="px-3 py-3 flex items-center gap-3">
                    <button
                        onClick={() => router.push('/admin/afcon25')}
                        className="p-2 bg-gray-800 rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                        <Camera className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white">Camera Mode</h1>
                        <p className="text-[10px] text-gray-400">Stream to broadcast</p>
                    </div>
                </div>
            </div>

            {/* Main Content - Responsive grid for landscape */}
            <div className="px-3 pb-6 flex flex-col lg:flex-row gap-4">
                {/* Left Column - Camera Selection & Status */}
                <div className="lg:w-1/3 space-y-3">
                    {/* Camera Selection - Compact */}
                    <div>
                        <h2 className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Camera ID</h2>
                        <div className="grid grid-cols-4 gap-1.5">
                            {[1, 2, 3, 4].map((cam) => (
                                <button
                                    key={cam}
                                    onClick={() => setSelectedCamera(cam as 1 | 2 | 3 | 4)}
                                    className={`py-2 rounded-lg text-center font-bold transition-all ${selectedCamera === cam
                                        ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white'
                                        : 'bg-gray-800 text-gray-400'
                                        }`}
                                >
                                    <span className="text-xs">CAM {cam}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Connection Status - Compact */}
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-green-400" />
                        <div className="flex-1">
                            <p className="text-xs text-green-400 font-medium">Ready</p>
                            <p className="text-[10px] text-gray-400">Select a match</p>
                        </div>
                    </div>

                    {/* Instructions - Compact */}
                    <div className="bg-gray-800/50 rounded-lg p-2 hidden lg:block">
                        <h3 className="text-xs text-white font-medium mb-1">📱 How to Stream</h3>
                        <ol className="text-[10px] text-gray-400 space-y-0.5 list-decimal list-inside">
                            <li>Select Camera ID (1-4)</li>
                            <li>Tap a match to start</li>
                            <li>Grant camera access</li>
                            <li>Tap Stream to connect</li>
                        </ol>
                    </div>
                </div>

                {/* Right Column - Fixtures List */}
                <div className="lg:flex-1">
                    <h2 className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Available Matches</h2>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : fixtures.length === 0 ? (
                        <div className="text-center py-8">
                            <Camera className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">No live or upcoming matches</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[60vh] overflow-auto">
                            {fixtures.map((fixture) => (
                                <motion.button
                                    key={fixture.id}
                                    onClick={() => handleSelectFixture(fixture.id)}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full bg-[#12121a] rounded-xl p-3 border border-gray-800 hover:border-red-500/50 transition-all flex items-center gap-3"
                                >
                                    {/* Match Info */}
                                    <div className="flex-1 text-left">
                                        <div className="flex items-center gap-2 mb-1">
                                            {fixture.status === 'live' || fixture.status === 'ht' ? (
                                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/20 rounded-full text-[10px] text-red-400">
                                                    <span className="w-1 h-1 bg-red-400 rounded-full animate-pulse" />
                                                    {fixture.status === 'live' ? 'LIVE' : 'HT'}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/20 rounded-full text-[10px] text-blue-400">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    {dayjs(fixture.kickoffDateTime).format('HH:mm')}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {fixture.homeTeamLogoUrl && (
                                                <img src={fixture.homeTeamLogoUrl} alt="" className="w-5 h-5 object-contain" />
                                            )}
                                            <span className="text-white font-medium text-xs">{fixture.homeTeamName}</span>
                                            <span className="text-gray-500 text-xs">vs</span>
                                            <span className="text-white font-medium text-xs">{fixture.awayTeamName}</span>
                                            {fixture.awayTeamLogoUrl && (
                                                <img src={fixture.awayTeamLogoUrl} alt="" className="w-5 h-5 object-contain" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <div className="flex items-center gap-1 text-red-400">
                                        <Play className="w-4 h-4" />
                                        <ChevronRight className="w-3 h-3" />
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
