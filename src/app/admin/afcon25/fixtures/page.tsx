'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Play,
    Clock,
    CheckCircle,
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import dayjs from 'dayjs';
import type { Fixture, FixtureStatusType } from '@/types/fixtureTypes';
import type { Team } from '@/types/afcon';

const statusConfig = {
    upcoming: { label: 'Upcoming', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
    live: { label: 'Live', color: 'bg-red-500/20 text-red-400 animate-pulse', icon: Play },
    ht: { label: 'Half Time', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
    ft: { label: 'Full Time', color: 'bg-gray-500/20 text-gray-400', icon: CheckCircle },
    postponed: { label: 'Postponed', color: 'bg-orange-500/20 text-orange-400', icon: Clock },
    cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400', icon: Clock },
};

export default function AdminFixturesPage() {
    const router = useRouter();
    const [fixtures, setFixtures] = useState<Fixture[]>([]);
    const [teams, setTeams] = useState<Map<string, Team>>(new Map());
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<FixtureStatusType | 'all'>('all');

    // Fetch teams first
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

    // Subscribe to fixtures in real-time with team data
    useEffect(() => {
        const q = query(collection(db, 'fixtures'), orderBy('kickoffDateTime', 'asc'));
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

    // Filter fixtures
    const filteredFixtures = fixtures.filter((fixture) => {
        const matchesSearch =
            (fixture.homeTeamName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (fixture.awayTeamName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            fixture.venue.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || fixture.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handleDelete = async (fixtureId: string) => {
        if (!confirm('Are you sure you want to delete this fixture?')) return;

        try {
            await deleteDoc(doc(db, 'fixtures', fixtureId));
        } catch (error) {
            console.error('Error deleting fixture:', error);
            alert('Failed to delete fixture');
        }
    };

    const handleQuickStatus = async (fixtureId: string, newStatus: FixtureStatusType) => {
        try {
            await updateDoc(doc(db, 'fixtures', fixtureId), {
                status: newStatus,
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        }
    };

    const formatDate = (kickoff: Timestamp | Date | string) => {
        const date = kickoff instanceof Timestamp ? kickoff.toDate() : new Date(kickoff as any);
        return dayjs(date).format('MMM D, YYYY HH:mm');
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Fixtures</h1>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => router.push('/admin/afcon25/fixtures/create')}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-medium text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Add Fixture</span>
                            <span className="sm:hidden">Add</span>
                        </motion.button>
                    </div>

                    {/* Search */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search teams, venues..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white placeholder-gray-500"
                        />
                    </div>

                    {/* Status Filter Pills */}
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${statusFilter === 'all'
                                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}
                        >
                            All ({fixtures.length})
                        </button>
                        {(Object.keys(statusConfig) as FixtureStatusType[]).map((status) => {
                            const count = fixtures.filter((f) => f.status === status).length;
                            return (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${statusFilter === status
                                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                        }`}
                                >
                                    {statusConfig[status].label} ({count})
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Fixtures List */}
            <div className="px-4 py-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredFixtures.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">⚽</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            No Fixtures Found
                        </h3>
                        <p className="text-gray-500 text-sm mb-6">
                            {searchTerm || statusFilter !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Add your first fixture to get started'}
                        </p>
                        <button
                            onClick={() => router.push('/admin/afcon25/fixtures/create')}
                            className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium"
                        >
                            Add Fixture
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredFixtures.map((fixture) => {
                            const StatusIcon = statusConfig[fixture.status]?.icon || Clock;
                            return (
                                <motion.div
                                    key={fixture.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
                                >
                                    {/* Top Row: Date & Status */}
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs text-gray-500">
                                            {formatDate(fixture.kickoffDateTime)}
                                        </span>
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig[fixture.status]?.color
                                                }`}
                                        >
                                            <StatusIcon className="w-3 h-3" />
                                            {statusConfig[fixture.status]?.label}
                                        </span>
                                    </div>

                                    {/* Teams & Score */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                {fixture.homeTeamLogoUrl && (
                                                    <img
                                                        src={fixture.homeTeamLogoUrl}
                                                        alt=""
                                                        className="w-6 h-6 object-contain"
                                                    />
                                                )}
                                                <span className="font-medium text-gray-900 dark:text-white text-sm">
                                                    {fixture.homeTeamName || 'TBD'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {fixture.awayTeamLogoUrl && (
                                                    <img
                                                        src={fixture.awayTeamLogoUrl}
                                                        alt=""
                                                        className="w-6 h-6 object-contain"
                                                    />
                                                )}
                                                <span className="font-medium text-gray-900 dark:text-white text-sm">
                                                    {fixture.awayTeamName || 'TBD'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Score */}
                                        {fixture.status !== 'upcoming' && (
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                                    {fixture.homeScore} - {fixture.awayScore}
                                                </div>
                                                {fixture.currentMinute && fixture.status === 'live' && (
                                                    <span className="text-xs text-red-500 font-medium">
                                                        {fixture.currentMinute}'
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                                        {/* Status Quick Select */}
                                        <select
                                            value={fixture.status}
                                            onChange={(e) =>
                                                handleQuickStatus(fixture.id, e.target.value as FixtureStatusType)
                                            }
                                            className="text-xs px-2 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg border-0 outline-none text-gray-700 dark:text-gray-300"
                                        >
                                            {(Object.keys(statusConfig) as FixtureStatusType[]).map((status) => (
                                                <option key={status} value={status}>
                                                    {statusConfig[status].label}
                                                </option>
                                            ))}
                                        </select>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2">
                                            {/* Live Control Button */}
                                            {fixture.status === 'live' || fixture.status === 'ht' ? (
                                                <button
                                                    onClick={() =>
                                                        router.push(`/admin/afcon25/fixtures/${fixture.id}/live`)
                                                    }
                                                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                                                >
                                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                                    Live Console
                                                </button>
                                            ) : fixture.status === 'upcoming' ? (
                                                <button
                                                    onClick={async () => {
                                                        await handleQuickStatus(fixture.id, 'live');
                                                        router.push(`/admin/afcon25/fixtures/${fixture.id}/live`);
                                                    }}
                                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                                                >
                                                    <Play className="w-3 h-3" />
                                                    Go Live
                                                </button>
                                            ) : null}
                                            <button
                                                onClick={() => router.push(`/admin/afcon25/fixtures/${fixture.id}`)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(fixture.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Custom scrollbar hide */}
            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
