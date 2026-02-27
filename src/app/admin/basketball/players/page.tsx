'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, X, Upload } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import { db, storage } from '@/firebase/config';
import type { BasketballPlayer, BasketballTeam } from '@/types/basketball';

export default function PlayersManagement() {
    const [players, setPlayers] = useState<BasketballPlayer[]>([]);
    const [teams, setTeams] = useState<BasketballTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<BasketballPlayer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [headshotFile, setHeadshotFile] = useState<File | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        number: '',
        position: '',
        teamId: '',
        headshot: '',
        height: '',
        weight: '',
        age: '',
        college: '',
        draftInfo: '',
        status: 'active' as any,
        injuryDescription: '',
    });

    useEffect(() => {
        // Fetch Teams
        const qTeams = query(collection(db, 'basketball_teams'), orderBy('name'));
        const unsubscribeTeams = onSnapshot(qTeams, (snapshot) => {
            setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BasketballTeam)));
        });

        // Fetch Players
        const qPlayers = query(collection(db, 'basketball_players'), orderBy('name'));
        const unsubscribePlayers = onSnapshot(qPlayers, (snapshot) => {
            setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BasketballPlayer)));
            setLoading(false);
        });

        return () => {
            unsubscribeTeams();
            unsubscribePlayers();
        };
    }, []);

    const handleOpenModal = (player?: BasketballPlayer) => {
        if (player) {
            setEditingPlayer(player);
            setFormData({
                name: player.name,
                number: String(player.number),
                position: player.position,
                teamId: player.teamId,
                headshot: player.headshot || '',
                height: player.height || '',
                weight: player.weight ? String(player.weight) : '',
                age: player.age ? String(player.age) : '',
                college: player.college || '',
                draftInfo: player.draftInfo || '',
                status: player.status,
                injuryDescription: player.injuryDescription || '',
            });
        } else {
            setEditingPlayer(null);
            setFormData({
                name: '',
                number: '',
                position: '',
                teamId: teams.length > 0 ? teams[0].id : '',
                headshot: '',
                height: '',
                weight: '',
                age: '',
                college: '',
                draftInfo: '',
                status: 'active',
                injuryDescription: '',
            });
        }
        setHeadshotFile(null);
        setIsModalOpen(true);
    };

    const uploadHeadshot = async (): Promise<string | null> => {
        if (!headshotFile) return formData.headshot || null;

        setUploadingImage(true);
        try {
            const fileExtension = headshotFile.name.split('.').pop();
            const fileName = `basketball/players/${formData.name.replace(/\\s+/g, '_')}_${Date.now()}.${fileExtension}`;
            const storageRef = ref(storage, fileName);

            await uploadBytes(storageRef, headshotFile);
            const downloadURL = await getDownloadURL(storageRef);

            return downloadURL;
        } catch (error) {
            console.error('Error uploading headshot:', error);
            toast.error('Error uploading headshot image');
            return null;
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const headshot_url = await uploadHeadshot();
        if (headshotFile && !headshot_url) return;

        try {
            const dataToSave = {
                ...formData,
                number: Number(formData.number) || 0,
                weight: formData.weight ? Number(formData.weight) : null,
                age: formData.age ? Number(formData.age) : null,
                headshot: headshot_url || formData.headshot,
                updatedAt: serverTimestamp(),
            };

            if (editingPlayer) {
                await updateDoc(doc(db, 'basketball_players', editingPlayer.id), dataToSave);
            } else {
                await addDoc(collection(db, 'basketball_players'), {
                    ...dataToSave,
                    createdAt: serverTimestamp(),
                });
            }
            setIsModalOpen(false);
            toast.success(editingPlayer ? 'Player updated successfully!' : 'Player created successfully!');
        } catch (error) {
            console.error('Error saving player:', error);
            toast.error('Error saving player. Check console.');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete ${name}?`)) {
            try {
                await deleteDoc(doc(db, 'basketball_players', id));
                toast.success('Player deleted successfully');
            } catch (error) {
                console.error('Error deleting player:', error);
                toast.error('Error deleting player');
            }
        }
    };

    const filteredPlayers = players.filter(player =>
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teams.find(t => t.id === player.teamId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-black dark:text-white">Players</h1>
                    <p className="text-black dark:text-gray-400">Manage basketball players & injury statuses.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-xl hover:bg-orange-700 transition-all shadow-lg hover:shadow-xl"
                >
                    <Plus className="w-5 h-5" />
                    Add Player
                </button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by name, position, or team..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none transition-all"
                />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Player</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Team</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Position</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Status</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading players...</td></tr>
                            ) : filteredPlayers.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No players found.</td></tr>
                            ) : (
                                filteredPlayers.map((player) => {
                                    const team = teams.find(t => t.id === player.teamId);
                                    return (
                                        <tr key={player.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-600">
                                                        {player.headshot ? (
                                                            <img src={player.headshot} alt={player.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-lg">👤</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white">{player.name}</p>
                                                        <p className="text-xs text-gray-500">#{player.number}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                                                {team ? `${team.city} ${team.name}` : <span className="text-red-500">Unknown Team</span>}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{player.position}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${player.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                    player.status === 'injured' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}>
                                                    {player.status.charAt(0).toUpperCase() + player.status.slice(1)}
                                                </span>
                                                {player.injuryDescription && player.status !== 'active' && (
                                                    <p className="text-xs text-gray-500 mt-1 max-w-[150px] truncate" title={player.injuryDescription}>
                                                        {player.injuryDescription}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenModal(player)}
                                                        className="p-2 text-blue-600 hover:bg-black hover:text-white dark:hover:bg-black rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(player.id, player.name)}
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
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingPlayer ? 'Edit Player' : 'Add New Player'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team</label>
                                    <select
                                        required
                                        value={formData.teamId}
                                        onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    >
                                        <option value="" disabled>Select a team</option>
                                        {teams.map(t => (
                                            <option key={t.id} value={t.id}>{t.city} {t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jersey Number</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        max="99"
                                        value={formData.number}
                                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. PG, SG, SF, PF, C"
                                        value={formData.position}
                                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Height</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 6-6"
                                        value={formData.height}
                                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Weight (lbs)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.weight}
                                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Age</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.age}
                                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">College / Origin</label>
                                    <input
                                        type="text"
                                        value={formData.college}
                                        onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Draft Info</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 2023 R1 Pick 5"
                                        value={formData.draftInfo}
                                        onChange={(e) => setFormData({ ...formData, draftInfo: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-gray-200 dark:border-gray-700 pt-4 pb-2 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                                    <select
                                        required
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    >
                                        <option value="active">Active</option>
                                        <option value="injured">Injured</option>
                                        <option value="out">Out</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Injury Description</label>
                                    <input
                                        type="text"
                                        placeholder="Required if Status is not Active"
                                        value={formData.injuryDescription}
                                        onChange={(e) => setFormData({ ...formData, injuryDescription: e.target.value })}
                                        disabled={formData.status === 'active'}
                                        className={`w-full px-4 py-2 rounded-xl border outline-none ${formData.status === 'active'
                                            ? 'border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800'
                                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600'
                                            }`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    <div className="flex items-center gap-2">
                                        <Upload className="w-4 h-4" />
                                        Player Headshot
                                    </div>
                                </label>
                                <input
                                    type="url"
                                    placeholder="Or provide direct image URL..."
                                    value={formData.headshot}
                                    onChange={(e) => setFormData({ ...formData, headshot: e.target.value })}
                                    className="w-full px-4 py-2 mb-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                />

                                {formData.headshot && !headshotFile && (
                                    <div className="mb-2">
                                        <img
                                            src={formData.headshot}
                                            alt="Current headshot"
                                            className="h-16 w-16 object-cover rounded-full border border-gray-300 dark:border-gray-600"
                                        />
                                    </div>
                                )}

                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setHeadshotFile(file);
                                    }}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none text-sm"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploadingImage || !formData.teamId}
                                    className="px-6 py-3 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {uploadingImage ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Uploading...
                                        </>
                                    ) : (
                                        editingPlayer ? 'Update Player' : 'Create Player'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
