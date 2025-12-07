import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/config';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

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

    // Check if user or device has already submitted (server-side double-check)
    const predictionsRef = collection(db, 'predictions');
    const q = query(
      predictionsRef,
      where('matchId', '==', matchId)
    );

    const querySnapshot = await getDocs(q);

    // Check for existing prediction by enrollment number OR device ID
    const existingPrediction = querySnapshot.docs.find(doc => {
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
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(predictionsRef, predictionData);

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
