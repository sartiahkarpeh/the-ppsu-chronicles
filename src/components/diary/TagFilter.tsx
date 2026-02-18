'use client';

import { DIARY_TAGS } from '@/types/diary';

interface Props {
    selectedTag: string | null;
    onSelect: (tag: string | null) => void;
}

export default function TagFilter({ selectedTag, onSelect }: Props) {
    return (
        <div className="flex flex-wrap gap-2">
            <button
                onClick={() => onSelect(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedTag === null
                        ? 'bg-[#FF6719] text-white'
                        : 'bg-[#f5f5f5] text-[#6b6b6b] hover:bg-[#e5e5e5]'
                    }`}
            >
                All
            </button>
            {DIARY_TAGS.map(tag => (
                <button
                    key={tag}
                    onClick={() => onSelect(tag)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedTag === tag
                            ? 'bg-[#FF6719] text-white'
                            : 'bg-[#f5f5f5] text-[#6b6b6b] hover:bg-[#e5e5e5]'
                        }`}
                >
                    {tag}
                </button>
            ))}
        </div>
    );
}
