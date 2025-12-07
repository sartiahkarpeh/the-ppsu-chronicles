import React from 'react';
import { Globe, Trophy, Activity } from 'lucide-react';

export default function StatsRow() {
    const stats = [
        { label: 'Countries', value: '7', icon: <Globe className="w-8 h-8 text-afcon-green" /> },
        { label: 'Matches', value: '10', icon: <Activity className="w-8 h-8 text-afcon-orange" /> },
        { label: 'Champion', value: '1', icon: <Trophy className="w-8 h-8 text-afcon-gold" /> },
    ];

    return (
        <div className="relative z-20 max-w-5xl mx-auto px-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 flex flex-col md:flex-row justify-between items-center gap-8 md:gap-0">
                {stats.map((stat, index) => (
                    <div key={stat.label} className="flex-1 w-full flex flex-col items-center text-center group">
                        <div className="mb-2 group-hover:scale-110 transition-transform duration-300">{stat.icon}</div>
                        <div className="text-4xl font-display font-black text-afcon-black dark:text-white mb-1">
                            {stat.value}
                        </div>
                        <div className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            {stat.label}
                        </div>
                        {index < stats.length - 1 && (
                            <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-px h-12 bg-gray-200 dark:bg-gray-700"></div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
