'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Users, Trophy, User, Calendar, ArrowLeft } from 'lucide-react';
import { getTeams } from '@/lib/afcon/firestore';
import type { Team } from '@/types/afcon';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const data = await getTeams();
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
        setTeams(sorted);
      } catch (error) {
        console.error('Error fetching teams:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-afcon-green border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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
              <Users className="w-8 h-8 md:w-10 md:h-10 text-afcon-green" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-display font-bold text-white uppercase tracking-wider mb-2">
              Participating Teams
            </h1>
            <p className="text-base md:text-xl text-afcon-gold font-medium">
              {teams.length} Teams Competing for Glory
            </p>
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {teams.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {teams.map(team => (
              <button
                key={team.id}
                onClick={() => setSelectedTeam(team)}
                className="group relative bg-white dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-8 text-center overflow-hidden cursor-pointer"
              >
                {/* Team Color Accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: team.primary_color || '#000' }}
                ></div>

                <div className="relative z-10">
                  {/* Large Flag or Crest Display */}
                  <div className="w-40 h-32 mx-auto mb-4 relative flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                    {team.flag_url ? (
                      <img
                        src={team.flag_url}
                        alt={`${team.name} flag`}
                        className="w-full h-full object-contain"
                      />
                    ) : team.crest_url ? (
                      <img
                        src={team.crest_url}
                        alt={team.name}
                        className="w-full h-full object-contain"
                      />
                    ) : null}
                  </div>

                  <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2 group-hover:text-afcon-gold transition-colors">
                    {team.name}
                  </h3>

                  <div className="inline-block px-3 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-sm text-gray-600 dark:text-gray-300 mb-2">
                    {team.country}
                  </div>

                  <p className="text-xs text-gray-400 font-mono uppercase tracking-widest mb-2">
                    {team.fifa_code}
                  </p>

                  {/* Player count badge */}
                  {team.players && team.players.length > 0 && (
                    <div className="flex items-center justify-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                      <Users className="w-3 h-3" />
                      <span>{team.players.length} players</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
            <div className="mb-6 inline-flex items-center justify-center w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full">
              <Users className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No Teams Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Participating teams will be listed here soon
            </p>
          </div>
        )}
      </main>

      {/* Team Detail Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
            {/* Header with Flag */}
            <div className="relative">
              {selectedTeam.flag_url && (
                <div className="h-64 w-full">
                  <img
                    src={selectedTeam.flag_url}
                    alt={`${selectedTeam.name} flag`}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setSelectedTeam(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Team Crest Overlay */}
              <div className="absolute -bottom-12 left-8">
                {selectedTeam.crest_url && (
                  <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-full p-3 shadow-xl border-4 border-white dark:border-gray-900">
                    <img
                      src={selectedTeam.crest_url}
                      alt={selectedTeam.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-8 pt-16">
              {/* Team Info */}
              <div className="mb-8">
                <h2 className="text-4xl font-display font-bold text-gray-900 dark:text-white mb-2">
                  {selectedTeam.name}
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">{selectedTeam.country}</p>
                <div className="flex items-center gap-4">
                  <span className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-mono">
                    {selectedTeam.fifa_code}
                  </span>
                  <div
                    className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: selectedTeam.primary_color }}
                    title="Team Color"
                  ></div>
                </div>
              </div>

              {/* Coach */}
              {selectedTeam.coach && (
                <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-afcon-gold" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Head Coach</h3>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 ml-8">{selectedTeam.coach}</p>
                </div>
              )}

              {/* Players */}
              {selectedTeam.players && selectedTeam.players.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="w-5 h-5 text-afcon-gold" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Squad ({selectedTeam.players.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedTeam.players.map((player, index) => (
                      <div
                        key={index}
                        className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 flex items-center justify-center bg-afcon-gold/10 text-afcon-gold font-bold rounded-full text-sm">
                            {index + 1}
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white font-medium">
                            {player}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="grid md:grid-cols-2 gap-6 mt-8">
                <div className="p-6 bg-gradient-to-br from-afcon-green/10 to-afcon-green/5 rounded-2xl border border-afcon-green/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-5 h-5 text-afcon-green" />
                    <h4 className="font-bold text-gray-900 dark:text-white">Tournament Info</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Competing in AFCON 2025
                  </p>
                </div>

                <div className="p-6 bg-gradient-to-br from-afcon-gold/10 to-afcon-gold/5 rounded-2xl border border-afcon-gold/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-afcon-gold" />
                    <h4 className="font-bold text-gray-900 dark:text-white">Follow Team</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Track fixtures and results
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
