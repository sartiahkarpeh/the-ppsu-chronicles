import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProfileAdmin } from '@/lib/diary/admin';
import SubscribeBox from '@/components/diary/SubscribeBox';

interface Props {
    params: Promise<{ writerId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { writerId } = await params;
    const writer = await getProfileAdmin(writerId);

    if (!writer) {
        return {
            title: 'Writer Not Found - PPSU Diaries',
        };
    }

    const title = `Subscribe to ${writer.displayName} on PPSU Diaries`;
    const description = `${writer.displayName} is sharing their journey. Please subscribe to me on the PPSU Diaries.`;
    const imageUrl = writer.avatar || 'https://www.theppsuchronicles.com/ppsu.png';

    return {
        title: title,
        description: description,
        openGraph: {
            title: title,
            description: description,
            images: [
                {
                    url: imageUrl,
                    width: 400,
                    height: 400,
                    alt: writer.displayName,
                },
            ],
            type: 'profile',
        },
        twitter: {
            card: 'summary',
            title: title,
            description: description,
            images: [imageUrl],
        },
    };
}

export default async function SubscribePage({ params }: Props) {
    const { writerId } = await params;
    const writer = await getProfileAdmin(writerId);

    if (!writer) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            <div className="w-full max-w-md text-center">
                {writer.avatar ? (
                    <img src={writer.avatar} alt={writer.displayName} className="w-24 h-24 rounded-full object-cover mx-auto mb-6 shadow-md border-2 border-[#FF6719]/10" />
                ) : (
                    <div className="w-24 h-24 rounded-full bg-[#FF6719] flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6 shadow-md">
                        {writer.displayName?.charAt(0)?.toUpperCase()}
                    </div>
                )}

                <h1 className="text-3xl font-bold text-[#1a1a1a] mb-2" style={{ fontFamily: 'var(--font-lora), serif' }}>
                    {writer.displayName}
                </h1>
                <p className="text-[#6b6b6b] mb-2 font-medium">{writer.program} · {writer.year}</p>
                {writer.bio && (
                    <p className="text-sm text-[#6b6b6b] mb-8 max-w-[280px] mx-auto leading-relaxed italic">
                        &quot;{writer.bio}&quot;
                    </p>
                )}

                <SubscribeBox writerId={writer.userId} writerName={writer.displayName} />

                <div className="mt-8">
                    <Link href={`/diaries/writers/${writer.userId}`} className="text-sm font-semibold text-[#FF6719] hover:text-[#e55b14] transition-colors flex items-center justify-center gap-1">
                        View profile <span className="text-lg">→</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
