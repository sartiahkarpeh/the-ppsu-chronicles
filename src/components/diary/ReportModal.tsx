'use client';

import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { useDiaryAuth } from '@/hooks/useDiaryAuth';
import { reportPost } from '@/lib/diary/firebase';
import toast from 'react-hot-toast';

const REPORT_REASONS = [
    'Inappropriate Content',
    'Spam',
    'Harassment',
    'Plagiarism',
    'Other',
];

interface Props {
    postId: string;
}

export default function ReportModal({ postId }: Props) {
    const { user } = useDiaryAuth();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !reason) return;

        setSubmitting(true);
        try {
            await reportPost({
                postId,
                reportedBy: user.uid,
                reason,
                description: description.trim() || undefined,
            });
            toast.success('Report submitted. Thank you for helping keep our community safe.');
            setOpen(false);
            setReason('');
            setDescription('');
        } catch (err) {
            toast.error('Failed to submit report');
        }
        setSubmitting(false);
    };

    return (
        <>
            <button
                onClick={() => {
                    if (!user) {
                        toast.error('Please sign in to report posts');
                        return;
                    }
                    setOpen(true);
                }}
                className="flex items-center gap-1 text-xs text-[#6b6b6b] hover:text-red-500 transition-colors"
            >
                <Flag className="w-3.5 h-3.5" />
                Report
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setOpen(false)} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-white rounded-2xl shadow-xl z-50 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-[#1a1a1a]">Report this post</h3>
                            <button onClick={() => setOpen(false)} className="text-[#6b6b6b] hover:text-[#1a1a1a]">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                                    Reason
                                </label>
                                <select
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg text-sm focus:outline-none focus:border-[#FF6719]"
                                >
                                    <option value="">Select a reason</option>
                                    {REPORT_REASONS.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                                    Description (optional)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Provide additional details..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg text-sm focus:outline-none focus:border-[#FF6719] resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!reason || submitting}
                                className="w-full py-2.5 bg-red-500 text-white rounded-full text-sm font-semibold disabled:opacity-50 hover:bg-red-600 transition-colors"
                            >
                                {submitting ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </form>
                    </div>
                </>
            )}
        </>
    );
}
