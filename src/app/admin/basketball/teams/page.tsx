'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, X, Upload } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import { db, storage } from '@/firebase/config';
import type { BasketballTeam } from '@/types/basketball';

export default function TeamsManagement() {
    const [teams, setTeams] = useState<BasketballTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<BasketballTeam | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        city: '',
        abbreviation: '',
        logo: '',
        conference: '',
        division: '',
        primaryColor: '#000000',
        secondaryColor: '#FFFFFF',
        arena: '',
        headCoach: '',
        wins: 0,
        losses: 0,
        standingOrRank: 0,
    });

    useEffect(() => {
        const q = query(collection(db, 'basketball_teams'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BasketballTeam));
            setTeams(teamsData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenModal = (team?: BasketballTeam) => {
        if (team) {
            setEditingTeam(team);
            setFormData({
                name: team.name,
                city: team.city,
                abbreviation: team.abbreviation,
                logo: team.logo || '',
                conference: team.conference || '',
                division: team.division || '',
                primaryColor: team.primaryColor || '#000000',
                secondaryColor: team.secondaryColor || '#FFFFFF',
                arena: team.arena || '',
                headCoach: team.headCoach || '',
                wins: team.wins || 0,
                losses: team.losses || 0,
                standingOrRank: team.standingOrRank || 0,
            });
        } else {
            setEditingTeam(null);
            setFormData({
                name: '',
                city: '',
                abbreviation: '',
                logo: '',
                conference: '',
                division: '',
                primaryColor: '#000000',
                secondaryColor: '#FFFFFF',
                arena: '',
                headCoach: '',
                wins: 0,
                losses: 0,
                standingOrRank: 0,
            });
        }
        setLogoFile(null);
        setIsModalOpen(true);
    };

    const uploadLogo = async (): Promise<string | null> => {
        if (!logoFile) return formData.logo || null;

        setUploadingLogo(true);
        try {
            const fileExtension = logoFile.name.split('.').pop();
            const fileName = `basketball/logos/${formData.name.replace(/\\s+/g, '_')}_${Date.now()}.${fileExtension}`;
            const storageRef = ref(storage, fileName);

            await uploadBytes(storageRef, logoFile);
            const downloadURL = await getDownloadURL(storageRef);

            return downloadURL;
        } catch (error) {
            console.error('Error uploading logo:', error);
            toast.error('Error uploading logo image');
            return null;
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const logo_url = await uploadLogo();
        if (logoFile && !logo_url) return;

        try {
            const dataToSave = {
                ...formData,
                logo: logo_url || formData.logo,
                standingOrRank: Number(formData.standingOrRank) || null,
                wins: Number(formData.wins) || 0,
                losses: Number(formData.losses) || 0,
                updatedAt: serverTimestamp(),
            };

            if (editingTeam) {
                await updateDoc(doc(db, 'basketball_teams', editingTeam.id), dataToSave);
            } else {
                await addDoc(collection(db, 'basketball_teams'), {
                    ...dataToSave,
                    createdAt: serverTimestamp(),
                });
            }
            setIsModalOpen(false);
            toast.success(editingTeam ? 'Team updated successfully!' : 'Team created successfully!');
        } catch (error) {
            console.error('Error saving team:', error);
            toast.error('Error saving team. Check console.');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete ${name}?`)) {
            try {
                await deleteDoc(doc(db, 'basketball_teams', id));
                toast.success('Team deleted successfully');
            } catch (error) {
                console.error('Error deleting team:', error);
                toast.error('Error deleting team');
            }
        }
    };

    const filteredTeams = teams.filter(team =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-black dark:text-white">Teams</h1>
                    <p className="text-black dark:text-gray-400">Manage basketball teams.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-xl hover:bg-orange-700 transition-all shadow-lg hover:shadow-xl"
                >
                    <Plus className="w-5 h-5" />
                    Add Team
                </button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search teams..."
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
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Team</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Conference</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Record</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Coach</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading teams...</td></tr>
                            ) : filteredTeams.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No teams found.</td></tr>
                            ) : (
                                filteredTeams.map((team) => (
                                    <tr key={team.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-600">
                                                    {team.logo ? (
                                                        <img src={team.logo} alt={team.abbreviation} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-lg">🏀</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white">{team.city} {team.name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs text-gray-500">{team.abbreviation}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {team.conference || 'N/A'} {team.division ? `- ${team.division}` : ''}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold">{team.wins}-{team.losses}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{team.headCoach || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(team)}
                                                    className="p-2 text-blue-600 hover:bg-black hover:text-white dark:hover:bg-black rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(team.id, team.name)}
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

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingTeam ? 'Edit Team' : 'Add New Team'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City/Location</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team Name / Mascot</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Abbreviation (3-4 chars)</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={4}
                                        value={formData.abbreviation}
                                        onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Head Coach</label>
                                    <input
                                        type="text"
                                        value={formData.headCoach}
                                        onChange={(e) => setFormData({ ...formData, headCoach: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conference</label>
                                    <input
                                        type="text"
                                        value={formData.conference}
                                        onChange={(e) => setFormData({ ...formData, conference: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Division</label>
                                    <input
                                        type="text"
                                        value={formData.division}
                                        onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Color</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={formData.primaryColor}
                                            onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                            className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                                        />
                                        <input
                                            type="text"
                                            value={formData.primaryColor}
                                            onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                            className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secondary Color</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={formData.secondaryColor}
                                            onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                                            className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                                        />
                                        <input
                                            type="text"
                                            value={formData.secondaryColor}
                                            onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                                            className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wins</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.wins}
                                        onChange={(e) => setFormData({ ...formData, wins: Number(e.target.value) })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Losses</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.losses}
                                        onChange={(e) => setFormData({ ...formData, losses: Number(e.target.value) })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rank / Standing</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.standingOrRank || ''}
                                        onChange={(e) => setFormData({ ...formData, standingOrRank: Number(e.target.value) })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Arena</label>
                                <input
                                    type="text"
                                    value={formData.arena}
                                    onChange={(e) => setFormData({ ...formData, arena: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    <div className="flex items-center gap-2">
                                        <Upload className="w-4 h-4" />
                                        Team Logo
                                    </div>
                                </label>
                                <input
                                    type="url"
                                    placeholder="Or provide direct image URL..."
                                    value={formData.logo}
                                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                                    className="w-full px-4 py-2 mb-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-600 outline-none"
                                />

                                {formData.logo && !logoFile && (
                                    <div className="mb-2">
                                        <img
                                            src={formData.logo}
                                            alt="Current logo"
                                            className="h-16 w-16 object-cover rounded border border-gray-300 dark:border-gray-600"
                                        />
                                    </div>
                                )}

                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setLogoFile(file);
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
                                    disabled={uploadingLogo}
                                    className="px-6 py-3 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {uploadingLogo ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Uploading...
                                        </>
                                    ) : (
                                        editingTeam ? 'Update Team' : 'Create Team'
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
