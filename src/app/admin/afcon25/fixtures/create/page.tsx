'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, ChevronDown } from 'lucide-react';
import { collection, addDoc, Timestamp, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { generateFixtureSlug, type FixtureStatusType, type FormResultType } from '@/types/fixtureTypes';
import type { Team } from '@/types/afcon';

const stageOptions = [
    'Group A',
    'Group B',
    'Group C',
    'Group D',
    'Group E',
    'Group F',
    'Round of 16',
    'Quarter-Final',
    'Semi-Final',
    'Third Place',
    'Final',
];

const statusOptions: { value: FixtureStatusType; label: string }[] = [
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'live', label: 'Live' },
    { value: 'ht', label: 'Half Time' },
    { value: 'ft', label: 'Full Time' },
    { value: 'postponed', label: 'Postponed' },
    { value: 'cancelled', label: 'Cancelled' },
];

export default function CreateFixturePage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loadingTeams, setLoadingTeams] = useState(true);
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

    // Fetch teams on mount
    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const q = query(collection(db, 'afcon_teams'), orderBy('name'));
                const snapshot = await getDocs(q);
                const teamsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Team[];
                setTeams(teamsData);
            } catch (error) {
                console.error('Error fetching teams:', error);
            } finally {
                setLoadingTeams(false);
            }
        };

        fetchTeams();
    }, []);

    const getSelectedTeam = (teamId: string) => teams.find(t => t.id === teamId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.homeTeamId || !formData.awayTeamId) {
            alert('Please select both home and away teams');
            return;
        }

        if (formData.homeTeamId === formData.awayTeamId) {
            alert('Home and away teams cannot be the same');
            return;
        }

        setSaving(true);

        try {
            const homeTeam = getSelectedTeam(formData.homeTeamId);
            const awayTeam = getSelectedTeam(formData.awayTeamId);

            const kickoffDateTime = new Date(`${formData.kickoffDate}T${formData.kickoffTime}`);
            const slug = generateFixtureSlug(
                homeTeam?.name || 'home',
                awayTeam?.name || 'away',
                kickoffDateTime
            );

            const fixtureData: Record<string, any> = {
                tournament: 'AFCON 2025',
                homeTeamId: formData.homeTeamId,
                awayTeamId: formData.awayTeamId,
                homeRecentForm: [] as FormResultType[],
                awayRecentForm: [] as FormResultType[],
                kickoffDateTime: Timestamp.fromDate(kickoffDateTime),
                venue: formData.venue,
                groupOrStage: formData.groupOrStage,
                status: formData.status,
                currentMinute: formData.status === 'upcoming' ? null : formData.currentMinute,
                homeScore: formData.homeScore,
                awayScore: formData.awayScore,
                extraTime: formData.extraTime,
                penalties: formData.penalties,
                slug,
                isFeatured: formData.isFeatured,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };

            // Only add penalty scores if penalties is enabled
            if (formData.penalties) {
                fixtureData.homePenScore = formData.homePenScore;
                fixtureData.awayPenScore = formData.awayPenScore;
            }

            await addDoc(collection(db, 'fixtures'), fixtureData);
            router.push('/admin/afcon25/fixtures');
        } catch (error) {
            console.error('Error creating fixture:', error);
            alert('Failed to create fixture');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-8">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4 px-4 py-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white">Create Fixture</h1>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-4 py-6 space-y-6">
                {/* Teams Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Teams</h2>

                    {loadingTeams ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : teams.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500 text-sm mb-4">No teams found. Please add teams first.</p>
                            <button
                                type="button"
                                onClick={() => router.push('/admin/afcon25/teams')}
                                className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm"
                            >
                                Manage Teams
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Home Team */}
                            <div className="space-y-3 mb-6">
                                <label className="text-xs font-medium text-gray-500">Home Team</label>
                                <div className="relative">
                                    <select
                                        required
                                        value={formData.homeTeamId}
                                        onChange={(e) => setFormData({ ...formData, homeTeamId: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-sm appearance-none pr-10"
                                    >
                                        <option value="">Select home team...</option>
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
                                {formData.homeTeamId && (
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        {getSelectedTeam(formData.homeTeamId)?.flag_url ? (
                                            <img
                                                src={getSelectedTeam(formData.homeTeamId)?.flag_url}
                                                alt=""
                                                className="w-10 h-10 object-contain rounded"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center">
                                                <span className="text-xs font-bold text-gray-500">
                                                    {getSelectedTeam(formData.homeTeamId)?.fifa_code}
                                                </span>
                                            </div>
                                        )}
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {getSelectedTeam(formData.homeTeamId)?.name}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Away Team */}
                            <div className="space-y-3">
                                <label className="text-xs font-medium text-gray-500">Away Team</label>
                                <div className="relative">
                                    <select
                                        required
                                        value={formData.awayTeamId}
                                        onChange={(e) => setFormData({ ...formData, awayTeamId: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-sm appearance-none pr-10"
                                    >
                                        <option value="">Select away team...</option>
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
                                {formData.awayTeamId && (
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        {getSelectedTeam(formData.awayTeamId)?.flag_url ? (
                                            <img
                                                src={getSelectedTeam(formData.awayTeamId)?.flag_url}
                                                alt=""
                                                className="w-10 h-10 object-contain rounded"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center">
                                                <span className="text-xs font-bold text-gray-500">
                                                    {getSelectedTeam(formData.awayTeamId)?.fifa_code}
                                                </span>
                                            </div>
                                        )}
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {getSelectedTeam(formData.awayTeamId)?.name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Match Details */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Match Details</h2>

                    <div className="space-y-4">
                        {/* Date & Time */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 block mb-2">Date</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.kickoffDate}
                                    onChange={(e) => setFormData({ ...formData, kickoffDate: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 block mb-2">Time</label>
                                <input
                                    type="time"
                                    required
                                    value={formData.kickoffTime}
                                    onChange={(e) => setFormData({ ...formData, kickoffTime: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-sm"
                                />
                            </div>
                        </div>

                        {/* Venue */}
                        <div>
                            <label className="text-xs font-medium text-gray-500 block mb-2">Venue</label>
                            <input
                                type="text"
                                required
                                value={formData.venue}
                                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                                placeholder="Stadium name"
                                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-sm"
                            />
                        </div>

                        {/* Group/Stage */}
                        <div>
                            <label className="text-xs font-medium text-gray-500 block mb-2">Group / Stage</label>
                            <select
                                value={formData.groupOrStage}
                                onChange={(e) => setFormData({ ...formData, groupOrStage: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-sm"
                            >
                                {stageOptions.map((stage) => (
                                    <option key={stage} value={stage}>
                                        {stage}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="text-xs font-medium text-gray-500 block mb-2">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as FixtureStatusType })}
                                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-sm"
                            >
                                {statusOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Score Section (if not upcoming) */}
                {formData.status !== 'upcoming' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Score</h2>

                        <div className="grid grid-cols-3 gap-3 items-center mb-4">
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

                        {formData.status === 'live' && (
                            <div>
                                <label className="text-xs font-medium text-gray-500 block mb-2">Current Minute</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="130"
                                    value={formData.currentMinute}
                                    onChange={(e) => setFormData({ ...formData, currentMinute: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-sm"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Extra Time & Penalties */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Extra Time & Penalties</h2>

                    <div className="space-y-4">
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

                        {formData.penalties && (
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-2">Home Pen</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.homePenScore}
                                        onChange={(e) => setFormData({ ...formData, homePenScore: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-2">Away Pen</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.awayPenScore}
                                        onChange={(e) => setFormData({ ...formData, awayPenScore: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 outline-none text-gray-900 dark:text-white text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Featured Toggle */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Featured Match</span>
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

                {/* Submit Button */}
                <motion.button
                    type="submit"
                    disabled={saving || loadingTeams || teams.length === 0}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {saving ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            Create Fixture
                        </>
                    )}
                </motion.button>
            </form>
        </div>
    );
}
