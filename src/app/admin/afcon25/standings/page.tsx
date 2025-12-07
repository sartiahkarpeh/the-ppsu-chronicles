'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, X, Trophy } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { TeamStanding, Team } from '@/types/afcon';

export default function StandingsManagement() {
    const [standings, setStandings] = useState<TeamStanding[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStanding, setEditingStanding] = useState<TeamStanding | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        teamId: '',
        teamName: '',
        group: 'A',
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
    });

    // Fetch Standings and Teams
    useEffect(() => {
        const q = query(collection(db, 'afcon_standings'), orderBy('group'), orderBy('points', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const standingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamStanding));
            setStandings(standingsData);
            setLoading(false);
        });

        const fetchTeams = async () => {
            const teamsSnap = await getDocs(query(collection(db, 'afcon_teams'), orderBy('name')));
            const teamsData = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
            setTeams(teamsData);
        };
        fetchTeams();

        return () => unsubscribe();
    }, []);

    const handleOpenModal = (standing?: TeamStanding) => {
        if (standing) {
            setEditingStanding(standing);
            setFormData({
                teamId: standing.teamId,
                teamName: standing.teamName,
                group: standing.group,
                played: standing.played,
                won: standing.won,
                drawn: standing.drawn,
                lost: standing.lost,
                goalsFor: standing.goalsFor,
                goalsAgainst: standing.goalsAgainst,
                points: standing.points,
            });
        } else {
            setEditingStanding(null);
            setFormData({
                teamId: '',
                teamName: '',
                group: 'A',
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                points: 0,
            });
        }
        setIsModalOpen(true);
    };

    const calculateStats = (data: typeof formData) => {
        const played = Number(data.won) + Number(data.drawn) + Number(data.lost);
        const points = (Number(data.won) * 3) + Number(data.drawn);
        const goalDifference = Number(data.goalsFor) - Number(data.goalsAgainst);
        return { played, points, goalDifference };
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newData = { ...formData, [name]: value };

        // Auto-calculate derived stats if input is related to match results
        if (['won', 'drawn', 'lost', 'goalsFor', 'goalsAgainst'].includes(name)) {
            const stats = calculateStats(newData);
            setFormData({ ...newData, ...stats });
        } else if (name === 'teamId') {
            const selectedTeam = teams.find(t => t.id === value);
            setFormData({ ...newData, teamName: selectedTeam?.name || '', group: selectedTeam?.group || 'A' });
        } else {
            setFormData(newData);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const stats = calculateStats(formData);
            const dataToSave = {
                ...formData,
                ...stats,
                updatedAt: serverTimestamp(),
            };

            if (editingStanding) {
                await updateDoc(doc(db, 'afcon_standings', editingStanding.id), dataToSave);
            } else {
                await addDoc(collection(db, 'afcon_standings'), {
                    ...dataToSave,
                    createdAt: serverTimestamp(),
                });
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving standing:', error);
            alert('Error saving standing. Check console.');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this standing entry?')) {
            try {
                await deleteDoc(doc(db, 'afcon_standings', id));
            } catch (error) {
                console.error('Error deleting standing:', error);
            }
        }
    };

    const filteredStandings = standings.filter(s =>
        s.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.group.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-black dark:text-white">Standings</h1>
                    <p className="text-black dark:text-gray-400">Manage group tables and points.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
                >
                    <Plus className="w-5 h-5" />
                    Add Entry
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search standings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-afcon-green focus:border-transparent outline-none transition-all"
                />
            </div>

            {/* Standings List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Group</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Team</th>
                                <th className="px-4 py-4 font-semibold text-center text-black dark:text-gray-300" title="Played">P</th>
                                <th className="px-4 py-4 font-semibold text-center text-black dark:text-gray-300" title="Won">W</th>
                                <th className="px-4 py-4 font-semibold text-center text-black dark:text-gray-300" title="Drawn">D</th>
                                <th className="px-4 py-4 font-semibold text-center text-black dark:text-gray-300" title="Lost">L</th>
                                <th className="px-4 py-4 font-semibold text-center text-black dark:text-gray-300" title="Goal Difference">GD</th>
                                <th className="px-4 py-4 font-semibold text-center text-black dark:text-gray-300" title="Points">Pts</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">Loading standings...</td></tr>
                            ) : filteredStandings.length === 0 ? (
                                <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No standings found.</td></tr>
                            ) : (
                                filteredStandings.map((standing) => (
                                    <tr key={standing.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4 font-bold text-afcon-green">{standing.group}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{standing.teamName}</td>
                                        <td className="px-4 py-4 text-center text-gray-600 dark:text-gray-400">{standing.played}</td>
                                        <td className="px-4 py-4 text-center text-gray-600 dark:text-gray-400">{standing.won}</td>
                                        <td className="px-4 py-4 text-center text-gray-600 dark:text-gray-400">{standing.drawn}</td>
                                        <td className="px-4 py-4 text-center text-gray-600 dark:text-gray-400">{standing.lost}</td>
                                        <td className="px-4 py-4 text-center text-gray-600 dark:text-gray-400">{standing.goalDifference > 0 ? '+' : ''}{standing.goalDifference}</td>
                                        <td className="px-4 py-4 text-center font-bold text-gray-900 dark:text-white">{standing.points}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(standing)}
                                                    className="p-2 text-blue-600 hover:bg-black hover:text-white dark:hover:bg-black rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(standing.id)}
                                                    className="p-2 text-red-600 hover:bg-black hover:text-white dark:hover:bg-black rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingStanding ? 'Edit Standing' : 'Add New Entry'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team</label>
                                    <select
                                        name="teamId"
                                        required
                                        value={formData.teamId}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                                    >
                                        <option value="">Select Team</option>
                                        {teams.map(team => (
                                            <option key={team.id} value={team.id}>{team.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group</label>
                                    <select
                                        name="group"
                                        value={formData.group}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                                    >
                                        {['A', 'B', 'C', 'D', 'E', 'F'].map(g => (
                                            <option key={g} value={g}>Group {g}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Won</label>
                                    <input
                                        type="number"
                                        name="won"
                                        min="0"
                                        value={formData.won}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Drawn</label>
                                    <input
                                        type="number"
                                        name="drawn"
                                        min="0"
                                        value={formData.drawn}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lost</label>
                                    <input
                                        type="number"
                                        name="lost"
                                        min="0"
                                        value={formData.lost}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goals For</label>
                                    <input
                                        type="number"
                                        name="goalsFor"
                                        min="0"
                                        value={formData.goalsFor}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goals Against</label>
                                    <input
                                        type="number"
                                        name="goalsAgainst"
                                        min="0"
                                        value={formData.goalsAgainst}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Calculated Points</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{(Number(formData.won) * 3) + Number(formData.drawn)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Matches Played</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{Number(formData.won) + Number(formData.drawn) + Number(formData.lost)}</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 rounded-xl bg-black text-white hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
                                >
                                    {editingStanding ? 'Update Entry' : 'Create Entry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
