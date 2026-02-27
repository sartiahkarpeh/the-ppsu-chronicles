'use client';

import { useEffect, useState } from 'react';
import { db } from '@/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import type { BasketballPageConfig } from '@/types/basketball';

import HeroGame from '@/components/basketball/HeroGame';
import ScoreboardList from '@/components/basketball/ScoreboardList';
import TeamGrid from '@/components/basketball/TeamGrid';
import InjuryReport from '@/components/basketball/InjuryReport';

export default function BasketballHomePage() {
    const [config, setConfig] = useState<BasketballPageConfig | null>(null);

    useEffect(() => {
        // Fetch public page config
        const unsubscribe = onSnapshot(
            doc(db, 'basketball_configs', 'page'),
            (docSnap) => {
                if (docSnap.exists()) {
                    setConfig(docSnap.data() as BasketballPageConfig);
                } else {
                    // Default fallback if config hasn't been created yet
                    setConfig({
                        showHeroSection: true,
                        showScoreboard: true,
                        showTeamGrid: true,
                        showInjuryReport: true,
                        seoTitle: 'Basketball | PPSU',
                        seoDescription: 'Live Scores'
                    } as BasketballPageConfig);
                }
            }
        );

        return () => unsubscribe();
    }, []);

    if (!config) {
        return (
            <div className="flex-1 flex items-center justify-center bg-black min-h-screen border-b border-neutral-900">
                <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(234,88,12,0.5)]"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-black text-white w-full overflow-x-hidden">
            <HeroGame config={config} />
            <ScoreboardList config={config} />
            <TeamGrid config={config} />
            <InjuryReport config={config} />
        </div>
    );
}
