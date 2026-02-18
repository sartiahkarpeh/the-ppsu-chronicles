'use client';

import { useState, useEffect } from 'react';
import { Search, Users } from 'lucide-react';
import WriterCard from '@/components/diary/WriterCard';
import { getWriters } from '@/lib/diary/firebase';
import type { DiaryProfile } from '@/types/diary';

export default function WritersPage() {
    const [writers, setWriters] = useState<DiaryProfile[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getWriters(50)
            .then(setWriters)
            .finally(() => setLoading(false));
    }, []);

    const filtered = search
        ? writers.filter(w =>
            w.displayName.toLowerCase().includes(search.toLowerCase()) ||
            w.program.toLowerCase().includes(search.toLowerCase()) ||
            w.bio?.toLowerCase().includes(search.toLowerCase())
        )
        : writers;

    return (
        <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1
                        className="text-3xl sm:text-4xl font-bold text-[#1a1a1a] mb-2"
                        style={{ fontFamily: 'var(--font-lora), serif' }}
                    >
                        Discover Writers
                    </h1>
                    <p className="text-[#6b6b6b]">Follow your favourite student writers from PPSU</p>
                </div>

                {/* Search */}
                <div className="relative mb-8 max-w-md mx-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b6b]" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search writers..."
                        className="w-full pl-10 pr-4 py-2.5 border border-[#e5e5e5] rounded-full focus:outline-none focus:border-[#FF6719] text-sm"
                    />
                </div>

                {/* Writers Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="animate-pulse border border-[#e5e5e5] rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-full bg-[#f0f0f0]" />
                                    <div className="flex-1">
                                        <div className="h-4 bg-[#f0f0f0] rounded w-2/3 mb-2" />
                                        <div className="h-3 bg-[#f0f0f0] rounded w-1/2 mb-2" />
                                        <div className="h-3 bg-[#f0f0f0] rounded w-full" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Users className="w-12 h-12 text-[#e5e5e5] mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">
                            {search ? 'No writers found' : 'No writers yet'}
                        </h3>
                        <p className="text-[#6b6b6b]">
                            {search ? 'Try a different search term.' : 'Be the first writer on PPSU Student Diaries!'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map(writer => (
                            <WriterCard key={writer.userId} writer={writer} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
