'use client';

import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '@/firebase/config';
import type { ScoresTickerConfig, BasketballPageConfig, BasketballGame, BasketballTeam } from '@/types/basketball';

export default function SettingsManagement() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [games, setGames] = useState<BasketballGame[]>([]);
    const [teams, setTeams] = useState<BasketballTeam[]>([]);

    // States
    const [tickerConfig, setTickerConfig] = useState<ScoresTickerConfig>({
        isActive: true,
        showLiveOnly: false,
        featuredGameIds: [],
        speed: 50,
        updatedAt: null as any,
    });

    const [pageConfig, setPageConfig] = useState<BasketballPageConfig>({
        heroGameId: '',
        heroText: '',
        heroBgImage: '',
        showHeroSection: true,
        showScoresTicker: true,
        showTeamGrid: true,
        showInjuryReport: true,
        seoTitle: 'Basketball | PPSU Chronicles',
        seoDescription: 'Latest basketball scores, teams, and players.',
        ogImage: '',
        updatedAt: null as any,
    });

    useEffect(() => {
        // Fetch Teams & Games for dropdowns
        const fetchDropdownData = async () => {
            onSnapshot(query(collection(db, 'basketball_teams'), orderBy('name')), (snap) => {
                setTeams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BasketballTeam)));
            });

            onSnapshot(query(collection(db, 'basketball_games'), orderBy('date', 'desc')), (snap) => {
                setGames(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BasketballGame)));
            });
        };

        const fetchConfigs = async () => {
            try {
                const tickerDoc = await getDoc(doc(db, 'basketball_configs', 'ticker'));
                if (tickerDoc.exists()) {
                    setTickerConfig(tickerDoc.data() as ScoresTickerConfig);
                }

                const pageDoc = await getDoc(doc(db, 'basketball_configs', 'page'));
                if (pageDoc.exists()) {
                    setPageConfig(pageDoc.data() as BasketballPageConfig);
                }
            } catch (error) {
                console.error('Error fetching configs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDropdownData();
        fetchConfigs();
    }, []);

    const handleSaveTicker = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await setDoc(doc(db, 'basketball_configs', 'ticker'), {
                ...tickerConfig,
                updatedAt: serverTimestamp(),
            });
            toast.success('Ticker configuration saved!');
        } catch (error) {
            console.error('Error saving ticker config:', error);
            toast.error('Error saving ticker config.');
        } finally {
            setSaving(false);
        }
    };

    const handleSavePage = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await setDoc(doc(db, 'basketball_configs', 'page'), {
                ...pageConfig,
                updatedAt: serverTimestamp(),
            });
            toast.success('Page configuration saved!');
        } catch (error) {
            console.error('Error saving page config:', error);
            toast.error('Error saving page config.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="animate-pulse p-8">Loading settings...</div>;
    }

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-3xl font-display font-bold text-black dark:text-white">Settings</h1>
                <p className="text-black dark:text-gray-400">Configure public page behavior and layout.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Ticker Settings */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 relative">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 dark:text-white">
                        <span>📺</span> Scores Ticker Config
                    </h2>
                    <form onSubmit={handleSaveTicker} className="space-y-5">
                        <div className="flex items-center justify-between">
                            <label className="font-medium text-gray-700 dark:text-gray-300">Enable Ticker</label>
                            <input
                                type="checkbox"
                                checked={tickerConfig.isActive}
                                onChange={(e) => setTickerConfig(c => ({ ...c, isActive: e.target.checked }))}
                                className="w-5 h-5 text-orange-600 rounded"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="font-medium text-gray-700 dark:text-gray-300">Show Live Games Only</label>
                            <input
                                type="checkbox"
                                checked={tickerConfig.showLiveOnly}
                                onChange={(e) => setTickerConfig(c => ({ ...c, showLiveOnly: e.target.checked }))}
                                className="w-5 h-5 text-orange-600 rounded"
                            />
                        </div>

                        <div>
                            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Ticker Speed (px/s)</label>
                            <input
                                type="number"
                                min="10"
                                max="200"
                                value={tickerConfig.speed}
                                onChange={(e) => setTickerConfig(c => ({ ...c, speed: Number(e.target.value) }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <button type="submit" disabled={saving} className="w-full flex justify-center items-center gap-2 bg-black dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors">
                            <Save className="w-4 h-4" /> Save Ticker Config
                        </button>
                    </form>
                </div>

                {/* Page Structure Settings */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 relative">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 dark:text-white">
                        <span>⚙️</span> Page Structure
                    </h2>
                    <form onSubmit={handleSavePage} className="space-y-5">

                        <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Visibility Toggles</h3>
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hero Game Section</label>
                                <input type="checkbox" checked={pageConfig.showHeroSection} onChange={(e) => setPageConfig(c => ({ ...c, showHeroSection: e.target.checked }))} className="w-4 h-4 text-orange-600 rounded" />
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Scores Ticker</label>
                                <input type="checkbox" checked={pageConfig.showScoresTicker} onChange={(e) => setPageConfig(c => ({ ...c, showScoresTicker: e.target.checked }))} className="w-4 h-4 text-orange-600 rounded" />
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Team Grid</label>
                                <input type="checkbox" checked={pageConfig.showTeamGrid} onChange={(e) => setPageConfig(c => ({ ...c, showTeamGrid: e.target.checked }))} className="w-4 h-4 text-orange-600 rounded" />
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Injury Report</label>
                                <input type="checkbox" checked={pageConfig.showInjuryReport} onChange={(e) => setPageConfig(c => ({ ...c, showInjuryReport: e.target.checked }))} className="w-4 h-4 text-orange-600 rounded" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manual Hero Game (Override Auto)</label>
                            <select
                                value={pageConfig.heroGameId || ''}
                                onChange={(e) => setPageConfig(c => ({ ...c, heroGameId: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                            >
                                <option value="">Auto-select (Nearest Live/Upcoming)</option>
                                {games.map(game => {
                                    const ht = teams.find(t => t.id === game.homeTeamId);
                                    const at = teams.find(t => t.id === game.awayTeamId);
                                    return <option key={game.id} value={game.id}>{at?.abbreviation} @ {ht?.abbreviation} ({new Date(game.date?.toString() || Date.now()).toLocaleDateString()})</option>
                                })}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hero Title overrides</label>
                            <input
                                type="text"
                                placeholder="E.g. GAME OF THE WEEK"
                                value={pageConfig.heroText || ''}
                                onChange={(e) => setPageConfig(c => ({ ...c, heroText: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hero Background Image URL</label>
                            <input
                                type="url"
                                placeholder="Enter background image URL..."
                                value={pageConfig.heroBgImage || ''}
                                onChange={(e) => setPageConfig(c => ({ ...c, heroBgImage: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SEO Title</label>
                            <input
                                type="text"
                                value={pageConfig.seoTitle}
                                onChange={(e) => setPageConfig(c => ({ ...c, seoTitle: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SEO Description</label>
                            <textarea
                                value={pageConfig.seoDescription}
                                onChange={(e) => setPageConfig(c => ({ ...c, seoDescription: e.target.value }))}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SEO Open Graph Image URL</label>
                            <input
                                type="url"
                                placeholder="Enter OG image URL..."
                                value={pageConfig.ogImage || ''}
                                onChange={(e) => setPageConfig(c => ({ ...c, ogImage: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <button type="submit" disabled={saving} className="w-full flex justify-center items-center gap-2 bg-black dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors">
                            <Save className="w-4 h-4" /> Save Page Config
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
}
