import React, { useState, useEffect } from 'react';
import PatientCharts from '../../components/PatientCharts';
// import { symptomDataService } from '../../services/symptomDataService';

const Home = () => {
  const [symptomStats, setSymptomStats] = useState({
    totalLogs: 0,
    lastLogged: null,
    mostCommon: null,
    recentMood: null
  });

  useEffect(() => {
    // Uncomment when you have Supabase set up
    // fetchSymptomStats();

    // Sample stats for demo
    setSymptomStats({
      totalLogs: 47,
      lastLogged: 'Today',
      mostCommon: 'Period Tracking',
      recentMood: 'Happy'
    });
  }, []);

  // const fetchSymptomStats = async () => {
  //   try {
  //     const currentPatientId = 'your-patient-uuid'; // Get from auth context
  //     const stats = await symptomDataService.getSymptomStats(currentPatientId);
  //     // Process and set stats
  //   } catch (error) {
  //     console.error('Error fetching stats:', error);
  //   }
  // };

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
                <p className="text-2xl font-bold text-gray-900">{symptomStats.lastLogged}</p>
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
                <p className="text-lg font-bold text-gray-900">{symptomStats.mostCommon}</p>
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
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
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
        </div>

        {/* Charts Section */}
        <PatientCharts />
      </div>
    </div>
  );
};

export default Home;
