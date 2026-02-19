import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const title = searchParams.get('title') || 'PPSU Diaries';
        const cover = searchParams.get('cover');

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
                        backgroundColor: '#ffffff',
                        position: 'relative',
                    }}
                >
                    {/* Background Cover Image */}
                    {cover ? (
                        <img
                            src={cover}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                backgroundColor: '#1a1a1a',
                            }}
                        />
                    )}

                    {/* Gradient Overlay for better contrast if we want to show text */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '50%',
                            backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                            padding: '40px 60px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '6px', backgroundColor: '#FF6719' }} />
                            <span style={{ color: '#ffffff', fontSize: '24px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                Student Diaries
                            </span>
                        </div>
                        <h1
                            style={{
                                margin: 0,
                                color: '#ffffff',
                                fontSize: '48px',
                                fontWeight: 'bold',
                                lineHeight: '1.1',
                                maxWidth: '900px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {title}
                        </h1>
                    </div>

                    {/* Logo/Watermark at Top Left */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '40px',
                            left: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: 'white',
                            padding: '8px 16px',
                            borderRadius: '50px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                    >
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a1a1a' }}>PPSU Chronicles</span>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    } catch (e: any) {
        console.log(`${e.message}`);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
