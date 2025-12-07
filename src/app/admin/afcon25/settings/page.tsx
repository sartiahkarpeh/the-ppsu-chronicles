'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';

export default function SettingsManagement() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        hostCountry: 'Morocco',
        isPublic: false,
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'afcon_settings', 'general');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setFormData({
                        startDate: data.startDate || '',
                        endDate: data.endDate || '',
                        hostCountry: data.hostCountry || 'Morocco',
                        isPublic: data.isPublic || false,
                    });
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await setDoc(doc(db, 'afcon_settings', 'general'), {
                ...formData,
                updatedAt: serverTimestamp(),
            });
            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Error saving settings.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-black dark:text-white">Settings</h1>
                <p className="text-black dark:text-gray-400">Configure global tournament settings.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <form onSubmit={handleSubmit} className="p-8 space-y-8">

                    {/* Visibility Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                        <div>
                            <h3 className="font-bold text-black dark:text-white">Public Visibility</h3>
                            <p className="text-sm text-black dark:text-gray-400">Show AFCON section on the main website.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isPublic}
                                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-afcon-green"></div>
                        </label>
                    </div>

                    {/* Tournament Info */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-black dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">Tournament Info</h3>

                        <div>
                            <label className="block text-sm font-medium text-black dark:text-gray-300 mb-1">Host Country</label>
                            <input
                                type="text"
                                value={formData.hostCountry}
                                onChange={(e) => setFormData({ ...formData, hostCountry: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-black dark:text-gray-300 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-black dark:text-gray-300 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-black text-white hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Save Settings
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
