import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { enrollmentNumber, matchId, deviceId } = await request.json();

    if (!enrollmentNumber || !matchId || !deviceId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 503 }
      );
    }
    const predictionsRef = db.collection('predictions');

    // Check if prediction exists for this enrollment number OR device ID for this match
    const snapshot = await predictionsRef
      .where('matchId', '==', matchId)
      .get();

    // Check if enrollment number or device ID already exists
    const existingPrediction = snapshot.docs.find(doc => {
      const data = doc.data();
      return data.enrollmentNumber === enrollmentNumber.toUpperCase() ||
        data.deviceId === deviceId;
    });

    if (existingPrediction) {
      // User or device has already submitted a prediction
      const predictionData = existingPrediction.data();
      return NextResponse.json({
        exists: true,
        prediction: {
          id: existingPrediction.id,
          ...predictionData,
        },
      });
    }

    // No prediction found
    return NextResponse.json({
      exists: false,
    });
  } catch (error) {
    console.error('Error checking prediction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
