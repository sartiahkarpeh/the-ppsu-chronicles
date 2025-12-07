'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Save,
    Play,
    Pause,
    Square,
    Plus,
    Minus,
    AlertCircle,
    ChevronDown,
} from 'lucide-react';
import { doc, onSnapshot, updateDoc, Timestamp, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Fixture, FixtureStatusType } from '@/types/fixtureTypes';
import type { Team } from '@/types/afcon';
import dayjs from 'dayjs';

const stageOptions = [
    'Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F',
    'Round of 16', 'Quarter-Final', 'Semi-Final', 'Third Place', 'Final',
];

export default function EditFixturePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [fixture, setFixture] = useState<Fixture | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [teamsMap, setTeamsMap] = useState<Map<string, Team>>(new Map());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        homeTeamId: '',
        awayTeamId: '',
        kickoffDate: '',
        kickoffTime: '',
        venue: '',
        groupOrStage: 'Group A',
        status: 'upcoming' as FixtureStatusType,
        homeScore: 0,
        awayScore: 0,
        currentMinute: 0,
        extraTime: false,
        penalties: false,
        homePenScore: 0,
        awayPenScore: 0,
        isFeatured: false,
    });

    // Fetch teams
    useEffect(() => {
        const fetchTeams = async () => {
            const q = query(collection(db, 'afcon_teams'), orderBy('name'));
            const snapshot = await getDocs(q);
            const teamsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Team[];
            setTeams(teamsData);
            const map = new Map<string, Team>();
            teamsData.forEach(t => map.set(t.id!, t));
            setTeamsMap(map);
        };
        fetchTeams();
    }, []);

    // Subscribe to fixture
    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, 'fixtures', resolvedParams.id),
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = { id: docSnap.id, ...docSnap.data() } as Fixture;
                    setFixture(data);

                    // Convert to form data
                    const kickoff = data.kickoffDateTime instanceof Timestamp
                        ? data.kickoffDateTime.toDate()
                        : new Date(data.kickoffDateTime as any);

                    setFormData({
                        homeTeamId: data.homeTeamId || '',
                        awayTeamId: data.awayTeamId || '',
                        kickoffDate: dayjs(kickoff).format('YYYY-MM-DD'),
                        kickoffTime: dayjs(kickoff).format('HH:mm'),
                        venue: data.venue,
                        groupOrStage: data.groupOrStage,
                        status: data.status,
                        homeScore: data.homeScore || 0,
                        awayScore: data.awayScore || 0,
                        currentMinute: data.currentMinute || 0,
                        extraTime: data.extraTime || false,
                        penalties: data.penalties || false,
                        homePenScore: data.homePenScore || 0,
                        awayPenScore: data.awayPenScore || 0,
                        isFeatured: data.isFeatured || false,
                    });
                }
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [resolvedParams.id]);

    const getTeam = (teamId: string) => teamsMap.get(teamId);

    const handleSave = async () => {
        setSaving(true);
        try {
            const kickoffDateTime = new Date(`${formData.kickoffDate}T${formData.kickoffTime}`);

            await updateDoc(doc(db, 'fixtures', resolvedParams.id), {
                homeTeamId: formData.homeTeamId,
                awayTeamId: formData.awayTeamId,
                kickoffDateTime: Timestamp.fromDate(kickoffDateTime),
                venue: formData.venue,
                groupOrStage: formData.groupOrStage,
                status: formData.status,
                homeScore: formData.homeScore,
                awayScore: formData.awayScore,
                currentMinute: formData.status === 'upcoming' ? null : formData.currentMinute,
                extraTime: formData.extraTime,
                penalties: formData.penalties,
                homePenScore: formData.penalties ? formData.homePenScore : null,
                awayPenScore: formData.penalties ? formData.awayPenScore : null,
                isFeatured: formData.isFeatured,
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error saving fixture:', error);
            alert('Failed to save fixture');
        } finally {
            setSaving(false);
        }
    };

    const handleQuickScoreUpdate = async (team: 'home' | 'away', delta: number) => {
        const newScore = Math.max(0, (team === 'home' ? formData.homeScore : formData.awayScore) + delta);

        setFormData((prev) => ({
            ...prev,
            [team === 'home' ? 'homeScore' : 'awayScore']: newScore,
        }));

        try {
            await updateDoc(doc(db, 'fixtures', resolvedParams.id), {
                [team === 'home' ? 'homeScore' : 'awayScore']: newScore,
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error updating score:', error);
        }
    };

    const handleQuickMinuteUpdate = async (delta: number) => {
        const newMinute = Math.max(0, Math.min(130, formData.currentMinute + delta));
        setFormData((prev) => ({ ...prev, currentMinute: newMinute }));

        try {
            await updateDoc(doc(db, 'fixtures', resolvedParams.id), {
                currentMinute: newMinute,
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error updating minute:', error);
        }
    };

    const handleQuickStatusChange = async (newStatus: FixtureStatusType) => {
        setFormData((prev) => ({ ...prev, status: newStatus }));

        try {
            await updateDoc(doc(db, 'fixtures', resolvedParams.id), {
                status: newStatus,
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!fixture) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Fixture Not Found</h1>
                <button
                    onClick={() => router.push('/admin/afcon25/fixtures')}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium"
                >
                    Back to Fixtures
                </button>
            </div>
        );
    }

    const isLive = formData.status === 'live' || formData.status === 'ht';
    const homeTeam = getTeam(formData.homeTeamId);
    const awayTeam = getTeam(formData.awayTeamId);

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-8">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Edit Fixture</h1>
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 text-white rounded-xl font-medium text-sm flex items-center gap-2"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save
                    </motion.button>
                </div>
            </div>

            <div className="px-4 py-6 space-y-6">
                {/* Live Controls (shown when match is live) */}
                {isLive && (
                    <div className="bg-red-900/20 rounded-2xl p-4 border border-red-500/30">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            <h2 className="text-lg font-bold text-white">Live Controls</h2>
                        </div>

                        {/* Quick Status Buttons */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            <button
                                onClick={() => handleQuickStatusChange('live')}
                                className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${formData.status === 'live'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-700 text-gray-300'
                                    }`}
                            >
                                <Play className="w-4 h-4" />
                                Live
                            </button>
                            <button
                                onClick={() => handleQuickStatusChange('ht')}
                                className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${formData.status === 'ht'
                                        ? 'bg-yellow-500 text-black'
                                        : 'bg-gray-700 text-gray-300'
                                    }`}
                            >
                                <Pause className="w-4 h-4" />
                                Half Time
                            </button>
                            <button
                                onClick={() => handleQuickStatusChange('ft')}
                                className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${formData.status === 'ft'
                                        ? 'bg-gray-500 text-white'
                                        : 'bg-gray-700 text-gray-300'
                                    }`}
                            >
                                <Square className="w-4 h-4" />
                                Full Time
                            </button>
                        </div>

                        {/* Score Controls */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            {/* Home Score */}
                            <div className="text-center">
                                <span className="text-xs text-gray-400 block mb-2">
                                    {homeTeam?.name?.substring(0, 10) || 'Home'}
                                </span>
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => handleQuickScoreUpdate('home', -1)}
                                        className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-white"
                                    >
                                        <Minus className="w-5 h-5" />
                                    </button>
                                    <span className="text-3xl font-bold text-white w-12 text-center">
                                        {formData.homeScore}
                                    </span>
                                    <button
                                        onClick={() => handleQuickScoreUpdate('home', 1)}
                                        className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Minute */}
                            <div className="text-center">
                                <span className="text-xs text-gray-400 block mb-2">Minute</span>
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => handleQuickMinuteUpdate(-1)}
                                        className="w-8 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-white"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="text-3xl font-bold text-red-500 w-12 text-center">
                                        {formData.currentMinute}'
                                    </span>
                                    <button
                                        onClick={() => handleQuickMinuteUpdate(1)}
                                        className="w-8 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-white"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Away Score */}
                            <div className="text-center">
                                <span className="text-xs text-gray-400 block mb-2">
                                    {awayTeam?.name?.substring(0, 10) || 'Away'}
                                </span>
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => handleQuickScoreUpdate('away', -1)}
                                        className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-white"
                                    >
                                        <Minus className="w-5 h-5" />
                                    </button>
                                    <span className="text-3xl font-bold text-white w-12 text-center">
                                        {formData.awayScore}
                                    </span>
                                    <button
                                        onClick={() => handleQuickScoreUpdate('away', 1)}
                                        className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Teams Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Teams</h2>

                    <div className="space-y-4">
                        {/* Home Team */}
                        <div>
                            <label className="text-xs font-medium text-gray-500 block mb-2">Home Team</label>
                            <div className="relative">
                                <select
                                    value={formData.homeTeamId}
                                    onChange={(e) => setFormData({ ...formData, homeTeamId: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-sm appearance-none pr-10"
                                >
                                    <option value="">Select team...</option>
                                    {teams.map((team) => (
                                        <option
                                            key={team.id}
                                            value={team.id}
                                            disabled={team.id === formData.awayTeamId}
                                        >
                                            {team.name} ({team.fifa_code})
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                            {homeTeam && (
                                <div className="flex items-center gap-3 mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    {homeTeam.flag_url ? (
                                        <img src={homeTeam.flag_url} alt="" className="w-8 h-8 object-contain rounded" />
                                    ) : (
                                        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center">
                                            <span className="text-xs font-bold">{homeTeam.fifa_code}</span>
                                        </div>
                                    )}
                                    <span className="font-medium text-gray-900 dark:text-white text-sm">{homeTeam.name}</span>
                                </div>
                            )}
                        </div>

                        {/* Away Team */}
                        <div>
                            <label className="text-xs font-medium text-gray-500 block mb-2">Away Team</label>
                            <div className="relative">
                                <select
                                    value={formData.awayTeamId}
                                    onChange={(e) => setFormData({ ...formData, awayTeamId: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-sm appearance-none pr-10"
                                >
                                    <option value="">Select team...</option>
                                    {teams.map((team) => (
                                        <option
                                            key={team.id}
                                            value={team.id}
                                            disabled={team.id === formData.homeTeamId}
                                        >
                                            {team.name} ({team.fifa_code})
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                            {awayTeam && (
                                <div className="flex items-center gap-3 mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    {awayTeam.flag_url ? (
                                        <img src={awayTeam.flag_url} alt="" className="w-8 h-8 object-contain rounded" />
                                    ) : (
                                        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center">
                                            <span className="text-xs font-bold">{awayTeam.fifa_code}</span>
                                        </div>
                                    )}
                                    <span className="font-medium text-gray-900 dark:text-white text-sm">{awayTeam.name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Match Details */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Match Details</h2>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 block mb-2">Date</label>
                                <input
                                    type="date"
                                    value={formData.kickoffDate}
                                    onChange={(e) => setFormData({ ...formData, kickoffDate: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 block mb-2">Time</label>
                                <input
                                    type="time"
                                    value={formData.kickoffTime}
                                    onChange={(e) => setFormData({ ...formData, kickoffTime: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-500 block mb-2">Venue</label>
                            <input
                                type="text"
                                value={formData.venue}
                                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-sm"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-500 block mb-2">Group / Stage</label>
                            <select
                                value={formData.groupOrStage}
                                onChange={(e) => setFormData({ ...formData, groupOrStage: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-sm"
                            >
                                {stageOptions.map((stage) => (
                                    <option key={stage} value={stage}>{stage}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-500 block mb-2">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as FixtureStatusType })}
                                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-sm"
                            >
                                <option value="upcoming">Upcoming</option>
                                <option value="live">Live</option>
                                <option value="ht">Half Time</option>
                                <option value="ft">Full Time</option>
                                <option value="postponed">Postponed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Score (if not upcoming) */}
                {formData.status !== 'upcoming' && !isLive && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Score</h2>

                        <div className="grid grid-cols-3 gap-3 items-center">
                            <div className="text-center">
                                <label className="text-xs text-gray-500 block mb-2">Home</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.homeScore}
                                    onChange={(e) => setFormData({ ...formData, homeScore: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-lg font-bold text-center"
                                />
                            </div>
                            <div className="text-center text-gray-500 text-lg font-bold">-</div>
                            <div className="text-center">
                                <label className="text-xs text-gray-500 block mb-2">Away</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.awayScore}
                                    onChange={(e) => setFormData({ ...formData, awayScore: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-lg font-bold text-center"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Toggles */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 space-y-4">
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Extra Time</span>
                        <div
                            onClick={() => setFormData({ ...formData, extraTime: !formData.extraTime })}
                            className={`w-12 h-6 rounded-full transition-colors ${formData.extraTime ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                        >
                            <div
                                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${formData.extraTime ? 'translate-x-6' : 'translate-x-0.5'
                                    }`}
                            />
                        </div>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Penalties</span>
                        <div
                            onClick={() => setFormData({ ...formData, penalties: !formData.penalties })}
                            className={`w-12 h-6 rounded-full transition-colors ${formData.penalties ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                        >
                            <div
                                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${formData.penalties ? 'translate-x-6' : 'translate-x-0.5'
                                    }`}
                            />
                        </div>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Featured Match</span>
                        <div
                            onClick={() => setFormData({ ...formData, isFeatured: !formData.isFeatured })}
                            className={`w-12 h-6 rounded-full transition-colors ${formData.isFeatured ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                        >
                            <div
                                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${formData.isFeatured ? 'translate-x-6' : 'translate-x-0.5'
                                    }`}
                            />
                        </div>
                    </label>
                </div>
            </div>
        </div>
    );
}
