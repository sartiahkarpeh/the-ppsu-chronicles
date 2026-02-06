// src/app/admin/valentines/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart, ArrowLeft, Users, Settings, Download,
    ToggleLeft, ToggleRight, Lock, Unlock, RefreshCw,
    CheckCircle, XCircle, Clock, Search
} from 'lucide-react';

interface User {
    enrollmentNumber: string;
    fullName: string;
    whatsappNumber: string;
    hasSpun: boolean;
    assignedTo: string | null;
    spinTimestamp: string | null;
    createdAt: string | null;
}

interface Stats {
    totalUsers: number;
    usersSpun: number;
    usersNotSpun: number;
}

interface Settings {
    spinEnabled: boolean;
    systemLocked: boolean;
    updatedAt: string | null;
}

export default function ValentinesAdminPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users');

    const fetchData = useCallback(async () => {
        try {
            const [usersRes, settingsRes] = await Promise.all([
                fetch('/api/valentines/admin/users'),
                fetch('/api/valentines/admin/settings'),
            ]);

            if (usersRes.status === 401 || settingsRes.status === 401) {
                // Redirect to main admin login if not authenticated
                router.push('/login');
                return;
            }

            const usersData = await usersRes.json();
            const settingsData = await settingsRes.json();

            setUsers(usersData.users || []);
            setStats(usersData.stats || null);
            setSettings(settingsData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const updateSetting = async (key: 'spinEnabled' | 'systemLocked', value: boolean) => {
        setIsUpdating(true);
        try {
            const response = await fetch('/api/valentines/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [key]: value }),
            });

            if (response.ok) {
                setSettings(prev => prev ? { ...prev, [key]: value } : null);
            }
        } catch (error) {
            console.error('Error updating setting:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleExport = () => {
        window.location.href = '/api/valentines/admin/export';
    };

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.enrollmentNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading Valentine&apos;s admin...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin/dashboard')}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-red-600 rounded-full flex items-center justify-center">
                            <Heart className="w-6 h-6 text-white fill-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Valentine&apos;s Exchange</h1>
                            <p className="text-sm text-gray-500">Gift Matching Admin</p>
                        </div>
                    </div>

                    <button
                        onClick={fetchData}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Refresh data"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid sm:grid-cols-3 gap-4 mb-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                                    <Users className="w-5 h-5 text-rose-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Registered</p>
                                    <p className="text-2xl font-bold text-gray-800">{stats.totalUsers}</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Have Spun</p>
                                    <p className="text-2xl font-bold text-gray-800">{stats.usersSpun}</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Not Yet Spun</p>
                                    <p className="text-2xl font-bold text-gray-800">{stats.usersNotSpun}</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'users'
                                ? 'bg-rose-600 text-white'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                    >
                        <Users className="w-4 h-4 inline mr-2" />
                        Users
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'settings'
                                ? 'bg-rose-600 text-white'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                    >
                        <Settings className="w-4 h-4 inline mr-2" />
                        Settings
                    </button>
                </div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 'users' ? (
                        <motion.div
                            key="users"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white rounded-xl shadow-sm border border-gray-100"
                        >
                            {/* Search and Export */}
                            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by name or enrollment..."
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                                    />
                                </div>
                                <button
                                    onClick={handleExport}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Export CSV
                                </button>
                            </div>

                            {/* Users Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Name</th>
                                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Enrollment</th>
                                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 hidden md:table-cell">WhatsApp</th>
                                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 hidden lg:table-cell">Assigned To</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                    {searchQuery ? 'No users match your search' : 'No users registered yet'}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUsers.map((user) => (
                                                <tr key={user.enrollmentNumber} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium text-gray-800">{user.fullName}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 font-mono text-sm">
                                                        {user.enrollmentNumber}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                                                        {user.whatsappNumber}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {user.hasSpun ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                                                <CheckCircle className="w-3 h-3" />
                                                                Spun
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                                                                <Clock className="w-3 h-3" />
                                                                Pending
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                                                        {user.assignedTo || '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
                        >
                            <h2 className="text-lg font-semibold text-gray-800 mb-6">System Settings</h2>

                            <div className="space-y-6">
                                {/* Spin Phase Toggle */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div>
                                        <h3 className="font-medium text-gray-800">Spin Phase</h3>
                                        <p className="text-sm text-gray-500">
                                            {settings?.spinEnabled
                                                ? 'Users can currently spin the wheel'
                                                : 'Spin phase is disabled - users cannot spin'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => updateSetting('spinEnabled', !settings?.spinEnabled)}
                                        disabled={isUpdating}
                                        className={`p-2 rounded-lg transition-colors ${settings?.spinEnabled
                                                ? 'bg-green-500 text-white hover:bg-green-600'
                                                : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                                            }`}
                                    >
                                        {settings?.spinEnabled ? (
                                            <ToggleRight className="w-8 h-8" />
                                        ) : (
                                            <ToggleLeft className="w-8 h-8" />
                                        )}
                                    </button>
                                </div>

                                {/* System Lock Toggle */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div>
                                        <h3 className="font-medium text-gray-800">System Lock</h3>
                                        <p className="text-sm text-gray-500">
                                            {settings?.systemLocked
                                                ? 'System is locked - no registration or spinning allowed'
                                                : 'System is open - users can register and spin (if enabled)'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => updateSetting('systemLocked', !settings?.systemLocked)}
                                        disabled={isUpdating}
                                        className={`p-2 rounded-lg transition-colors ${settings?.systemLocked
                                                ? 'bg-red-500 text-white hover:bg-red-600'
                                                : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                                            }`}
                                    >
                                        {settings?.systemLocked ? (
                                            <Lock className="w-6 h-6" />
                                        ) : (
                                            <Unlock className="w-6 h-6" />
                                        )}
                                    </button>
                                </div>

                                {/* Status Summary */}
                                <div className="p-4 bg-rose-50 rounded-xl">
                                    <h3 className="font-medium text-rose-800 mb-2">Current Status</h3>
                                    <div className="flex flex-wrap gap-2">
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${settings?.spinEnabled
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {settings?.spinEnabled ? (
                                                <>
                                                    <CheckCircle className="w-4 h-4" />
                                                    Spin Open
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-4 h-4" />
                                                    Spin Closed
                                                </>
                                            )}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${settings?.systemLocked
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-green-100 text-green-700'
                                            }`}>
                                            {settings?.systemLocked ? (
                                                <>
                                                    <Lock className="w-4 h-4" />
                                                    System Locked
                                                </>
                                            ) : (
                                                <>
                                                    <Unlock className="w-4 h-4" />
                                                    System Open
                                                </>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
