import Link from 'next/link';
import React from 'react';
import { Calendar, Trophy, Film, Users } from 'lucide-react';

export default function NavCards() {
    const cards = [
        { title: 'Fixtures', icon: <Calendar className="w-8 h-8" />, href: '/afcon25/fixtures', color: 'bg-blue-600' },
        { title: 'Standings', icon: <Trophy className="w-8 h-8" />, href: '/afcon25/standings', color: 'bg-afcon-gold' },
        { title: 'Highlights', icon: <Film className="w-8 h-8" />, href: '/afcon25/highlights', color: 'bg-red-600' },
        { title: 'Teams', icon: <Users className="w-8 h-8" />, href: '/afcon25/teams', color: 'bg-afcon-green' },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto px-4 py-12">
            {cards.map((card) => (
                <Link
                    key={card.title}
                    href={card.href}
                    className="group relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
                >
                    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500 ${card.color}`}></div>

                    <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${card.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            {card.icon}
                        </div>
                        <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                            {card.title}
                        </h3>
                    </div>
                </Link>
            ))}
        </div>
    );
}
