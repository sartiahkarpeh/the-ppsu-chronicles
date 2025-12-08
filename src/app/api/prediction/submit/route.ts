import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { name, enrollmentNumber, matchId, prediction, deviceId } = await request.json();

    // Validate input
    if (!name || !enrollmentNumber || !matchId || !prediction || !deviceId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { homeScore, awayScore, winner } = prediction;

    if (
      homeScore === undefined ||
      awayScore === undefined ||
      !winner
    ) {
      return NextResponse.json(
        { error: 'Incomplete prediction data' },
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

    // Check if user or device has already submitted (server-side double-check)
    const snapshot = await predictionsRef
      .where('matchId', '==', matchId)
      .get();

    // Check for existing prediction by enrollment number OR device ID
    const existingPrediction = snapshot.docs.find(doc => {
      const data = doc.data();
      return data.enrollmentNumber === enrollmentNumber.toUpperCase() ||
        data.deviceId === deviceId;
    });

    if (existingPrediction) {
      const data = existingPrediction.data();
      if (data.enrollmentNumber === enrollmentNumber.toUpperCase()) {
        return NextResponse.json(
          { error: 'You have already submitted a prediction for this match' },
          { status: 409 }
        );
      } else {
        return NextResponse.json(
          { error: 'This device has already been used to submit a prediction for this match' },
          { status: 409 }
        );
      }
    }

    // Create prediction document
    const predictionData = {
      name: name.trim(),
      enrollmentNumber: enrollmentNumber.toUpperCase(),
      deviceId,
      matchId,
      prediction: {
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
        winner,
      },
      timestamp: FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
    };

    const docRef = await predictionsRef.add(predictionData);

    return NextResponse.json({
      success: true,
      prediction: {
        id: docRef.id,
        ...predictionData,
        timestamp: predictionData.createdAt, // Use createdAt for immediate response
      },
    });
  } catch (error) {
    console.error('Error submitting prediction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
