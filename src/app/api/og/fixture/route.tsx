import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * Dynamic OG Image Generator for AFCON 2025 Fixtures
 * Generates an image showing both team flags, names, and score
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        const homeTeam = searchParams.get('home') || 'Home Team';
        const awayTeam = searchParams.get('away') || 'Away Team';
        const homeFlag = searchParams.get('homeFlag') || '';
        const awayFlag = searchParams.get('awayFlag') || '';
        const homeScore = searchParams.get('homeScore') || '0';
        const awayScore = searchParams.get('awayScore') || '0';
        const status = searchParams.get('status') || 'upcoming';

        // Determine if we should show the score
        const showScore = status !== 'upcoming';

        // Status display text and color
        let statusText = '';
        let statusColor = '#6B7280'; // gray

        if (status === 'live') {
            statusText = '🔴 LIVE';
            statusColor = '#EF4444'; // red
        } else if (status === 'ht') {
            statusText = '⏸️ HALF TIME';
            statusColor = '#F59E0B'; // amber
        } else if (status === 'ft') {
            statusText = '✅ FULL TIME';
            statusColor = '#10B981'; // green
        }

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#0f0f13',
                        backgroundImage: 'linear-gradient(to bottom right, #0f0f13, #1a1a24)',
                        fontFamily: 'system-ui, sans-serif',
                    }}
                >
                    {/* AFCON 2025 Header */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '20px',
                        }}
                    >
                        <div
                            style={{
                                fontSize: '28px',
                                fontWeight: 'bold',
                                color: '#22C55E',
                                letterSpacing: '2px',
                            }}
                        >
                            AFCON 2025
                        </div>
                    </div>

                    {/* Status Badge */}
                    {statusText && (
                        <div
                            style={{
                                display: 'flex',
                                padding: '8px 24px',
                                borderRadius: '999px',
                                backgroundColor: statusColor,
                                marginBottom: '30px',
                            }}
                        >
                            <span style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
                                {statusText}
                            </span>
                        </div>
                    )}

                    {/* Teams Container */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '60px',
                        }}
                    >
                        {/* Home Team */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '20px',
                            }}
                        >
                            {homeFlag ? (
                                <img
                                    src={homeFlag}
                                    alt={homeTeam}
                                    width={120}
                                    height={80}
                                    style={{
                                        borderRadius: '8px',
                                        objectFit: 'cover',
                                        border: '3px solid #374151',
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: '120px',
                                        height: '80px',
                                        backgroundColor: '#374151',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <span style={{ color: '#9CA3AF', fontSize: '24px' }}>🏳️</span>
                                </div>
                            )}
                            <span
                                style={{
                                    color: 'white',
                                    fontSize: '32px',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    maxWidth: '200px',
                                }}
                            >
                                {homeTeam}
                            </span>
                        </div>

                        {/* Score or VS */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '10px',
                            }}
                        >
                            {showScore ? (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '20px',
                                    }}
                                >
                                    <span
                                        style={{
                                            color: 'white',
                                            fontSize: '72px',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {homeScore}
                                    </span>
                                    <span
                                        style={{
                                            color: '#6B7280',
                                            fontSize: '40px',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        -
                                    </span>
                                    <span
                                        style={{
                                            color: 'white',
                                            fontSize: '72px',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {awayScore}
                                    </span>
                                </div>
                            ) : (
                                <span
                                    style={{
                                        color: '#22C55E',
                                        fontSize: '48px',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    VS
                                </span>
                            )}
                        </div>

                        {/* Away Team */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '20px',
                            }}
                        >
                            {awayFlag ? (
                                <img
                                    src={awayFlag}
                                    alt={awayTeam}
                                    width={120}
                                    height={80}
                                    style={{
                                        borderRadius: '8px',
                                        objectFit: 'cover',
                                        border: '3px solid #374151',
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: '120px',
                                        height: '80px',
                                        backgroundColor: '#374151',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <span style={{ color: '#9CA3AF', fontSize: '24px' }}>🏳️</span>
                                </div>
                            )}
                            <span
                                style={{
                                    color: 'white',
                                    fontSize: '32px',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    maxWidth: '200px',
                                }}
                            >
                                {awayTeam}
                            </span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div
                        style={{
                            display: 'flex',
                            position: 'absolute',
                            bottom: '30px',
                            color: '#6B7280',
                            fontSize: '20px',
                        }}
                    >
                        PPSU Chronicles • theppsuchronicles.com
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    } catch (error) {
        console.error('Error generating OG image:', error);

        // Return a fallback image
        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#0f0f13',
                        color: 'white',
                        fontSize: '48px',
                        fontWeight: 'bold',
                    }}
                >
                    AFCON 2025
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    }
}
