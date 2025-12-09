'use client';

import React, { useState, useEffect } from 'react';
import { Save, Shuffle, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Team } from '@/types/afcon';

const GROUPS = ['A', 'B'];
const TEAMS_PER_GROUP = 4;

export default function DrawManagement() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [isPublished, setIsPublished] = useState(false);
    const [togglingPublish, setTogglingPublish] = useState(false);

    // Group assignments: { groupLetter: [teamId1, teamId2, ...] }
    const [groupAssignments, setGroupAssignments] = useState<Record<string, (string | null)[]>>(() => {
        const initial: Record<string, (string | null)[]> = {};
        GROUPS.forEach(g => {
            initial[g] = Array(TEAMS_PER_GROUP).fill(null);
        });
        return initial;
    });

    // Load publish status
    useEffect(() => {
        const loadPublishStatus = async () => {
            try {
                const settingsDoc = await getDoc(doc(db, 'afcon_settings', 'draw'));
                if (settingsDoc.exists()) {
                    setIsPublished(settingsDoc.data()?.isPublished || false);
                }
            } catch (error) {
                console.error('Error loading publish status:', error);
            }
        };
        loadPublishStatus();
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'afcon_teams'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
            setTeams(teamsData);

            // Initialize assignments based on existing team groups
            const assignments: Record<string, (string | null)[]> = {};
            GROUPS.forEach(g => {
                const groupTeams = teamsData.filter(t => t.group === g).slice(0, TEAMS_PER_GROUP);
                const teamIds = groupTeams.map(t => t.id || null);
                while (teamIds.length < TEAMS_PER_GROUP) {
                    teamIds.push(null);
                }
                assignments[g] = teamIds;
            });
            setGroupAssignments(assignments);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const togglePublish = async () => {
        setTogglingPublish(true);
        try {
            const newStatus = !isPublished;
            await setDoc(doc(db, 'afcon_settings', 'draw'), {
                isPublished: newStatus,
                updatedAt: serverTimestamp()
            }, { merge: true });
            setIsPublished(newStatus);
        } catch (error) {
            console.error('Error toggling publish status:', error);
        } finally {
            setTogglingPublish(false);
        }
    };

    const getTeamById = (id: string | null): Team | undefined => {
        if (!id) return undefined;
        return teams.find(t => t.id === id);
    };

    // Get all assigned team IDs (to prevent duplicates)
    const getAssignedTeamIds = (): Set<string> => {
        const assigned = new Set<string>();
        Object.values(groupAssignments).forEach(slots => {
            slots.forEach(id => {
                if (id) assigned.add(id);
            });
        });
        return assigned;
    };

    const handleSlotChange = (group: string, slotIndex: number, teamId: string | null) => {
        setGroupAssignments(prev => {
            const newGroupSlots = [...prev[group]];
            newGroupSlots[slotIndex] = teamId;
            return { ...prev, [group]: newGroupSlots };
        });
        setSaveStatus('idle');
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveStatus('idle');
        try {
            // Update each team with their new group
            const updates: Promise<void>[] = [];

            // First, clear all team groups
            teams.forEach(team => {
                if (team.id) {
                    updates.push(
                        updateDoc(doc(db, 'afcon_teams', team.id), {
                            group: null,
                            updatedAt: serverTimestamp()
                        })
                    );
                }
            });

            // Then assign teams to their groups
            Object.entries(groupAssignments).forEach(([group, slots]) => {
                slots.forEach(teamId => {
                    if (teamId) {
                        updates.push(
                            updateDoc(doc(db, 'afcon_teams', teamId), {
                                group: group,
                                updatedAt: serverTimestamp()
                            })
                        );
                    }
                });
            });

            await Promise.all(updates);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (error) {
            console.error('Error saving draw:', error);
            setSaveStatus('error');
        } finally {
            setSaving(false);
        }
    };

    const assignedTeamIds = getAssignedTeamIds();
    const unassignedTeams = teams.filter(t => !assignedTeamIds.has(t.id || ''));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-afcon-green border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-black dark:text-white flex items-center gap-3">
                        <Shuffle className="w-8 h-8 text-afcon-green" />
                        Tournament Draw
                    </h1>
                    <p className="text-black dark:text-gray-400">
                        Assign teams to groups for the AFCON 2025 tournament.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={togglePublish}
                        disabled={togglingPublish}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-bold ${isPublished
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        {togglingPublish ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : isPublished ? (
                            <Eye className="w-5 h-5" />
                        ) : (
                            <EyeOff className="w-5 h-5" />
                        )}
                        {isPublished ? 'Published' : 'Unpublished'}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-afcon-green text-black px-6 py-3 rounded-xl hover:bg-afcon-green/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                    >
                        {saving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Save Draw
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Publish Status Banner */}
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${isPublished
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                {isPublished ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                <span>
                    {isPublished
                        ? 'The draw is visible to the public.'
                        : 'The draw is hidden. Public visitors will see "Draw will be announced soon."'}
                </span>
            </div>

            {/* Save Status */}
            {saveStatus === 'success' && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3 text-green-700 dark:text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    Draw saved successfully!
                </div>
            )}
            {saveStatus === 'error' && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    Error saving draw. Please try again.
                </div>
            )}

            {/* Unassigned Teams Count */}
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-amber-700 dark:text-amber-400 font-medium">
                    {unassignedTeams.length} team(s) not yet assigned to a group
                </p>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {GROUPS.map(group => (
                    <div
                        key={group}
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                    >
                        <div className="px-6 py-4 bg-gradient-to-r from-afcon-green to-afcon-green/80 text-black font-display font-bold text-xl">
                            Group {group}
                        </div>
                        <div className="p-4 space-y-3">
                            {groupAssignments[group].map((teamId, slotIndex) => {
                                const team = getTeamById(teamId);
                                return (
                                    <div key={slotIndex} className="relative">
                                        <select
                                            value={teamId || ''}
                                            onChange={(e) => handleSlotChange(group, slotIndex, e.target.value || null)}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green focus:border-transparent outline-none transition-all appearance-none cursor-pointer text-gray-800 dark:text-white"
                                        >
                                            <option value="">-- Select Team --</option>
                                            {teams.map(t => {
                                                const isAssignedElsewhere = assignedTeamIds.has(t.id || '') && t.id !== teamId;
                                                return (
                                                    <option
                                                        key={t.id}
                                                        value={t.id}
                                                        disabled={isAssignedElsewhere}
                                                    >
                                                        {t.name} {isAssignedElsewhere ? '(assigned)' : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        {/* Team Preview */}
                                        {team && (
                                            <div className="mt-2 flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-xl">
                                                {team.flag_url && (
                                                    <img
                                                        src={team.flag_url}
                                                        alt={`${team.name} flag`}
                                                        className="w-10 h-6 object-cover rounded border border-gray-300 dark:border-gray-600"
                                                    />
                                                )}
                                                <span className="font-medium text-gray-900 dark:text-white">{team.name}</span>
                                                {team.shortName && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">({team.shortName})</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Stats */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-2xl font-bold text-afcon-green">{teams.length}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Teams</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-2xl font-bold text-blue-600">{GROUPS.length}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Groups</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-2xl font-bold text-green-600">{assignedTeamIds.size}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Assigned</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-2xl font-bold text-amber-600">{unassignedTeams.length}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Unassigned</p>
                </div>
            </div>
        </div>
    );
}
