import { NextRequest, NextResponse } from 'next/server';

// Football API configuration
// Using TheSportsDB API - Free tier available
// Alternative: API-Football (requires API key)
const SPORTS_DB_API = 'https://www.thesportsdb.com/api/v1/json/3';

// Team IDs for TheSportsDB
const REAL_MADRID_ID = '133602';
const BARCELONA_ID = '133604';

export async function GET(request: NextRequest) {
  try {
    // For a real implementation, you would:
    // 1. Get the specific match ID
    // 2. Fetch live data from the API
    // 3. Parse and return the score
    
    // Example endpoint: https://www.thesportsdb.com/api/v1/json/3/livescore.php?l=4335
    // Where 4335 is the league ID for La Liga
    
    // For now, this is a mock response that you can replace with actual API calls
    
    // Try to fetch from TheSportsDB
    try {
      // Fetch recent events for both teams
      const response = await fetch(
        `${SPORTS_DB_API}/eventslast.php?id=${REAL_MADRID_ID}`,
        { cache: 'no-store' }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Look for Real Madrid vs Barcelona match in recent events
        if (data.results) {
          const classicoMatch = data.results.find((event: any) => 
            (event.strHomeTeam === 'Real Madrid' && event.strAwayTeam === 'Barcelona') ||
            (event.strHomeTeam === 'Barcelona' && event.strAwayTeam === 'Real Madrid')
          );
          
          if (classicoMatch) {
            return NextResponse.json({
              match: {
                homeTeam: classicoMatch.strHomeTeam,
                awayTeam: classicoMatch.strAwayTeam,
                homeScore: parseInt(classicoMatch.intHomeScore) || 0,
                awayScore: parseInt(classicoMatch.intAwayScore) || 0,
                status: classicoMatch.strStatus || 'Not Started',
                time: classicoMatch.strProgress || 'Scheduled',
              },
            });
          }
        }
      }
    } catch (apiError) {
      console.error('Error fetching from TheSportsDB:', apiError);
    }
    
    // Fallback: Return match not started message
    return NextResponse.json({
      message: 'Match has not started yet or live data unavailable',
      match: null,
    });
    
    // UNCOMMENT THIS FOR TESTING PURPOSES:
    // This returns mock live data to test the UI
    /*
    return NextResponse.json({
      match: {
        homeTeam: 'Real Madrid',
        awayTeam: 'Barcelona',
        homeScore: 2,
        awayScore: 1,
        status: 'In Progress',
        time: '67\'',
      },
    });
    */
    
  } catch (error) {
    console.error('Error in live-score API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch live score',
        message: 'Unable to retrieve match data at this time'
      },
      { status: 500 }
    );
  }
}

// Alternative API implementation using API-Football (requires API key)
/*
async function fetchFromAPIFootball() {
  const API_KEY = process.env.FOOTBALL_API_KEY;
  const API_HOST = 'api-football-v1.p.rapidapi.com';
  
  const response = await fetch(
    'https://api-football-v1.p.rapidapi.com/v3/fixtures?live=all',
    {
      headers: {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': API_HOST,
      },
      cache: 'no-store',
    }
  );
  
  const data = await response.json();
  
  // Find El Clasico match
  const clasico = data.response.find((fixture: any) => 
    (fixture.teams.home.name === 'Real Madrid' && fixture.teams.away.name === 'Barcelona') ||
    (fixture.teams.home.name === 'Barcelona' && fixture.teams.away.name === 'Real Madrid')
  );
  
  if (clasico) {
    return {
      homeTeam: clasico.teams.home.name,
      awayTeam: clasico.teams.away.name,
      homeScore: clasico.goals.home,
      awayScore: clasico.goals.away,
      status: clasico.fixture.status.long,
      time: clasico.fixture.status.elapsed ? `${clasico.fixture.status.elapsed}'` : 'Scheduled',
    };
  }
  
  return null;
}
*/
