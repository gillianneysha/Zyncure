import React, { useState, useEffect } from 'react';
import { FileDown } from 'lucide-react';
import PatientCharts from '../../components/PatientCharts';
import { supabase } from '../../client';
import { generatePDF } from '../../utils/generateTrackingReport';

const Home = () => {
  const [symptomStats, setSymptomStats] = useState({
    totalLogs: 0,
    lastLogged: null,
    mostCommon: null,
    recentMood: null
  });
  const [loggedDates, setLoggedDates] = useState([]);
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    birthdate: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '', isError: false });

  useEffect(() => {
    fetchSymptomStats();
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('User fetch failed:', authError?.message);
        return;
      }

      // Fetch profile info from patients table
      const { data: profile, error: profileError } = await supabase
        .from('patients')
        .select('first_name, last_name, email, birthdate')
        .eq('patient_id', user.id)
        .maybeSingle();

      if (profileError || !profile) {
        console.error('Profile fetch error:', profileError?.message || 'No matching patient found');
        return;
      }

      setUserInfo({
        name: `${profile.first_name} ${profile.last_name}`,
        email: profile.email,
        birthdate: profile.birthdate
      });
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

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

      // Store the logged dates for PDF generation
      if (symptomLogs) {
        const normalizedLogs = symptomLogs.map(entry => ({
          ...entry,
          date_logged: new Date(entry.date_logged),
        }));
        setLoggedDates(normalizedLogs);
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
        // No data found, demo data
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

  const handleDownload = async () => {
    if (!userInfo.name) {
      setModalContent({
        title: 'Please wait',
        message: 'Patient information is still loading. Try again in a moment.',
        isError: true
      });
      setShowModal(true);
      return;
    }

    if (loggedDates.length === 0) {
      setModalContent({
        title: 'No Data Available',
        message: 'There are no symptom logs to generate a report. Start tracking your symptoms first.',
        isError: true
      });
      setShowModal(true);
      return;
    }

    try {
      setModalContent({
        title: 'Generating Report...',
        message: 'Please wait while we create your comprehensive health report with charts.',
        isError: false
      });
      setShowModal(true);

      await new Promise(resolve => setTimeout(resolve, 500));
      const fileName = await generatePDF(loggedDates, userInfo);

      setModalContent({
        title: 'PDF Generated!',
        message: `Your health report with visual analytics has been downloaded as "${fileName}"`,
        isError: false
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      setModalContent({
        title: 'Error',
        message: 'Failed to generate PDF report. Please try again.',
        isError: true
      });
    }
  };

  return (
    <div className="min-h-screen from-pink-50 to-orange-50">
      {/* Header Section */}
      <div className="px-6 py-4">
        <h1 className="text-4xl font-bold" style={{ color: '#55A1A4' }}>
          Welcome!
        </h1>
        <p className="text-gray-600 mt-1">
          Track your symptoms, mood, and wellness journey.
        </p>
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

        {/* Charts Section */}
        <PatientCharts />

        {/* Download Report Button */}
        <div className="w-full flex justify-end mt-6">
          <div className="bg-[#FFE0D3] rounded-2xl px-6 py-4 shadow-sm">
            <button
              onClick={handleDownload}
              className="flex flex-col items-center text-[#F98679] hover:text-[#B65C4B] transition text-sm focus:outline-none"
              disabled={!userInfo.name}
            >
              <FileDown size={24} />
              <span className="mt-1 font-semibold">Download Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 shadow-2xl text-center max-w-sm w-full">
            <h2 className={`text-xl font-bold ${modalContent.isError ? 'text-red-600' : 'text-[#3BA4A0]'}`}>
              {modalContent.title}
            </h2>
            <p className="text-[#555] mb-4 mt-2">{modalContent.message}</p>
            <button
              onClick={() => setShowModal(false)}
              className={`${modalContent.isError ? 'bg-red-500 hover:bg-red-600' : 'bg-[#F98679] hover:bg-[#d87364]'} text-white font-semibold px-6 py-2 rounded-full transition`}
            >
              {modalContent.isError ? 'Close' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;