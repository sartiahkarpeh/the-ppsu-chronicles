'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Scale, AlertTriangle, Users, Clock, Shield, Trophy, Heart, FileText, Award } from 'lucide-react';

const rules = [
    {
        number: 1,
        title: 'Player Eligibility',
        icon: Users,
        content: 'All participating players must meet eligibility criteria specified by the organizing committee. Any falsification of information may result in disqualification.',
        bullets: [
            'Students under the umbrella of PP Savani',
            'No outsiders are allowed to participate'
        ]
    },
    {
        number: 2,
        title: 'Team Registration',
        icon: FileText,
        content: 'Teams must register within the stipulated deadline, providing accurate information about players, coaches, and team officials. Failure to comply may lead to exclusion from the tournament.'
    },
    {
        number: 3,
        title: 'Match Schedule',
        icon: Clock,
        content: 'Every game schedule will be provided in advance, and teams must adhere to the specified match timings. Players should arrive 15 minutes before match time. Any delay must be communicated to the organizers in a timely manner.',
        highlight: 'Fine of ₹500 will be applied to any team that prioritizes delay tactics before their game commences.'
    },
    {
        number: 4,
        title: 'Uniforms and Equipment',
        icon: Shield,
        content: 'Teams must wear designated uniforms as per their country colors and ensure players have appropriate equipment. Failure to comply may result in penalties or disqualification.'
    },
    {
        number: 5,
        title: 'Code of Conduct',
        icon: Scale,
        content: 'Players, coaches, and spectators must adhere to a high standard of sportsmanship. Unsportsmanlike behavior, including verbal abuse or physical altercations, will not be tolerated, fines will be imposed.'
    },
    {
        number: 6,
        title: 'Substitutions',
        icon: Users,
        content: 'Substitutions must follow the rules set by the organizing committee. Teams must notify officials before making substitutions during matches.',
        highlight: 'Four substitutions will be allowed in a single match.'
    },
    {
        number: 7,
        title: 'Scoring and Penalty',
        icon: Trophy,
        content: 'Points will be awarded for wins and ties. In case of a tie in rankings, a penalty kick will be applied as specified by the tournament rules. This will take place during the knock-out stage until the final.'
    },
    {
        number: 8,
        title: 'Referee Decisions',
        icon: Shield,
        content: 'Referee decisions are final and must be respected by players, coaches, and spectators. Only captains are allowed to bring complaints to the referee during the game. Disputes can be addressed through the proper channels outlined in the tournament guidelines. A proper communication should be addressed to the AFCON committee with substantial proof to back your appeal.'
    },
    {
        number: 9,
        title: 'Disciplinary Actions',
        icon: AlertTriangle,
        content: 'Any breach of rules may result in warnings, fines, point deductions, or disqualification, depending on the severity of the violation.',
        bullets: [
            'Physical Fight',
            'Bad words to the official of the tournament and fellow teammates',
            'Etc...'
        ],
        note: 'The organizing committee will make these decisions.'
    },
    {
        number: 10,
        title: 'Medical Support',
        icon: Heart,
        content: 'Adequate medical support must be undertaken during matches by the team officials. Injuries should be reported promptly, and players\' health and safety are of paramount importance. AFCON committee will provide the medical team.'
    },
    {
        number: 11,
        title: 'Withdrawal and Forfeiture',
        icon: FileText,
        content: 'Teams withdrawing from the tournament after registration may face penalties, and forfeiting matches without valid reasons may result in disciplinary actions.'
    },
    {
        number: 12,
        title: 'Protests and Appeals',
        icon: Scale,
        content: 'Protests or appeals must be submitted in writing to the organizing committee within the stipulated timeframe. Decisions on protests will be made promptly. It should be submitted with substantial proof to back your appeal.'
    },
    {
        number: 13,
        title: 'Fair Play Award',
        icon: Award,
        content: 'An award may be given to the team displaying exceptional sportsmanship and fair play throughout the tournament.'
    },
    {
        number: 14,
        title: 'Card Fines',
        icon: AlertTriangle,
        content: 'Fines will be imposed for cards obtained during matches. The imposed fine must be paid before the start of the respective team\'s next match.',
        highlight: 'Yellow Card: ₹50 | Red Card: ₹150',
        note: 'Failure to pay before the match will result in forfeiture.'
    }
];

export default function RulesPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black">
            {/* Hero Section */}
            <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 overflow-hidden">
                <div className="absolute inset-0 bg-[url('/afcon-pattern.svg')] opacity-5"></div>
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-afcon-green/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-afcon-gold/20 rounded-full blur-3xl"></div>

                <div className="relative max-w-7xl mx-auto px-4 py-6 md:py-10">
                    <Link
                        href="/afcon25"
                        className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-4 md:mb-6 transition-colors text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to AFCON 2025
                    </Link>

                    <div className="flex flex-col items-center text-center">
                        <div className="p-3 bg-afcon-green/10 backdrop-blur-sm border border-afcon-green/20 rounded-xl mb-3">
                            <Scale className="w-8 h-8 md:w-10 md:h-10 text-afcon-green" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-display font-bold text-white uppercase tracking-wider mb-2">
                            Rules & Regulations
                        </h1>
                        <p className="text-base md:text-xl text-afcon-gold font-medium">
                            African Cup of Nations — PP Savani Chapter
                        </p>
                    </div>
                </div>
            </div>

            {/* Rules Content */}
            <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
                {/* Important Notice */}
                <div className="bg-gradient-to-r from-afcon-gold/20 to-afcon-gold/10 border border-afcon-gold/30 rounded-2xl p-6 mb-8">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-afcon-gold/20 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-afcon-gold" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Important Notice</h3>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                These rules are subject to change, and participants are responsible for staying updated on any amendments communicated by the organizing committee.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Rules List */}
                <div className="space-y-6">
                    {rules.map((rule) => {
                        const Icon = rule.icon;
                        return (
                            <div
                                key={rule.number}
                                className="bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden hover:shadow-lg transition-shadow"
                            >
                                {/* Rule Header */}
                                <div className="flex items-center gap-4 p-5 border-b border-gray-100 dark:border-white/10">
                                    <div className="flex items-center justify-center w-10 h-10 bg-afcon-green text-black font-bold rounded-xl">
                                        {rule.number}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Icon className="w-5 h-5 text-afcon-green" />
                                        <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">
                                            {rule.title}
                                        </h2>
                                    </div>
                                </div>

                                {/* Rule Content */}
                                <div className="p-5">
                                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {rule.content}
                                    </p>

                                    {/* Bullets */}
                                    {rule.bullets && (
                                        <ul className="mt-4 space-y-2">
                                            {rule.bullets.map((bullet, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                                                    <span className="w-1.5 h-1.5 bg-afcon-green rounded-full mt-2 flex-shrink-0"></span>
                                                    {bullet}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {/* Highlight Box */}
                                    {rule.highlight && (
                                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl">
                                            <p className="text-red-700 dark:text-red-300 font-semibold">
                                                ⚠️ {rule.highlight}
                                            </p>
                                        </div>
                                    )}

                                    {/* Note */}
                                    {rule.note && (
                                        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 italic">
                                            {rule.note}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="mt-12 text-center">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        For any queries, please contact the AFCON organizing committee.
                    </p>
                    <Link
                        href="/afcon25"
                        className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-afcon-green text-black font-bold rounded-xl hover:bg-afcon-green/90 transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to AFCON 2025
                    </Link>
                </div>
            </main>
        </div>
    );
}
