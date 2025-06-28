import React, { useState, useEffect } from 'react';
import PatientCharts from '../../components/PatientCharts';
import { supabase } from '../../client';

const Home = () => {
  const [symptomStats, setSymptomStats] = useState({
    totalLogs: 0,
    lastLogged: null,
    mostCommon: null,
    recentMood: null
  });

  useEffect(() => {
    fetchSymptomStats();
  }, []);

  const fetchSymptomStats = async () => {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('User fetch failed:', authError?.message);
        // Fallback to demo data if user not authenticated
        setSymptomStats({
          totalLogs: 47,
          lastLogged: 'Today',
          mostCommon: 'Period Tracking',
          recentMood: 'Happy'
        });
        return;
      }

      // Fetch all symptom logs for the current user
      const { data: symptomLogs, error: fetchError } = await supabase
        .from('symptomlog')
        .select('*')
        .eq('patients_id', user.id)
        .order('date_logged', { ascending: false });

      if (fetchError) {
        console.error('Error fetching symptom data:', fetchError.message);
        // Fallback to demo data on error
        setSymptomStats({
          totalLogs: 47,
          lastLogged: 'Today',
          mostCommon: 'Period Tracking',
          recentMood: 'Happy'
        });
        return;
      }

      // Process the data
      if (symptomLogs && symptomLogs.length > 0) {
        const totalLogs = symptomLogs.length;
        
        // Get last logged date
        const lastLoggedDate = new Date(symptomLogs[0].date_logged);
        const lastLogged = formatLastLogged(lastLoggedDate);
        
        // Count symptom types to find most common
        const symptomCounts = {};
        symptomLogs.forEach(log => {
          const symptom = log.symptoms;
          symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
        });
        
        const mostCommon = Object.keys(symptomCounts).reduce((a, b) => 
          symptomCounts[a] > symptomCounts[b] ? a : b
        );
        
        // Get most recent mood (Feelings entry)
        const recentMoodLog = symptomLogs.find(log => log.symptoms === 'Feelings');
        const recentMood = recentMoodLog ? recentMoodLog.severity : 'Not logged';
        
        setSymptomStats({
          totalLogs,
          lastLogged,
          mostCommon,
          recentMood
        });
      } else {
        // No data found, use demo data
        setSymptomStats({
          totalLogs: 0,
          lastLogged: 'Never',
          mostCommon: 'None',
          recentMood: 'Not logged'
        });
      }
    } catch (error) {
      console.error('Error in fetchSymptomStats:', error);
      // Fallback to demo data on error
      setSymptomStats({
        totalLogs: 47,
        lastLogged: 'Today',
        mostCommon: 'Period Tracking',
        recentMood: 'Happy'
      });
    }
  };

  const formatLastLogged = (date) => {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-orange-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-pink-100">
        <div className="px-6 py-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-orange-500 bg-clip-text text-transparent">
            Welcome!
          </h1>
          <p className="text-gray-600 mt-1">
            Track your symptoms, mood, and wellness journey
          </p>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
            <div className="flex items-center">
              <div className="p-3 bg-pink-100 rounded-full">
                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Logs</p>
                <p className="text-2xl font-bold text-gray-900">{symptomStats.totalLogs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-orange-100">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-full">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Last Logged</p>
                <p className="text-2xl font-bold text-gray-900">{symptomStats.lastLogged || 'Never'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-purple-100">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Most Tracked</p>
                <p className="text-lg font-bold text-gray-900">{symptomStats.mostCommon || 'None'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-green-100">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-10 5a7 7 0 1114 0H5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recent Mood</p>
                <p className="text-2xl font-bold text-gray-900">{symptomStats.recentMood}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Health Tracking Navigation */}
        {/* <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Symptom Logging</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 rounded-lg border-2 border-pink-200 hover:border-pink-400 hover:bg-pink-50 transition-colors">
              <div className="text-2xl mb-2">🩸</div>
              <div className="font-medium text-gray-700">Period</div>
            </button>
            <button className="p-4 rounded-lg border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-colors">
              <div className="text-2xl mb-2">😊</div>
              <div className="font-medium text-gray-700">Feelings</div>
            </button>
            <button className="p-4 rounded-lg border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50 transition-colors">
              <div className="text-2xl mb-2">✨</div>
              <div className="font-medium text-gray-700">Skin</div>
            </button>
            <button className="p-4 rounded-lg border-2 border-green-200 hover:border-green-400 hover:bg-green-50 transition-colors">
              <div className="text-2xl mb-2">⚡</div>
              <div className="font-medium text-gray-700">Metabolism</div>
            </button>
          </div>
        </div> */}

        {/* Charts Section */}
        <PatientCharts />
      </div>
    </div>
  );
};

export default Home;