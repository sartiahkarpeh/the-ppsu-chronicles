'use client';

import { useState, useEffect } from 'react';
import { db, storage } from '@/firebase/config';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export default function PredictionManagement() {
  const [activeTab, setActiveTab] = useState('matches'); // matches, teams, predictions
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  
  // Modal states
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [editingMatch, setEditingMatch] = useState(null);
  
  // Form states
  const [teamForm, setTeamForm] = useState({
    name: '',
    shortName: '',
    primaryColor: '#000000',
    secondaryColor: '#FFFFFF',
  });
  const [matchForm, setMatchForm] = useState({
    homeTeamId: '',
    awayTeamId: '',
    matchDate: '',
    matchTime: '',
    venue: '',
    description: '',
    status: 'upcoming',
    apiFixtureId: '',
  });
  
  const [teamLogoFile, setTeamLogoFile] = useState(null);
  const [teamLogoPreview, setTeamLogoPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all data
  useEffect(() => {
    fetchTeams();
    fetchMatches();
  }, []);

  useEffect(() => {
    if (selectedMatch) {
      fetchPredictions(selectedMatch.id);
    }
  }, [selectedMatch]);

  const fetchTeams = async () => {
    try {
      const q = query(collection(db, 'prediction_teams'), orderBy('name'));
      const snapshot = await getDocs(q);
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeams(teamsData);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      const q = query(collection(db, 'prediction_matches'), orderBy('matchDateTime', 'desc'));
      const snapshot = await getDocs(q);
      const matchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMatches(matchesData);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const fetchPredictions = async (matchId) => {
    try {
      const q = query(
        collection(db, 'predictions'),
        where('matchId', '==', matchId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const predictionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPredictions(predictionsData);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  // Team Management
  const openTeamModal = (team = null) => {
    if (team) {
      setEditingTeam(team);
      setTeamForm({
        name: team.name,
        shortName: team.shortName,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
      });
      setTeamLogoPreview(team.logoUrl || '');
    } else {
      setEditingTeam(null);
      setTeamForm({
        name: '',
        shortName: '',
        primaryColor: '#000000',
        secondaryColor: '#FFFFFF',
      });
      setTeamLogoPreview('');
    }
    setTeamLogoFile(null);
    setIsTeamModalOpen(true);
  };

  const closeTeamModal = () => {
    setIsTeamModalOpen(false);
    setEditingTeam(null);
    setTeamForm({
      name: '',
      shortName: '',
      primaryColor: '#000000',
      secondaryColor: '#FFFFFF',
    });
    setTeamLogoFile(null);
    setTeamLogoPreview('');
  };

  const handleTeamLogoChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setTeamLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setTeamLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let logoUrl = editingTeam?.logoUrl || '';
      let logoPath = editingTeam?.logoPath || '';

      if (teamLogoFile) {
        if (editingTeam?.logoPath) {
          try {
            await deleteObject(ref(storage, editingTeam.logoPath));
          } catch (err) {
            console.warn('Could not delete old logo:', err);
          }
        }

        logoPath = `prediction_teams/${Date.now()}_${teamLogoFile.name}`;
        const logoRef = ref(storage, logoPath);
        await uploadBytes(logoRef, teamLogoFile);
        logoUrl = await getDownloadURL(logoRef);
      }

      const teamData = {
        ...teamForm,
        logoUrl,
        logoPath,
        updatedAt: serverTimestamp(),
      };

      if (editingTeam) {
        await updateDoc(doc(db, 'prediction_teams', editingTeam.id), teamData);
      } else {
        teamData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'prediction_teams'), teamData);
      }

      await fetchTeams();
      closeTeamModal();
    } catch (error) {
      console.error('Error saving team:', error);
      alert('Error saving team. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTeamDelete = async (team) => {
    if (!confirm(`Delete ${team.name}? This cannot be undone.`)) return;

    try {
      if (team.logoPath) {
        await deleteObject(ref(storage, team.logoPath));
      }
      await deleteDoc(doc(db, 'prediction_teams', team.id));
      await fetchTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Error deleting team.');
    }
  };

  // Match Management
  const openMatchModal = (match = null) => {
    if (match) {
      setEditingMatch(match);
      const matchDate = new Date(match.matchDateTime);
      setMatchForm({
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        matchDate: matchDate.toISOString().split('T')[0],
        matchTime: matchDate.toTimeString().slice(0, 5),
        venue: match.venue,
        description: match.description || '',
        status: match.status,
        apiFixtureId: match.apiFixtureId || '',
      });
    } else {
      setEditingMatch(null);
      setMatchForm({
        homeTeamId: '',
        awayTeamId: '',
        matchDate: '',
        matchTime: '',
        venue: '',
        description: '',
        status: 'upcoming',
        apiFixtureId: '',
      });
    }
    setIsMatchModalOpen(true);
  };

  const closeMatchModal = () => {
    setIsMatchModalOpen(false);
    setEditingMatch(null);
    setMatchForm({
      homeTeamId: '',
      awayTeamId: '',
      matchDate: '',
      matchTime: '',
      venue: '',
      description: '',
      status: 'upcoming',
      apiFixtureId: '',
    });
  };

  const handleMatchSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const homeTeam = teams.find(t => t.id === matchForm.homeTeamId);
      const awayTeam = teams.find(t => t.id === matchForm.awayTeamId);

      if (!homeTeam || !awayTeam) {
        alert('Please select both teams');
        setIsSubmitting(false);
        return;
      }

      const matchDateTime = new Date(`${matchForm.matchDate}T${matchForm.matchTime}`).toISOString();

      const matchData = {
        homeTeamId: matchForm.homeTeamId,
        awayTeamId: matchForm.awayTeamId,
        homeTeam: {
          id: homeTeam.id,
          name: homeTeam.name,
          shortName: homeTeam.shortName,
          logoUrl: homeTeam.logoUrl,
          primaryColor: homeTeam.primaryColor,
        },
        awayTeam: {
          id: awayTeam.id,
          name: awayTeam.name,
          shortName: awayTeam.shortName,
          logoUrl: awayTeam.logoUrl,
          primaryColor: awayTeam.primaryColor,
        },
        matchDateTime,
        venue: matchForm.venue,
        description: matchForm.description,
        status: matchForm.status,
        apiFixtureId: matchForm.apiFixtureId || null,
        updatedAt: serverTimestamp(),
      };

      if (editingMatch) {
        await updateDoc(doc(db, 'prediction_matches', editingMatch.id), matchData);
      } else {
        matchData.createdAt = serverTimestamp();
        matchData.homeScore = null;
        matchData.awayScore = null;
        await addDoc(collection(db, 'prediction_matches'), matchData);
      }

      await fetchMatches();
      closeMatchModal();
    } catch (error) {
      console.error('Error saving match:', error);
      alert('Error saving match. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMatchDelete = async (match) => {
    if (!confirm(`Delete match between ${match.homeTeam.name} vs ${match.awayTeam.name}? This cannot be undone.`)) return;

    try {
      await deleteDoc(doc(db, 'prediction_matches', match.id));
      await fetchMatches();
    } catch (error) {
      console.error('Error deleting match:', error);
      alert('Error deleting match.');
    }
  };

  const updateMatchScore = async (match, homeScore, awayScore) => {
    try {
      await updateDoc(doc(db, 'prediction_matches', match.id), {
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
        status: 'completed',
        updatedAt: serverTimestamp(),
      });
      await fetchMatches();
    } catch (error) {
      console.error('Error updating score:', error);
      alert('Error updating score.');
    }
  };

  // Calculate prediction statistics
  const calculateStats = (predictions, match) => {
    if (!predictions.length) return null;

    const stats = {
      total: predictions.length,
      homeWins: 0,
      awayWins: 0,
      draws: 0,
      avgHomeScore: 0,
      avgAwayScore: 0,
    };

    let totalHomeScore = 0;
    let totalAwayScore = 0;

    predictions.forEach(pred => {
      if (pred.prediction.winner === 'home') stats.homeWins++;
      if (pred.prediction.winner === 'away') stats.awayWins++;
      if (pred.prediction.winner === 'draw') stats.draws++;
      totalHomeScore += pred.prediction.homeScore;
      totalAwayScore += pred.prediction.awayScore;
    });

    stats.avgHomeScore = (totalHomeScore / predictions.length).toFixed(1);
    stats.avgAwayScore = (totalAwayScore / predictions.length).toFixed(1);

    return stats;
  };

  // Export predictions to CSV
  const exportToCSV = (predictions, match) => {
    const headers = ['Name', 'Enrollment Number', 'Home Score', 'Away Score', 'Winner', 'Timestamp'];
    const rows = predictions.map(p => [
      p.name,
      p.enrollmentNumber,
      p.prediction.homeScore,
      p.prediction.awayScore,
      p.prediction.winner,
      new Date(p.createdAt).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `predictions_${match.homeTeam.shortName}_vs_${match.awayTeam.shortName}_${new Date().toISOString()}.csv`;
    a.click();
  };

  // Render Teams Tab
  const renderTeamsTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900">Teams</h3>
        <button
          onClick={() => openTeamModal()}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-md"
        >
          + Add Team
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map(team => (
          <div
            key={team.id}
            className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-200"
          >
            <div
              className="h-32 flex items-center justify-center"
              style={{ backgroundColor: team.primaryColor }}
            >
              {team.logoUrl ? (
                <img
                  src={team.logoUrl}
                  alt={team.name}
                  className="h-20 w-20 object-contain"
                />
              ) : (
                <div className="text-4xl text-white font-bold">{team.shortName}</div>
              )}
            </div>
            <div className="p-4">
              <h4 className="font-bold text-lg text-gray-900 mb-1">{team.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{team.shortName}</p>
              <div className="flex gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: team.primaryColor }}
                  />
                  <span className="text-xs text-gray-600">Primary</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: team.secondaryColor }}
                  />
                  <span className="text-xs text-gray-600">Secondary</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openTeamModal(team)}
                  className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleTeamDelete(team)}
                  className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {teams.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl">
          <p className="text-gray-500 text-lg mb-4">No teams yet</p>
          <p className="text-gray-400">Add your first team to get started</p>
        </div>
      )}
    </div>
  );

  // Render Matches Tab
  const renderMatchesTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900">Matches</h3>
        <button
          onClick={() => openMatchModal()}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-md"
          disabled={teams.length < 2}
        >
          + Create Match
        </button>
      </div>

      {teams.length < 2 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            ⚠️ You need at least 2 teams to create a match. Please add teams first.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {matches.map(match => {
          const matchDate = new Date(match.matchDateTime);
          const isPast = matchDate < new Date();
          const hasScore = match.homeScore !== null && match.homeScore !== undefined;

          return (
            <div
              key={match.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      match.status === 'upcoming'
                        ? 'bg-blue-100 text-blue-800'
                        : match.status === 'live'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {match.status.toUpperCase()}
                  </span>
                  <p className="text-sm text-gray-600 mt-2">
                    {matchDate.toLocaleDateString()} at {matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm text-gray-500">{match.venue}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openMatchModal(match)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleMatchDelete(match)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 text-center">
                  {match.homeTeam.logoUrl && (
                    <img
                      src={match.homeTeam.logoUrl}
                      alt={match.homeTeam.name}
                      className="h-16 w-16 object-contain mx-auto mb-2"
                    />
                  )}
                  <h4 className="font-bold text-lg">{match.homeTeam.name}</h4>
                </div>

                <div className="px-8 text-center">
                  {hasScore ? (
                    <div className="text-3xl font-bold text-gray-900">
                      {match.homeScore} : {match.awayScore}
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-gray-400">VS</div>
                  )}
                </div>

                <div className="flex-1 text-center">
                  {match.awayTeam.logoUrl && (
                    <img
                      src={match.awayTeam.logoUrl}
                      alt={match.awayTeam.name}
                      className="h-16 w-16 object-contain mx-auto mb-2"
                    />
                  )}
                  <h4 className="font-bold text-lg">{match.awayTeam.name}</h4>
                </div>
              </div>

              {!hasScore && isPast && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Enter Final Score:</p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const homeScore = e.target.homeScore.value;
                      const awayScore = e.target.awayScore.value;
                      updateMatchScore(match, homeScore, awayScore);
                    }}
                    className="flex items-center gap-4"
                  >
                    <input
                      type="number"
                      name="homeScore"
                      min="0"
                      placeholder="Home"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                    <span className="text-gray-500">:</span>
                    <input
                      type="number"
                      name="awayScore"
                      min="0"
                      placeholder="Away"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                    <button
                      type="submit"
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Save Score
                    </button>
                  </form>
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <button
                  onClick={() => {
                    setSelectedMatch(match);
                    setActiveTab('predictions');
                  }}
                  className="w-full bg-indigo-50 text-indigo-600 px-4 py-3 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                >
                  View Predictions ({predictions.filter(p => p.matchId === match.id).length})
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {matches.length === 0 && teams.length >= 2 && (
        <div className="text-center py-12 bg-white rounded-xl">
          <p className="text-gray-500 text-lg mb-4">No matches yet</p>
          <p className="text-gray-400">Create your first match to start collecting predictions</p>
        </div>
      )}
    </div>
  );

  // Render Predictions Tab
  const renderPredictionsTab = () => {
    if (!selectedMatch) {
      return (
        <div className="text-center py-12 bg-white rounded-xl">
          <p className="text-gray-500 text-lg mb-4">Select a match to view predictions</p>
          <button
            onClick={() => setActiveTab('matches')}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Go to Matches →
          </button>
        </div>
      );
    }

    const stats = calculateStats(predictions, selectedMatch);

    return (
      <div>
        <div className="mb-6">
          <button
            onClick={() => setSelectedMatch(null)}
            className="text-indigo-600 hover:text-indigo-800 font-medium mb-4"
          >
            ← Back to Matches
          </button>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {selectedMatch.homeTeam.name} vs {selectedMatch.awayTeam.name}
            </h3>
            <p className="text-gray-600">
              {new Date(selectedMatch.matchDateTime).toLocaleString()}
            </p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Total Predictions</h4>
              <p className="text-4xl font-bold text-indigo-600">{stats.total}</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Winner Predictions</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">{selectedMatch.homeTeam.shortName}:</span>
                  <span className="font-bold text-lg">{stats.homeWins}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">{selectedMatch.awayTeam.shortName}:</span>
                  <span className="font-bold text-lg">{stats.awayWins}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Draw:</span>
                  <span className="font-bold text-lg">{stats.draws}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Average Predicted Score</h4>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {stats.avgHomeScore} : {stats.avgAwayScore}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {selectedMatch.homeTeam.shortName} : {selectedMatch.awayTeam.shortName}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xl font-bold text-gray-900">All Predictions</h4>
            <button
              onClick={() => exportToCSV(predictions, selectedMatch)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              📥 Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enrollment
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Predicted Score
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Winner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {predictions.map((prediction) => (
                  <tr key={prediction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{prediction.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{prediction.enrollmentNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {prediction.prediction.homeScore} : {prediction.prediction.awayScore}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          prediction.prediction.winner === 'home'
                            ? 'bg-blue-100 text-blue-800'
                            : prediction.prediction.winner === 'away'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {prediction.prediction.winner === 'home' && selectedMatch.homeTeam.shortName}
                        {prediction.prediction.winner === 'away' && selectedMatch.awayTeam.shortName}
                        {prediction.prediction.winner === 'draw' && 'Draw'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(prediction.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {predictions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No predictions yet for this match</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Match Prediction Platform</h1>
          <p className="text-gray-600">Manage teams, matches, and view predictions</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('matches')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${
                activeTab === 'matches'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Matches ({matches.length})
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${
                activeTab === 'teams'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Teams ({teams.length})
            </button>
            <button
              onClick={() => setActiveTab('predictions')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${
                activeTab === 'predictions'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Predictions
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'teams' && renderTeamsTab()}
        {activeTab === 'matches' && renderMatchesTab()}
        {activeTab === 'predictions' && renderPredictionsTab()}

        {/* Team Modal */}
        {isTeamModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900">
                  {editingTeam ? 'Edit Team' : 'Add New Team'}
                </h3>
              </div>
              <form onSubmit={handleTeamSubmit} className="p-6">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-2">
                      Team Name
                    </label>
                    <input
                      type="text"
                      id="teamName"
                      value={teamForm.name}
                      onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Real Madrid"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="shortName" className="block text-sm font-medium text-gray-700 mb-2">
                      Short Name / Abbreviation
                    </label>
                    <input
                      type="text"
                      id="shortName"
                      value={teamForm.shortName}
                      onChange={(e) => setTeamForm({ ...teamForm, shortName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., RMA"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Color
                      </label>
                      <input
                        type="color"
                        id="primaryColor"
                        value={teamForm.primaryColor}
                        onChange={(e) => setTeamForm({ ...teamForm, primaryColor: e.target.value })}
                        className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                        Secondary Color
                      </label>
                      <input
                        type="color"
                        id="secondaryColor"
                        value={teamForm.secondaryColor}
                        onChange={(e) => setTeamForm({ ...teamForm, secondaryColor: e.target.value })}
                        className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Logo
                    </label>
                    <div className="mt-1 flex items-center space-x-6">
                      <div className="shrink-0">
                        {teamLogoPreview ? (
                          <img
                            src={teamLogoPreview}
                            alt="Preview"
                            className="h-24 w-24 object-contain border border-gray-300 rounded-lg p-2"
                          />
                        ) : (
                          <div className="h-24 w-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                            No Logo
                          </div>
                        )}
                      </div>
                      <label className="block cursor-pointer">
                        <span className="sr-only">Choose team logo</span>
                        <input
                          type="file"
                          onChange={handleTeamLogoChange}
                          accept="image/*"
                          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={closeTeamModal}
                    className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-indigo-300 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Saving...' : editingTeam ? 'Update Team' : 'Add Team'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Match Modal */}
        {isMatchModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900">
                  {editingMatch ? 'Edit Match' : 'Create New Match'}
                </h3>
              </div>
              <form onSubmit={handleMatchSubmit} className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="homeTeam" className="block text-sm font-medium text-gray-700 mb-2">
                        Home Team
                      </label>
                      <select
                        id="homeTeam"
                        value={matchForm.homeTeamId}
                        onChange={(e) => setMatchForm({ ...matchForm, homeTeamId: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      >
                        <option value="">Select Home Team</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="awayTeam" className="block text-sm font-medium text-gray-700 mb-2">
                        Away Team
                      </label>
                      <select
                        id="awayTeam"
                        value={matchForm.awayTeamId}
                        onChange={(e) => setMatchForm({ ...matchForm, awayTeamId: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      >
                        <option value="">Select Away Team</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="matchDate" className="block text-sm font-medium text-gray-700 mb-2">
                        Match Date
                      </label>
                      <input
                        type="date"
                        id="matchDate"
                        value={matchForm.matchDate}
                        onChange={(e) => setMatchForm({ ...matchForm, matchDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="matchTime" className="block text-sm font-medium text-gray-700 mb-2">
                        Match Time
                      </label>
                      <input
                        type="time"
                        id="matchTime"
                        value={matchForm.matchTime}
                        onChange={(e) => setMatchForm({ ...matchForm, matchTime: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">
                      Venue
                    </label>
                    <input
                      type="text"
                      id="venue"
                      value={matchForm.venue}
                      onChange={(e) => setMatchForm({ ...matchForm, venue: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Santiago Bernabéu"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      id="description"
                      value={matchForm.description}
                      onChange={(e) => setMatchForm({ ...matchForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Add any additional details about the match..."
                    />
                  </div>

                  <div>
                    <label htmlFor="apiFixtureId" className="block text-sm font-medium text-gray-700 mb-2">
                      API Fixture ID (Optional)
                      <span className="text-xs text-gray-500 ml-2">- For live score integration</span>
                    </label>
                    <input
                      type="text"
                      id="apiFixtureId"
                      value={matchForm.apiFixtureId}
                      onChange={(e) => setMatchForm({ ...matchForm, apiFixtureId: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., 867946 (from API-Football)"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Enter the fixture ID from API-Football to enable automatic live score updates. 
                      Leave blank to manually update scores.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      id="status"
                      value={matchForm.status}
                      onChange={(e) => setMatchForm({ ...matchForm, status: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="live">Live</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="mt-8 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={closeMatchModal}
                    className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-indigo-300 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Saving...' : editingMatch ? 'Update Match' : 'Create Match'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
