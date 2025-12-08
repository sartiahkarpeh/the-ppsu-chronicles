import { Metadata } from 'next';

type Props = {
    params: Promise<{ id: string }>;
};

// Helper to get the base URL for API calls
function getBaseUrl() {
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL;
    }
    return 'http://localhost:3001';
}

/**
 * Generate dynamic metadata for fixture pages
 * This enables rich social media sharing with team names, flags, and scores
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const baseUrl = getBaseUrl();

    try {
        // Fetch fixture data from the API route
        const response = await fetch(`${baseUrl}/api/afcon25/fixtures/${id}`, {
            next: { revalidate: 30 }, // Revalidate every 30 seconds for live score updates
        });

        if (!response.ok) {
            return {
                title: 'Fixture Not Found | AFCON 2025',
                description: 'This match could not be found.',
            };
        }

        const { fixture } = await response.json();

        const homeTeamName = fixture.homeTeamName || 'TBD';
        const awayTeamName = fixture.awayTeamName || 'TBD';
        const homeTeamFlag = fixture.homeTeamFlag || '';
        const awayTeamFlag = fixture.awayTeamFlag || '';
        const homeScore = fixture.homeScore ?? 0;
        const awayScore = fixture.awayScore ?? 0;
        const status = fixture.status || 'upcoming';

        const title = `${homeTeamName} vs ${awayTeamName} | AFCON 2025`;

        // Build description based on match status
        let description = '';

        if (status === 'live') {
            description = `🔴 LIVE: ${homeTeamName} ${homeScore} - ${awayScore} ${awayTeamName} | Watch the match live!`;
        } else if (status === 'ht') {
            description = `⏸️ Half Time: ${homeTeamName} ${homeScore} - ${awayScore} ${awayTeamName}`;
        } else if (status === 'ft') {
            description = `✅ Full Time: ${homeTeamName} ${homeScore} - ${awayScore} ${awayTeamName}`;
        } else {
            const kickoff = new Date(fixture.kickoffDateTime);
            const formattedDate = kickoff.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
            description = `⚽ ${homeTeamName} vs ${awayTeamName} | ${formattedDate} at ${fixture.venue || 'TBD'}`;
        }

        // Generate dynamic OG image URL with flags
        const ogImageUrl = `${baseUrl}/api/og/fixture?home=${encodeURIComponent(homeTeamName)}&away=${encodeURIComponent(awayTeamName)}&homeFlag=${encodeURIComponent(homeTeamFlag)}&awayFlag=${encodeURIComponent(awayTeamFlag)}&homeScore=${homeScore}&awayScore=${awayScore}&status=${status}`;

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                type: 'website',
                siteName: 'PPSU Chronicles - AFCON 2025',
                images: [
                    {
                        url: ogImageUrl,
                        width: 1200,
                        height: 630,
                        alt: `${homeTeamName} vs ${awayTeamName}`,
                    },
                ],
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images: [ogImageUrl],
            },
        };
    } catch (error) {
        console.error('Error generating metadata:', error instanceof Error ? error.message : error);
        return {
            title: 'AFCON 2025 Match',
            description: 'Watch AFCON 2025 matches live!',
        };
    }
}

export default function FixtureLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
