// src/app/live/components/LiveEventSchema.tsx
"use client";

import { useEffect } from 'react';
import { LiveGame } from '@/app/live/types';

interface LiveEventSchemaProps {
  game: LiveGame;
}

/**
 * LiveEventSchema Component
 * 
 * Generates schema.org JSON-LD structured data for live sporting events.
 * This helps search engines and social platforms recognize and display
 * the event as a live event with proper metadata.
 * 
 * Benefits:
 * - Rich snippets in Google Search
 * - Live badges on social media
 * - Better SEO for live content
 * - Google Event Search inclusion
 */
export default function LiveEventSchema({ game }: LiveEventSchemaProps) {
  useEffect(() => {
    // Only generate schema for LIVE events
    if (game.status !== "LIVE") return;

    // Calculate event times
    const now = new Date();
    const startTime = game.startTime 
      ? (game.startTime instanceof Date ? game.startTime : game.startTime.toDate())
      : now;
    
    // Calculate end time (typically 90 minutes for football, 48 minutes for basketball)
    const durationMinutes = game.sport === "Football" ? 90 : 48;
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    // Determine event status based on current time
    const isInProgress = now >= startTime && now <= endTime;
    const eventStatus = isInProgress 
      ? "https://schema.org/EventInProgress"
      : "https://schema.org/EventScheduled";

    // Create schema.org JSON-LD structured data
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "SportsEvent",
      "name": `${game.teamA.name} vs ${game.teamB.name} - ${game.sport}`,
      "description": `Live ${game.sport} match: ${game.teamA.name} vs ${game.teamB.name} at ${game.location}`,
      
      // Event timing
      "startDate": startTime.toISOString(),
      "endDate": endTime.toISOString(),
      
      // Event status (Scheduled, InProgress, Postponed, Cancelled)
      "eventStatus": eventStatus,
      
      // Attendance mode (Online, Offline, Mixed)
      "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
      
      // Location as virtual (online streaming)
      "location": {
        "@type": "VirtualLocation",
        "url": `https://www.theppsuchronicles.com/live`
      },
      
      // Organizer
      "organizer": {
        "@type": "Organization",
        "name": "P. P. Savani University",
        "url": "https://www.theppsuchronicles.com"
      },
      
      // Sport type
      "sport": game.sport,
      
      // Competitors
      "competitor": [
        {
          "@type": "SportsTeam",
          "name": game.teamA.name,
          "logo": game.teamA.imageUrl || undefined
        },
        {
          "@type": "SportsTeam",
          "name": game.teamB.name,
          "logo": game.teamB.imageUrl || undefined
        }
      ],
      
      // Current score (if available)
      "score": game.score,
      
      // League/Competition
      "superEvent": {
        "@type": "SportsEvent",
        "name": game.league
      },
      
      // Image for social sharing
      "image": game.teamA.imageUrl || game.teamB.imageUrl || "https://www.theppsuchronicles.com/ppsu.png",
      
      // Publishing info
      "isLiveBroadcast": true,
      "inLanguage": "en",
      
      // Additional metadata
      "typicalAgeRange": "18-",
      "audience": {
        "@type": "Audience",
        "audienceType": "Students and Sports Fans"
      }
    };

    // Remove undefined values
    const cleanedSchema = JSON.parse(JSON.stringify(schemaData));

    // Check if script already exists
    let scriptElement = document.getElementById(`live-event-schema-${game.id}`);
    
    if (scriptElement) {
      // Update existing script
      scriptElement.textContent = JSON.stringify(cleanedSchema, null, 2);
    } else {
      // Create new script element
      scriptElement = document.createElement('script');
      scriptElement.id = `live-event-schema-${game.id}`;
      scriptElement.type = 'application/ld+json';
      scriptElement.textContent = JSON.stringify(cleanedSchema, null, 2);
      document.head.appendChild(scriptElement);
    }

    // Cleanup function to remove script when component unmounts
    return () => {
      const element = document.getElementById(`live-event-schema-${game.id}`);
      if (element) {
        element.remove();
      }
    };
  }, [game]);

  // This component doesn't render anything visible
  return null;
}
