'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Search, Trash2, Edit, Eye, ArrowLeft, ExternalLink,
    Heart, MessageSquare, Calendar, User2, Filter, X
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase/config';
import {
    collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import type { DiaryPost } from '@/types/diary';
import { DIARY_TAGS } from '@/types/diary';

export default function AdminDiariesPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [posts, setPosts] = useState<DiaryPost[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [editingPost, setEditingPost] = useState<DiaryPost | null>(null);
    const [editForm, setEditForm] = useState({
        title: '', subtitle: '', status: '', tags: [] as string[],
    });
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Auth check
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            if (u) { setUser(u); setLoading(false); }
            else router.push('/login');
        });
        return () => unsub();
    }, [router]);

    // Real-time posts listener
    useEffect(() => {
        const q = query(collection(db, 'diary_posts'), orderBy('updatedAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ postId: d.id, ...d.data() } as DiaryPost));
            setPosts(data);
        }, (err) => console.error('Error fetching diary posts:', err));
        return () => unsub();
    }, []);

    // Filtered posts
    const filtered = posts.filter(p => {
        const matchSearch = searchQuery === '' ||
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.authorName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchSearch && matchStatus;
    });

    // Edit
    const openEdit = (post: DiaryPost) => {
        setEditingPost(post);
        setEditForm({
            title: post.title,
            subtitle: post.subtitle || '',
            status: post.status,
            tags: post.tags || [],
        });
    };

    const saveEdit = async () => {
        if (!editingPost) return;
        try {
            await updateDoc(doc(db, 'diary_posts', editingPost.postId), {
                title: editForm.title,
                subtitle: editForm.subtitle,
                status: editForm.status,
                tags: editForm.tags,
                updatedAt: serverTimestamp(),
            });
            setEditingPost(null);
        } catch (err) { console.error('Failed to update:', err); }
    };

    const toggleTag = (tag: string) => {
        setEditForm(prev => ({
            ...prev,
            tags: prev.tags.includes(tag)
                ? prev.tags.filter(t => t !== tag)
                : prev.tags.length < 3 ? [...prev.tags, tag] : prev.tags,
        }));
    };

    // Delete
    const handleDelete = async (postId: string) => {
        try {
            await deleteDoc(doc(db, 'diary_posts', postId));
            setDeleteConfirm(null);
        } catch (err) { console.error('Failed to delete:', err); }
    };

    const formatDate = (ts: any) => {
        if (!ts?.toDate) return '—';
        return ts.toDate().toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
        });
    };

    if (loading || !user) {
        return <div className="flex h-screen items-center justify-center"><p className="text-xl">Loading...</p></div>;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-gray-800 text-white px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/admin/dashboard')}
                            className="flex items-center gap-1 text-gray-300 hover:text-white text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Admin
                        </button>
                        <h1 className="text-xl font-bold">📝 Student Diaries</h1>
                    </div>
                    <span className="text-sm text-gray-400">{posts.length} total posts</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Published', count: posts.filter(p => p.status === 'published').length, color: 'bg-green-500' },
                        { label: 'Drafts', count: posts.filter(p => p.status === 'draft').length, color: 'bg-yellow-500' },
                        { label: 'Total Views', count: posts.reduce((s, p) => s + (p.viewsCount || 0), 0), color: 'bg-blue-500' },
                        { label: 'Total Likes', count: posts.reduce((s, p) => s + (p.likesCount || 0), 0), color: 'bg-red-500' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-lg shadow p-4">
                            <div className={`w-2 h-2 ${s.color} rounded-full inline-block mr-2`} />
                            <span className="text-sm text-gray-500">{s.label}</span>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{s.count}</p>
                        </div>
                    ))}
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search by title or author..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="published">Published</option>
                            <option value="draft">Drafts</option>
                            <option value="pending_review">Pending Review</option>
                        </select>
                    </div>
                </div>

                {/* Posts Table */}
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engagement</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            {searchQuery || statusFilter !== 'all' ? 'No posts match your filters' : 'No diary posts yet'}
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(post => (
                                        <tr key={post.postId} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="max-w-xs">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{post.title}</p>
                                                    {post.subtitle && <p className="text-xs text-gray-500 truncate">{post.subtitle}</p>}
                                                    {post.tags?.length > 0 && (
                                                        <div className="flex gap-1 mt-1">
                                                            {post.tags.map(tag => (
                                                                <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded">{tag}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {post.authorAvatar ? (
                                                        <img src={post.authorAvatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                                            <User2 className="w-3 h-3 text-gray-400" />
                                                        </div>
                                                    )}
                                                    <span className="text-sm text-gray-700">{post.authorName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${post.status === 'published' ? 'bg-green-100 text-green-700' :
                                                        post.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-orange-100 text-orange-700'
                                                    }`}>
                                                    {post.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {formatDate(post.publishedAt || post.updatedAt)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.viewsCount || 0}</span>
                                                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.likesCount || 0}</span>
                                                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.commentsCount || 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/diaries/${post.postId}`}
                                                        target="_blank"
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                        title="View post"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => openEdit(post)}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                                        title="Edit post"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(post.postId)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                        title="Delete post"
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
            </div>

            {/* Edit Modal */}
            {editingPost && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-800">Edit Post</h3>
                            <button onClick={() => setEditingPost(null)} className="p-1 hover:bg-gray-100 rounded">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                                <input
                                    type="text"
                                    value={editForm.subtitle}
                                    onChange={e => setEditForm(prev => ({ ...prev, subtitle: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={editForm.status}
                                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="published">Published</option>
                                    <option value="draft">Draft</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tags ({editForm.tags.length}/3)</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {DIARY_TAGS.map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => toggleTag(tag)}
                                            className={`px-2 py-0.5 rounded-full text-xs transition-colors ${editForm.tags.includes(tag)
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setEditingPost(null)}
                                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveEdit}
                                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Post?</h3>
                        <p className="text-sm text-gray-600 mb-6">This action cannot be undone. The post will be permanently removed.</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
