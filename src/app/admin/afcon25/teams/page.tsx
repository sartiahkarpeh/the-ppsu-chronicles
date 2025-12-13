'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, X, Upload, Users } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase/config';
import type { Team } from '@/types/afcon';

export default function TeamsManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [flagFile, setFlagFile] = useState<File | null>(null);
  const [uploadingFlag, setUploadingFlag] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    group: 'A',
    crest_url: '',
    flag_url: '',
    coach: '',
    color: '#000000',
    players: [''] as string[],
  });

  useEffect(() => {
    const q = query(collection(db, 'afcon_teams'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setFormData({
        name: team.name,
        shortName: team.shortName || '',
        group: team.group || 'A',
        crest_url: team.crest_url || '',
        flag_url: team.flag_url || '',
        coach: team.coach || '',
        color: team.color || '#000000',
        players: team.players && team.players.length > 0 ? team.players : [''],
      });
    } else {
      setEditingTeam(null);
      setFormData({
        name: '',
        shortName: '',
        group: 'A',
        crest_url: '',
        flag_url: '',
        coach: '',
        color: '#000000',
        players: [''],
      });
    }
    setFlagFile(null);
    setIsModalOpen(true);
  };

  // Player management functions
  const addPlayerField = () => {
    if (formData.players.length < 12) {
      setFormData({ ...formData, players: [...formData.players, ''] });
    }
  };

  const removePlayerField = (index: number) => {
    const newPlayers = formData.players.filter((_, i) => i !== index);
    setFormData({ ...formData, players: newPlayers.length > 0 ? newPlayers : [''] });
  };

  const updatePlayer = (index: number, value: string) => {
    const newPlayers = [...formData.players];
    newPlayers[index] = value;
    setFormData({ ...formData, players: newPlayers });
  };

  // Flag upload function
  const uploadFlag = async (): Promise<string | null> => {
    if (!flagFile) return formData.flag_url || null;

    setUploadingFlag(true);
    try {
      const fileExtension = flagFile.name.split('.').pop();
      const fileName = `flags/${formData.name.replace(/\s+/g, '_')}_${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, fileName);

      await uploadBytes(storageRef, flagFile);
      const downloadURL = await getDownloadURL(storageRef);

      return downloadURL;
    } catch (error) {
      console.error('Error uploading flag:', error);
      alert('Error uploading flag image');
      return null;
    } finally {
      setUploadingFlag(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Upload flag if new file selected
    const flag_url = await uploadFlag();
    if (flagFile && !flag_url) return; // Upload failed

    // Filter out empty player names
    const players = formData.players.filter(p => p.trim() !== '');

    try {
      const dataToSave = {
        ...formData,
        flag_url: flag_url || formData.flag_url,
        players,
        updatedAt: serverTimestamp(),
      };

      if (editingTeam) {
        await updateDoc(doc(db, 'afcon_teams', editingTeam.id), dataToSave);
      } else {
        await addDoc(collection(db, 'afcon_teams'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving team:', error);
      alert('Error saving team. Check console.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this team?')) {
      try {
        await deleteDoc(doc(db, 'afcon_teams', id));
      } catch (error) {
        console.error('Error deleting team:', error);
      }
    }
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.group?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-black dark:text-white">Teams</h1>
          <p className="text-black dark:text-gray-400">Manage participating teams and groups.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Add Team
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search teams..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-afcon-green focus:border-transparent outline-none transition-all"
        />
      </div>

      {/* Teams List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Team</th>
                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Group</th>
                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Coach</th>
                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading teams...</td></tr>
              ) : filteredTeams.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No teams found.</td></tr>
              ) : (
                filteredTeams.map((team) => (
                  <tr key={team.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {team.flag_url && (
                          <div className="w-12 h-8">
                            <img
                              src={team.flag_url}
                              alt={`${team.name} flag`}
                              className="w-full h-full object-cover rounded border border-gray-300 dark:border-gray-600"
                            />
                          </div>
                        )}
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-600">
                          {team.crest_url ? (
                            <img src={team.crest_url} alt={team.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">⚽</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{team.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-500">{team.shortName}</p>
                            {team.players && team.players.length > 0 && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {team.players.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Group {team.group}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{team.coach || '-'}</td>
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
                          onClick={() => handleDelete(team.id)}
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Short Name (3 chars)</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group</label>
                  <select
                    value={formData.group}
                    onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                  >
                    {['A', 'B', 'C', 'D', 'E', 'F'].map(g => (
                      <option key={g} value={g}>Group {g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Flag/Crest URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/flag.png"
                  value={formData.crest_url}
                  onChange={(e) => setFormData({ ...formData, crest_url: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Head Coach</label>
                <input
                  type="text"
                  value={formData.coach}
                  onChange={(e) => setFormData({ ...formData, coach: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                />
              </div>

              {/* Flag Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Country Flag Image
                  </div>
                </label>
                {formData.flag_url && (
                  <div className="mb-2">
                    <img
                      src={formData.flag_url}
                      alt="Current flag"
                      className="w-24 h-16 object-cover rounded border border-gray-300 dark:border-gray-600"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setFlagFile(file);
                  }}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Upload a flag image for this team (optional)
                </p>
              </div>

              {/* Player Names Section */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Player Names (Optional, up to 12)
                    </div>
                  </label>
                  {formData.players.length < 12 && (
                    <button
                      type="button"
                      onClick={addPlayerField}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Player
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {formData.players.map((player, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={player}
                        onChange={(e) => updatePlayer(index, e.target.value)}
                        placeholder={`Player ${index + 1}`}
                        className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none text-sm"
                      />
                      {formData.players.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePlayerField(index)}
                          className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                          title="Remove player"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {formData.players.filter(p => p.trim() !== '').length} player(s) added
                </p>
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
                  disabled={uploadingFlag}
                  className="px-6 py-3 rounded-xl bg-black text-white hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploadingFlag ? (
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
