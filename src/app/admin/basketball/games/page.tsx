'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, X, Radio, Video } from 'lucide-react';
import Link from 'next/link';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { BasketballGame, BasketballTeam } from '@/types/basketball';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function GamesManagement() {
    const [games, setGames] = useState<BasketballGame[]>([]);
    const [teams, setTeams] = useState<BasketballTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGame, setEditingGame] = useState<BasketballGame | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Bulk action state
    const [selectedGames, setSelectedGames] = useState<string[]>([]);
    const [isBulkRescheduleOpen, setIsBulkRescheduleOpen] = useState(false);
    const [bulkDateStr, setBulkDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [bulkTimeStr, setBulkTimeStr] = useState('19:00');

    // Form State
    const [formData, setFormData] = useState({
        homeTeamId: '',
        awayTeamId: '',
        dateStr: '',
        timeStr: '',
        venue: '',
        status: 'scheduled' as any,
        gameType: 'regular_season' as any,
        homeScore: 0,
        awayScore: 0,
        period: 0,
        clock: '12:00',
        broadcastInfo: '',
        isFeatured: false,
    });

    useEffect(() => {
        // Fetch Teams
        const qTeams = query(collection(db, 'basketball_teams'), orderBy('name'));
        const unsubscribeTeams = onSnapshot(qTeams, (snapshot) => {
            setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BasketballTeam)));
        });

        // Fetch Games
        const qGames = query(collection(db, 'basketball_games'), orderBy('date', 'desc'));
        const unsubscribeGames = onSnapshot(qGames, (snapshot) => {
            setGames(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BasketballGame)));
            setLoading(false);
        });

        return () => {
            unsubscribeTeams();
            unsubscribeGames();
        };
    }, []);

    const handleOpenModal = (game?: BasketballGame) => {
        if (game) {
            setEditingGame(game);
            const gameDate = game.date instanceof Timestamp ? game.date.toDate() : new Date(game.date.toString());

            setFormData({
                homeTeamId: game.homeTeamId,
                awayTeamId: game.awayTeamId,
                dateStr: format(gameDate, 'yyyy-MM-dd'),
                timeStr: format(gameDate, 'HH:mm'),
                venue: game.venue,
                status: game.status,
                gameType: game.gameType,
                homeScore: game.homeScore,
                awayScore: game.awayScore,
                period: game.period,
                clock: game.clock,
                broadcastInfo: game.broadcastInfo || '',
                isFeatured: game.isFeatured,
            });
        } else {
            setEditingGame(null);
            setFormData({
                homeTeamId: teams.length > 0 ? teams[0].id : '',
                awayTeamId: teams.length > 1 ? teams[1].id : (teams.length > 0 ? teams[0].id : ''),
                dateStr: format(new Date(), 'yyyy-MM-dd'),
                timeStr: '19:00',
                venue: '',
                status: 'scheduled',
                gameType: 'regular_season',
                homeScore: 0,
                awayScore: 0,
                period: 0,
                clock: '12:00',
                broadcastInfo: '',
                isFeatured: false,
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.homeTeamId === formData.awayTeamId) {
            toast.error('Home team and away team cannot be the same');
            return;
        }

        try {
            // Combine date and time string to Date object
            const combinedDateTime = new Date(`${formData.dateStr}T${formData.timeStr}`);

            const dataToSave = {
                homeTeamId: formData.homeTeamId,
                awayTeamId: formData.awayTeamId,
                date: Timestamp.fromDate(combinedDateTime),
                venue: formData.venue,
                status: formData.status,
                gameType: formData.gameType,
                homeScore: Number(formData.homeScore) || 0,
                awayScore: Number(formData.awayScore) || 0,
                period: Number(formData.period) || 0,
                clock: formData.clock,
                broadcastInfo: formData.broadcastInfo || '',
                isFeatured: formData.isFeatured,
                updatedAt: serverTimestamp(),
            };

            if (editingGame) {
                await updateDoc(doc(db, 'basketball_games', editingGame.id), dataToSave);
            } else {
                await addDoc(collection(db, 'basketball_games'), {
                    ...dataToSave,
                    createdAt: serverTimestamp(),
                });
            }
            setIsModalOpen(false);
            toast.success(editingGame ? 'Game updated successfully!' : 'Game scheduled successfully!');
        } catch (error) {
            console.error('Error saving game:', error);
            toast.error('Error saving game. Check console.');
        }
    };

    const handleDelete = async (id: string, homeName: string, awayName: string) => {
        if (confirm(`Are you sure you want to delete the game: ${awayName} at ${homeName}?`)) {
            try {
                await deleteDoc(doc(db, 'basketball_games', id));
                toast.success('Game deleted successfully');
            } catch (error) {
                console.error('Error deleting game:', error);
                toast.error('Error deleting game');
            }
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedGames(filteredGames.map(g => g.id));
        } else {
            setSelectedGames([]);
        }
    };

    const handleSelectGame = (id: string) => {
        setSelectedGames(prev =>
            prev.includes(id) ? prev.filter(gameId => gameId !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (!selectedGames.length) return;
        if (confirm(`Are you sure you want to delete ${selectedGames.length} games?`)) {
            const toastId = toast.loading('Deleting games...');
            try {
                await Promise.all(selectedGames.map(id => deleteDoc(doc(db, 'basketball_games', id))));
                toast.success(`Successfully deleted ${selectedGames.length} games`, { id: toastId });
                setSelectedGames([]);
            } catch (error) {
                console.error('Error in bulk delete:', error);
                toast.error('Failed to delete some games', { id: toastId });
            }
        }
    };

    const handleBulkReschedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGames.length) return;

        const combinedDateTime = new Date(`${bulkDateStr}T${bulkTimeStr}`);
        const toastId = toast.loading('Rescheduling games...');

        try {
            await Promise.all(selectedGames.map(id =>
                updateDoc(doc(db, 'basketball_games', id), {
                    date: Timestamp.fromDate(combinedDateTime),
                    status: 'postponed',
                    updatedAt: serverTimestamp()
                })
            ));
            toast.success(`Successfully rescheduled ${selectedGames.length} games`, { id: toastId });
            setIsBulkRescheduleOpen(false);
            setSelectedGames([]);
        } catch (error) {
            console.error('Error in bulk reschedule:', error);
            toast.error('Failed to reschedule some games', { id: toastId });
        }
    };

    const filteredGames = games.filter(game => {
        const homeTeam = teams.find(t => t.id === game.homeTeamId);
        const awayTeam = teams.find(t => t.id === game.awayTeamId);
        const searchString = `${homeTeam?.name} ${awayTeam?.name} ${homeTeam?.city} ${awayTeam?.city} ${game.venue}`.toLowerCase();
        return searchString.includes(searchTerm.toLowerCase());
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'live':
                return <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-bold animate-pulse">LIVE</span>;
            case 'active':
            case 'ht':
                return <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 rounded-full text-xs font-bold">HALF TIME</span>;
            case 'ft':
                return <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs font-bold">FINAL</span>;
            case 'postponed':
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs font-bold">POSTPONED</span>;
            case 'cancelled':
                return <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-bold">CANCELLED</span>;
            default:
                return <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-bold">UPCOMING</span>;
        }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-black dark:text-white">Games</h1>
                    <p className="text-black dark:text-gray-400">Manage basketball schedule and live scores.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-xl hover:bg-orange-700 transition-all shadow-lg hover:shadow-xl"
                >
                    <Plus className="w-5 h-5" />
                    Add Game
                </button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search games by team or venue..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none transition-all"
                />
            </div>

            {selectedGames.length > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-6 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <span className="font-medium text-orange-800 dark:text-orange-400">
                        {selectedGames.length} game{selectedGames.length > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsBulkRescheduleOpen(true)}
                            className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium shadow-sm"
                        >
                            Reschedule
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
                        >
                            Delete Selected
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-4 w-12">
                                    <input
                                        type="checkbox"
                                        checked={filteredGames.length > 0 && selectedGames.length === filteredGames.length}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                                    />
                                </th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Matchup</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Date & Time</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Status</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Score</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading games...</td></tr>
                            ) : filteredGames.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No games found.</td></tr>
                            ) : (
                                filteredGames.map((game) => {
                                    const homeTeam = teams.find(t => t.id === game.homeTeamId);
                                    const awayTeam = teams.find(t => t.id === game.awayTeamId);
                                    const gameDate = game.date instanceof Timestamp ? game.date.toDate() : new Date(game.date.toString());

                                    return (
                                        <tr key={game.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${selectedGames.includes(game.id) ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGames.includes(game.id)}
                                                    onChange={() => handleSelectGame(game.id)}
                                                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        {awayTeam?.logo ? <img src={awayTeam.logo} className="w-6 h-6 object-contain" alt="" /> : <span className="w-6 h-6">🏀</span>}
                                                        <span className="font-medium text-gray-900 dark:text-white">{awayTeam?.name || 'Unknown Away'}</span>
                                                        <span className="text-xs text-gray-500">(Away)</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {homeTeam?.logo ? <img src={homeTeam.logo} className="w-6 h-6 object-contain" alt="" /> : <span className="w-6 h-6">🏀</span>}
                                                        <span className="font-medium text-gray-900 dark:text-white">{homeTeam?.name || 'Unknown Home'}</span>
                                                        <span className="text-xs text-gray-500">(Home)</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {format(gameDate, 'MMM d, yyyy')}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {format(gameDate, 'h:mm a')} • {game.venue}
                                                </div>
                                                {game.isFeatured && (
                                                    <span className="mt-1 inline-block px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] rounded-full font-bold">FEATURED</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    {getStatusBadge(game.status)}
                                                    {game.status === 'live' && (
                                                        <div className="text-xs text-orange-600 font-medium mt-1">
                                                            Q{game.period} • {game.clock}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col font-bold font-display text-gray-900 dark:text-white">
                                                    <span>{game.awayScore}</span>
                                                    <span>{game.homeScore}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {(game.status === 'scheduled' || game.status === 'live' || game.status === 'ht') && (
                                                        <>
                                                            <Link
                                                                href={`/admin/basketball/games/${game.id}/live`}
                                                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors active:scale-95"
                                                            >
                                                                <Radio className="w-3.5 h-3.5" />
                                                                Go Live
                                                            </Link>
                                                            <Link
                                                                href={`/admin/basketball/games/${game.id}/stream`}
                                                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors active:scale-95"
                                                            >
                                                                <Video className="w-3.5 h-3.5" />
                                                                Stream
                                                            </Link>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => handleOpenModal(game)}
                                                        className="p-2 text-blue-600 hover:bg-black hover:text-white dark:hover:bg-black rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(game.id, homeTeam?.name || 'Home', awayTeam?.name || 'Away')}
                                                        className="p-2 text-red-600 hover:bg-black hover:text-white dark:hover:bg-black rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {editingGame ? 'Edit Game / Live Update' : 'Schedule New Game'}
                                {formData.status === 'live' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse border border-red-200 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                            {/* Score section stays on top for easy access during live games */}
                            {editingGame && (
                                <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6">
                                    <h4 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">Live Match Control</h4>
                                    <div className="grid grid-cols-12 gap-4 items-center">
                                        <div className="col-span-5 flex flex-col items-center">
                                            <span className="text-sm font-medium mb-2 dark:text-gray-300">Away Score</span>
                                            <div className="flex items-center gap-3">
                                                <button type="button" onClick={() => setFormData(f => ({ ...f, awayScore: Math.max(0, f.awayScore - 1) }))} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600">-</button>
                                                <input type="number" min="0" value={formData.awayScore} onChange={e => setFormData({ ...formData, awayScore: Number(e.target.value) })} className="w-20 text-center font-display text-3xl font-bold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 outline-none" />
                                                <button type="button" onClick={() => setFormData(f => ({ ...f, awayScore: f.awayScore + 1 }))} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600">+</button>
                                            </div>
                                        </div>

                                        <div className="col-span-2 flex flex-col items-center gap-3 border-l border-r border-gray-200 dark:border-gray-700 px-2 justify-center">
                                            <div className="text-center w-full">
                                                <label className="text-[10px] uppercase font-bold text-gray-500 block">Qtr</label>
                                                <input type="number" min="0" max="10" value={formData.period} onChange={e => setFormData({ ...formData, period: Number(e.target.value) })} className="w-12 text-center text-lg font-bold rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-1 outline-none" />
                                            </div>
                                            <div className="text-center w-full">
                                                <label className="text-[10px] uppercase font-bold text-gray-500 block">Clock</label>
                                                <input type="text" value={formData.clock} onChange={e => setFormData({ ...formData, clock: e.target.value })} className="w-16 text-center text-sm font-bold rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-1 outline-none font-mono" />
                                            </div>
                                        </div>

                                        <div className="col-span-5 flex flex-col items-center">
                                            <span className="text-sm font-medium mb-2 dark:text-gray-300">Home Score</span>
                                            <div className="flex items-center gap-3">
                                                <button type="button" onClick={() => setFormData(f => ({ ...f, homeScore: Math.max(0, f.homeScore - 1) }))} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600">-</button>
                                                <input type="number" min="0" value={formData.homeScore} onChange={e => setFormData({ ...formData, homeScore: Number(e.target.value) })} className="w-20 text-center font-display text-3xl font-bold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 outline-none" />
                                                <button type="button" onClick={() => setFormData(f => ({ ...f, homeScore: f.homeScore + 1 }))} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600">+</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="p-6 space-y-6">
                                {/* Teams Configuration */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">Matchup</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Away Team</label>
                                            <select
                                                required
                                                value={formData.awayTeamId}
                                                onChange={(e) => setFormData({ ...formData, awayTeamId: e.target.value })}
                                                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                            >
                                                {teams.map(t => <option key={t.id} value={t.id}>{t.city} {t.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Home Team</label>
                                            <select
                                                required
                                                value={formData.homeTeamId}
                                                onChange={(e) => setFormData({ ...formData, homeTeamId: e.target.value })}
                                                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                            >
                                                {teams.map(t => <option key={t.id} value={t.id}>{t.city} {t.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Scheduling Configuration */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">Schedule & Details</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Game Date</label>
                                            <input
                                                type="date"
                                                required
                                                value={formData.dateStr}
                                                onChange={(e) => setFormData({ ...formData, dateStr: e.target.value })}
                                                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Game Time (Local)</label>
                                            <input
                                                type="time"
                                                required
                                                value={formData.timeStr}
                                                onChange={(e) => setFormData({ ...formData, timeStr: e.target.value })}
                                                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Venue</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.venue}
                                                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                                                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Broadcast Info / Network</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. ESPN, TNT, ABC"
                                                value={formData.broadcastInfo}
                                                onChange={(e) => setFormData({ ...formData, broadcastInfo: e.target.value })}
                                                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Settings Configuration */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">Features & State</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Game Status</label>
                                            <select
                                                required
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none font-bold"
                                            >
                                                <option value="scheduled">Scheduled</option>
                                                <option value="live">Live In Progress</option>
                                                <option value="ht">Half Time</option>
                                                <option value="ft">Final (Full Time)</option>
                                                <option value="postponed">Postponed</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Game Type</label>
                                            <select
                                                required
                                                value={formData.gameType}
                                                onChange={(e) => setFormData({ ...formData, gameType: e.target.value as any })}
                                                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                            >
                                                <option value="preseason">Pre-season</option>
                                                <option value="regular_season">Regular Season</option>
                                                <option value="playoff">Playoffs</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="isFeatured"
                                            checked={formData.isFeatured}
                                            onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                                            className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-600 outline-none"
                                        />
                                        <label htmlFor="isFeatured" className="font-medium text-gray-900 dark:text-white">
                                            Feature this game prominently on the /basketball page
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3 sticky bottom-0">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-all shadow-lg hover:shadow-xl font-medium"
                                >
                                    {editingGame ? 'Save Changes' : 'Schedule Game'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isBulkRescheduleOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Reschedule Games</h3>
                            <button onClick={() => setIsBulkRescheduleOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleBulkReschedule} className="p-6 space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Select a new date and time for the {selectedGames.length} selected games. Their status will also be changed to "Postponed".
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Date</label>
                                <input
                                    type="date"
                                    required
                                    value={bulkDateStr}
                                    onChange={(e) => setBulkDateStr(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Time</label>
                                <input
                                    type="time"
                                    required
                                    value={bulkTimeStr}
                                    onChange={(e) => setBulkTimeStr(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsBulkRescheduleOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-orange-600 text-white font-medium hover:bg-orange-700 transition-colors"
                                >
                                    Confirm Reschedule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
