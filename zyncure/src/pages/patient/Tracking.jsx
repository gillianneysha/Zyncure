import React, { useState, useEffect } from 'react';
import {
  Droplet, Droplets, FileDown, FileUp, CloudSun, Leaf, Sun, Moon, Circle,
  Rainbow, Flame, TriangleAlert, MessageCircleWarning,
  Heart, Brain, Activity, CircleArrowDown, CircleArrowUp, CircleAlert, Eye, Bed,
  Laugh, Frown, Popcorn, CakeSlice, Beef, Apple, Drumstick, Candy,
  BatteryWarning, BatteryLow, BatteryMedium, BatteryFull, Gauge, NotebookPen, Check
} from 'lucide-react';
import TrackingCalendar from '../../components/TrackingCalendar';
import { supabase } from '../../client';
import ShareSymptom from '../../components/ShareSymptom';
import { generatePDF } from '../../utils/generateTrackingReport';

const PeriodTracker = () => {
  const [selectedTab, setSelectedTab] = useState('Feelings');
  const [selectedValues, setSelectedValues] = useState({
    Feelings: '',
    Cravings: '',
    'Period Flow': '',
    'Symptoms': '',
    Energy: '',
    Weight: '',
    Custom: ''
  });
  const [customInput, setCustomInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [date, setDate] = useState(new Date());
  const [loggedDates, setLoggedDates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '', isError: false });
  const [showShareSymptom, setShowShareSymptom] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    birthdate: ''
  });

  useEffect(() => {
    const fetchAndStoreUserData = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('Supabase user:', user); // Debug
      if (authError || !user) {
        console.error('User fetch failed:', authError?.message);
        return;
      }

      // Fetch profile info from your patients table using patient_id
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

      const userKey = `loggedDates-${user.id}`;
      const stored = localStorage.getItem(userKey);

      if (stored) {
        setLoggedDates(JSON.parse(stored));
      } else {
        const { data, error } = await supabase
          .from('symptomlog')
          .select('date_logged, symptoms, severity')
          .eq('patients_id', user.id);

        if (error) {
          console.error('Supabase fetch error:', error.message);
          return;
        }

        const normalized = data.map(entry => ({
          ...entry,
          date_logged: new Date(entry.date_logged),
        }));

        setLoggedDates(normalized);
        localStorage.setItem(userKey, JSON.stringify(normalized));
      }
    };

    fetchAndStoreUserData();
  }, []);

  // New effect to update selected values when date changes
  useEffect(() => {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    // Find all entries for the selected date
    const entriesForDate = loggedDates.filter(entry => {
      const entryDate = new Date(entry.date_logged);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === normalizedDate.getTime();
    });

    const newSelectedValues = {
      Feelings: '',
      Cravings: '',
      'Period Flow': '',
      'Symptoms': '',
      Energy: '',
      Weight: '',
      Custom: ''
    };

    entriesForDate.forEach(entry => {
      if (entry.symptoms && entry.severity) {
        newSelectedValues[entry.symptoms] = entry.severity;
      }
    });

    setSelectedValues(newSelectedValues);

    // Set weight and custom inputs
    setWeightInput(newSelectedValues.Weight || '');
    setCustomInput(newSelectedValues.Custom || '');
  }, [date, loggedDates]);

  const handleSave = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setModalContent({ title: 'Error', message: 'You must be logged in to save.', isError: true });
      setShowModal(true);
      return;
    }

    let valueToSave = selectedValues[selectedTab];

    if (selectedTab === 'Weight' && !weightInput.trim()) {
      setModalContent({ title: 'Error', message: 'Please enter your weight.', isError: true });
      setShowModal(true);
      return;
    }

    if (selectedTab === 'Custom' && !customInput.trim()) {
      setModalContent({ title: 'Error', message: 'Please enter custom data.', isError: true });
      setShowModal(true);
      return;
    }

    if (!valueToSave && selectedTab !== 'Weight' && selectedTab !== 'Custom') {
      setModalContent({ title: 'Error', message: `Please select a ${selectedTab.toLowerCase()} option.`, isError: true });
      setShowModal(true);
      return;
    }

    if (selectedTab === 'Weight') valueToSave = weightInput;
    if (selectedTab === 'Custom') valueToSave = customInput;

    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const existingEntryIndex = loggedDates.findIndex(entry => {
      const entryDate = new Date(entry.date_logged);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === normalizedDate.getTime() && entry.symptoms === selectedTab;
    });

    // Get current timestamp with proper formatting
    const now = new Date();
    const timestamp = now.toISOString(); // This preserves the full timestamp

    const dataToSave = {
      symptoms: selectedTab,
      severity: valueToSave,
      date_logged: timestamp, // Save full timestamp instead of just date
      patients_id: user.id,
    };

    let supabaseError;

    if (existingEntryIndex !== -1) {
      // Update existing entry - also update the timestamp to reflect when it was last modified
      const { error } = await supabase
        .from('symptomlog')
        .update({ 
          severity: valueToSave,
          date_logged: timestamp // Update timestamp on modification
        })
        .eq('patients_id', user.id)
        .eq('symptoms', selectedTab)
        .eq('date_logged', normalizedDate.toISOString().split('T')[0]); // Match by date only for the WHERE clause

      supabaseError = error;

      if (!error) {
        // Re-fetch from Supabase to ensure data consistency
        const { data, error: fetchError } = await supabase
          .from('symptomlog')
          .select('date_logged, symptoms, severity')
          .eq('patients_id', user.id);

        if (!fetchError) {
          const normalized = data.map(entry => ({
            ...entry,
            date_logged: new Date(entry.date_logged),
          }));
          setLoggedDates(normalized);
          localStorage.setItem(`loggedDates-${user.id}`, JSON.stringify(normalized));
        }
      }
    } else {
      // Insert new entry with full timestamp
      const { error } = await supabase.from('symptomlog').insert([dataToSave]);
      supabaseError = error;

      if (!error) {
        // Re-fetch from Supabase to ensure data consistency
        const { data, error: fetchError } = await supabase
          .from('symptomlog')
          .select('date_logged, symptoms, severity')
          .eq('patients_id', user.id);

        if (!fetchError) {
          const normalized = data.map(entry => ({
            ...entry,
            date_logged: new Date(entry.date_logged),
          }));
          setLoggedDates(normalized);
          localStorage.setItem(`loggedDates-${user.id}`, JSON.stringify(normalized));
        }
      }
    }

    if (supabaseError) {
      setModalContent({ title: 'Error', message: `Failed to save: ${supabaseError.message}`, isError: true });
    } else {
      const formattedDate = normalizedDate.toDateString();
      const formattedTime = now.toLocaleTimeString();
      setModalContent({
        title: 'Success!',
        message: `${selectedTab} saved as "${valueToSave}" on ${formattedDate} at ${formattedTime}`,
        isError: false
      });
    }

    setShowModal(true);
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
    const fileName = await generatePDF(loggedDates, userInfo);
    setModalContent({
      title: 'PDF Generated!',
      message: `Your symptom tracker report has been downloaded as "${fileName}"`,
      isError: false
    });
    setShowModal(true);
  };

  const handleShare = () => setShowShareSymptom(true);

  const tabConfigs = {
    'Period Flow': {
      options: [
        { name: 'Light', icon: Droplet, size: 25 },
        { name: 'Moderate', icon: Droplet, size: 35 },
        { name: 'Heavy', icon: Droplet, size: 40 },
        { name: 'Extremely Heavy', icon: Droplets, size: 40 },
      ]
    },
    'Symptoms': {
      options: [
        { name: 'Tender Breasts', icon: Heart, size: 36 },
        { name: 'Headache', icon: Brain, size: 36 },
        { name: 'Cramps', icon: Activity, size: 36 },
        { name: 'Low Appetite', icon: CircleArrowDown, size: 36 },
        { name: 'Increased Appetite', icon: CircleArrowUp, size: 36 },
        { name: 'Acne', icon: Circle, size: 36 },
        { name: 'Migraine', icon: TriangleAlert, size: 36 },
        { name: 'Back Pain', icon: Flame, size: 36 },
        { name: 'Nausea', icon: CircleAlert, size: 36 },
        { name: 'Insomnia', icon: Eye, size: 36 },
        { name: 'Fatigue', icon: Bed, size: 36 },
      ]
    },
    Feelings: {
      options: [
        { name: 'Happy', icon: Laugh, size: 36 },
        { name: 'Sad', icon: Frown, size: 36 },
        { name: 'Anxiety', icon: MessageCircleWarning, size: 36 },
        { name: 'Calm', icon: Leaf, size: 36 },
        { name: 'Mood Swings', icon: CloudSun, size: 36 },
      ]
    },
    Cravings: {
      options: [
        { name: 'Salty', icon: Popcorn, size: 36 },
        { name: 'Sweet', icon: CakeSlice, size: 36 },
        { name: 'Meat', icon: Beef, size: 36 },
        { name: 'Fruit', icon: Apple, size: 36 },
        { name: 'Fried Foods', icon: Drumstick, size: 36 },
        { name: 'Chocolate', icon: Candy, size: 36 },
      ]
    },
    Energy: {
      options: [
        { name: 'Exhausted', icon: BatteryWarning, size: 36 },
        { name: 'Tired', icon: BatteryLow, size: 36 },
        { name: 'Okay', icon: BatteryMedium, size: 36 },
        { name: 'Energetic', icon: BatteryFull, size: 36 },
      ]
    },
    Weight: {
      options: [
        { name: 'Weight', icon: Gauge, size: 60, color: '#E67E22' }
      ]
    },
    Custom: {
      options: [
        { name: 'Enter Custom Data', icon: NotebookPen, size: 60, color: '#E67E22' }
      ]
    }
  };

  const currentConfig = tabConfigs[selectedTab];

  const renderContent = () => {
    if (selectedTab === 'Weight') {
      return (
        <div className="bg-[#FFEFE9] border border-[#F8C8B6] p-6 rounded-2xl w-full">
          <div className="flex flex-col items-center space-y-4">
            <Gauge size={60} color="#E67E22" />
            <label className="text-lg font-semibold text-[#B65C4B]">Enter your weight:</label>
            <input
              type="text"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="e.g., 65 kg or 143 lbs"
              className="w-full max-w-xs px-4 py-3 text-lg border-2 border-[#F8C8B6] rounded-xl focus:border-[#3BA4A0] focus:outline-none text-center"
            />
            {selectedValues.Weight && (
              <p className="text-sm text-[#3BA4A0] font-medium">
                Previously logged: {selectedValues.Weight}
              </p>
            )}
          </div>
        </div>
      );
    }

    if (selectedTab === 'Custom') {
      return (
        <div className="bg-[#FFEFE9] border border-[#F8C8B6] p-6 rounded-2xl w-full">
          <div className="flex flex-col items-center space-y-4">
            <NotebookPen size={60} color="#E67E22" />
            <label className="text-lg font-semibold text-[#B65C4B]">Enter custom data:</label>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Enter any additional notes or symptoms..."
              className="w-full px-4 py-3 text-lg border-2 border-[#F8C8B6] rounded-xl focus:border-[#3BA4A0] focus:outline-none resize-none"
              rows={4}
            />
            {selectedValues.Custom && (
              <p className="text-sm text-[#3BA4A0] font-medium">
                Previously logged: {selectedValues.Custom}
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-[#FFEFE9] border border-[#F8C8B6] p-4 rounded-2xl w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {currentConfig.options.map(({ name, icon, size, color }) => {
            const IconComponent = icon;
            const isSelected = selectedValues[selectedTab] === name;
            const isFromPreviousLog = selectedValues[selectedTab] && selectedValues[selectedTab] === name;

            return (
              <div
                key={name}
                onClick={() => setSelectedValues(prev => ({
                  ...prev,
                  [selectedTab]: prev[selectedTab] === name ? '' : name
                }))}
                className="flex flex-col items-center cursor-pointer py-3 px-2"
              >
                <div
                  className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full border-4 transition-all relative ${isSelected
                      ? 'bg-[#C2EDEA] border-[#3BA4A0] text-[#3BA4A0] scale-110 shadow-md'
                      : 'bg-[#EDEDED] border-[#D8D8D8] text-[#B6B6B6] hover:border-[#3BA4A0] hover:bg-[#F0F9F9]'
                    }`}
                >
                  <IconComponent size={size || 32} color={color} />
                  {isFromPreviousLog && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#3BA4A0] rounded-full flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <span className={`mt-2 text-sm md:text-base font-semibold text-center transition-all ${isSelected ? 'text-[#3BA4A0]' : 'text-[#F98679]'
                  }`}>
                  {name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Handler for calendar date select
  const handleDateSelect = (date) => {
    setDate(date);
  };

  // Handler for month navigation
  const handleMonthNavigate = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const handleMonthYearChange = (month, year) => {
    setCurrentDate(new Date(year, month, 1));
  };

  // Create dots data for dates with logged entries
  const getDatesWithLogs = () => {
    const datesWithLogs = [];
    loggedDates.forEach(entry => {
      const dateStr = new Date(entry.date_logged).toISOString().split('T')[0];
      if (!datesWithLogs.includes(dateStr)) {
        datesWithLogs.push(dateStr);
      }
    });
    return datesWithLogs;
  };

  return (
    <div className="calendar-container min-h-[100vh] w-full relative">
      <div className="flex flex-col items-center px-4 md:px-8 py-4 space-y-6 w-full max-w-4xl mx-auto">
        <TrackingCalendar
          currentDate={currentDate}
          selectedDate={date}
          datesWithLogs={getDatesWithLogs()}
          onDateSelect={handleDateSelect}
          onMonthNavigate={handleMonthNavigate}
          onMonthYearChange={handleMonthYearChange}
        />

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 justify-center w-full">
          {Object.keys(tabConfigs).map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`text-sm md:text-base px-4 py-2 rounded-full font-semibold transition-all relative ${selectedTab === tab
                  ? 'bg-[#F98679] text-white shadow-lg scale-105'
                  : 'bg-[#FFD8C9] text-[#B65C4B] hover:bg-[#F8C8B6]'
                }`}
            >
              {tab}
              {selectedValues[tab] && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#3BA4A0] rounded-full"></div>
              )}
            </button>
          ))}
        </div>
        {/* Content Area */}
        {renderContent()}

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="bg-[#3BA4A0] hover:bg-[#2E8B87] text-white text-lg md:text-xl px-8 py-3 rounded-full transition-all shadow-lg active:scale-95 font-semibold"
        >
          {selectedValues[selectedTab] ? 'Update' : 'Save'} {selectedTab}
        </button>
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

      {/* Download and Share Buttons */}
      <div className="w-full flex justify-end">
        <div className="bg-[#FFE0D3] rounded-2xl px-6 py-4 flex flex-row gap-10 shadow-sm items-center">
          <button
            onClick={handleDownload}
            className="flex flex-col items-center text-[#F98679] hover:text-[#B65C4B] transition text-sm focus:outline-none"
            disabled={!userInfo.name} // disable if not loaded
          >
            <FileDown size={24} />
            <span className="mt-1 font-semibold">Download Report</span>
          </button>
          <button
            onClick={handleShare}
            className="flex flex-col items-center text-[#F98679] hover:text-[#B65C4B] transition text-sm focus:outline-none"
          >
            <FileUp size={24} />
            <span className="mt-1 font-semibold">Share Report</span>
          </button>
          <ShareSymptom isOpen={showShareSymptom} onClose={() => setShowShareSymptom(false)} />
        </div>
      </div>
    </div>
  );
};

export default PeriodTracker;