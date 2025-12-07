import { NextRequest, NextResponse } from 'next/server';

/**
 * Fetch live football match data from API-Football
 * This endpoint acts as a proxy to avoid exposing API keys on the client
 */
export async function POST(request: NextRequest) {
  try {
    const { fixtureId } = await request.json();

    if (!fixtureId) {
      return NextResponse.json(
        { error: 'Fixture ID is required' },
        { status: 400 }
      );
    }

    // API-Football endpoint
    const apiUrl = `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`;
    
    // Get API key from environment variable
    const apiKey = process.env.FOOTBALL_API_KEY;

    if (!apiKey) {
      console.error('FOOTBALL_API_KEY not configured');
      return NextResponse.json(
        { error: 'API not configured', fallback: true },
        { status: 200 }
      );
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.response || data.response.length === 0) {
      return NextResponse.json(
        { error: 'No match data found', fallback: true },
        { status: 404 }
      );
    }

    const fixture = data.response[0];

    // Extract relevant match data
    const matchData = {
      status: fixture.fixture.status.short, // 'NS', 'LIVE', '1H', 'HT', '2H', 'FT', etc.
      statusLong: fixture.fixture.status.long,
      elapsed: fixture.fixture.status.elapsed, // Minutes played
      homeTeam: {
        name: fixture.teams.home.name,
        logo: fixture.teams.home.logo,
      },
      awayTeam: {
        name: fixture.teams.away.name,
        logo: fixture.teams.away.logo,
      },
      homeScore: fixture.goals.home,
      awayScore: fixture.goals.away,
      events: fixture.events?.slice(0, 10) || [], // Last 10 events (goals, cards, etc.)
      timestamp: fixture.fixture.timestamp,
      venue: fixture.fixture.venue?.name || 'Unknown Venue',
    };

    return NextResponse.json({
      success: true,
      data: matchData,
    });

  } catch (error) {
    console.error('Error fetching live score:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch live score',
        fallback: true,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
