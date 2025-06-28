import React, { useState, useEffect } from 'react';
import {
  Droplet, Droplets, FileDown, FileUp, CloudSun, Leaf, Sun, Moon, Circle,
  Rainbow, Flame, Check, Lollipop, Scale, CircleAlert, Zap, Battery, Heart,
  Coffee, Apple, Cookie, Beef, Cherry, Drumstick, Candy, Brain, Headphones,
  Activity, AlertCircle, Eye, Bed, Target, Plus, Type
} from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabase } from '../../client';
import ShareSymptom from '../../components/ShareSymptom';

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

  useEffect(() => {
    const fetchAndStoreUserData = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('User fetch failed:', authError?.message);
        return;
      }

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

    // Reset all values first
    const newSelectedValues = {
      Feelings: '',
      Cravings: '',
      'Period Flow': '',
      'Symptoms': '',
      Energy: '',
      Weight: '',
      Custom: ''
    };

    // Set values based on logged entries
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

    // Check if entry already exists for this date and symptom
    const existingEntryIndex = loggedDates.findIndex(entry => {
      const entryDate = new Date(entry.date_logged);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === normalizedDate.getTime() && entry.symptoms === selectedTab;
    });

    const dataToSave = {
      symptoms: selectedTab,
      severity: valueToSave,
      date_logged: normalizedDate.toLocaleDateString('en-CA'),
      patients_id: user.id,
    };

    let supabaseError;
    
    if (existingEntryIndex !== -1) {
      // Update existing entry
      const { error } = await supabase
        .from('symptomlog')
        .update({ severity: valueToSave })
        .eq('patients_id', user.id)
        .eq('symptoms', selectedTab)
        .eq('date_logged', normalizedDate.toLocaleDateString('en-CA'));
      
      supabaseError = error;
      
      if (!error) {
        // Update local state
        setLoggedDates(prev => {
          const updated = [...prev];
          updated[existingEntryIndex] = { ...updated[existingEntryIndex], severity: valueToSave };
          localStorage.setItem(`loggedDates-${user.id}`, JSON.stringify(updated));
          return updated;
        });
      }
    } else {
      // Insert new entry
      const { error } = await supabase.from('symptomlog').insert([dataToSave]);
      supabaseError = error;
      
      if (!error) {
        setLoggedDates(prev => {
          const updated = [...prev, { ...dataToSave, date_logged: normalizedDate }];
          localStorage.setItem(`loggedDates-${user.id}`, JSON.stringify(updated));
          return updated;
        });
      }
    }

    if (supabaseError) {
      setModalContent({ title: 'Error', message: `Failed to save: ${supabaseError.message}`, isError: true });
    } else {
      const formattedDate = normalizedDate.toDateString();
      setModalContent({
        title: 'Success!',
        message: `${selectedTab} saved as "${valueToSave}" on ${formattedDate}`,
        isError: false
      });
    }

    setShowModal(true);
  };

  const handleDownload = () => {
    const data = {
      selectedTab,
      selectedValues,
      weightInput,
      customInput,
      date,
      loggedDates
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `period-tracker-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setModalContent({ title: 'Download Complete', message: 'Your data has been downloaded successfully.', isError: false });
    setShowModal(true);
  };

  const handleShare = () => setShowShareSymptom(true);

  const tabConfigs = {
    'Period Flow': {
      options: [
        { name: 'Light', icon: Droplet, size: 35 },
        { name: 'Moderate', icon: Droplet, size: 45 },
        { name: 'Heavy', icon: Droplet, size: 55 },
        { name: 'Extremely Heavy', icon: Droplets, size: 55 },
      ]
    },
    'Symptoms': {
      options: [
        { name: 'Tender Breasts', icon: Heart, size: 36 },
        { name: 'Headache', icon: Brain, size: 40 },
        { name: 'Cramps', icon: Activity, size: 40 },
        { name: 'Low Appetite', icon: Target, size: 40 },
        { name: 'Increased Appetite', icon: Plus, size: 40 },
        { name: 'Acne', icon: Circle, size: 40 },
        { name: 'Migraine', icon: AlertCircle, size: 40 },
        { name: 'Back Pain', icon: Activity, size: 40 },
        { name: 'Nausea', icon: CircleAlert, size: 40 },
        { name: 'Insomnia', icon: Eye, size: 40 },
        { name: 'Fatigue', icon: Bed, size: 40 },
      ]
    },
    Feelings: {
      options: [
        { name: 'Energized', icon: Zap, size: 40 },
        { name: 'Exhausted', icon: Battery, size: 40 },
        { name: 'Anxiety', icon: AlertCircle, size: 40 },
        { name: 'Calm', icon: Leaf, size: 40 },
        { name: 'Happy', icon: Sun, size: 40 },
        { name: 'Mood swings', icon: CloudSun, size: 40 },
        { name: 'Sad', icon: Moon, size: 40 },
      ]
    },
    Cravings: {
      options: [
        { name: 'Salty', icon: Circle, size: 40 },
        { name: 'Sweet', icon: Cookie, size: 40 },
        { name: 'Meat', icon: Beef, size: 40 },
        { name: 'Fruit', icon: Apple, size: 40 },
        { name: 'Fried things', icon: Drumstick, size: 40 },
        { name: 'Chocolate', icon: Candy, size: 40 },
      ]
    },
    Energy: {
      options: [
        { name: 'exhausted', icon: Battery, size: 40 },
        { name: 'tired', icon: Moon, size: 40 },
        { name: 'ok', icon: Check, size: 40 },
        { name: 'energetic', icon: Zap, size: 40 },
      ]
    }
  };

  const currentConfig = tabConfigs[selectedTab];

  const getTileContent = ({ date }) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);

    const matches = loggedDates.filter(entry => {
      const entryDate = new Date(entry.date_logged);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === normalized.getTime();
    });

    if (matches.length === 0) return null;

    const colorMap = {
      Feelings: '#3BA4A0',
      Cravings: '#F98679',
      'Period Flow': '#B65C4B',
      'Symptoms': '#FFD800',
      Energy: '#9B59B6',
      Weight: '#E67E22',
      Custom: '#34495E',
    };

    const uniqueSymptoms = [...new Set(matches.map(m => m.symptoms))];

    return (
      <div className="flex justify-center mt-1 space-x-0.5" title={uniqueSymptoms.join(', ')}>
        {uniqueSymptoms.map((symptom, idx) => (
          <span
            key={idx}
            className="block h-2 w-2 rounded-full"
            style={{ backgroundColor: colorMap[symptom] || '#999' }}
          />
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (selectedTab === 'Weight') {
      return (
        <div className="bg-[#FFEFE9] border border-[#F8C8B6] p-6 rounded-2xl w-full">
          <div className="flex flex-col items-center space-y-4">
            <Scale size={60} className="text-[#E67E22]" />
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
            <Type size={60} className="text-[#34495E]" />
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
          {currentConfig.options.map(({ name, icon, size }) => {
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
                  className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full border-4 transition-all relative ${
                    isSelected
                      ? 'bg-[#C2EDEA] border-[#3BA4A0] text-[#3BA4A0] scale-110 shadow-md' 
                      : 'bg-[#EDEDED] border-[#D8D8D8] text-[#B6B6B6] hover:border-[#3BA4A0] hover:bg-[#F0F9F9]'
                  }`}
                >
                  <IconComponent size={size || 32} />
                  {isFromPreviousLog && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#3BA4A0] rounded-full flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <span className={`mt-2 text-sm md:text-base font-semibold text-center transition-all ${
                  isSelected ? 'text-[#3BA4A0]' : 'text-[#F98679]'
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

  return (
    <div className="calendar-container min-h-[100vh] w-full relative">
      <div className="flex flex-col items-center px-4 md:px-8 py-4 space-y-6 w-full max-w-screen-md mx-auto">
        <Calendar
          onChange={setDate}
          value={date}
          className="!border-none !bg-[#FFD8C9] rounded-2xl p-4 text-base md:text-lg w-full shadow-lg"
          tileContent={getTileContent}
          tileClassName={({ date: d }) =>
            d.toDateString() === date.toDateString()
              ? '!bg-[#C2EDEA] !text-[#3BA4A0] rounded-full'
              : ''
          }
          formatShortWeekday={(locale, date) =>
            date.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase()
          }
          next2Label={null}
          prev2Label={null}
        />

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 justify-center w-full">
          {Object.keys(tabConfigs).map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`text-sm md:text-base px-4 py-2 rounded-full font-semibold transition-all relative ${
                selectedTab === tab 
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
          <button
            onClick={() => setSelectedTab('Weight')}
            className={`text-sm md:text-base px-4 py-2 rounded-full font-semibold transition-all relative ${
              selectedTab === 'Weight' 
                ? 'bg-[#F98679] text-white shadow-lg scale-105' 
                : 'bg-[#FFD8C9] text-[#B65C4B] hover:bg-[#F8C8B6]'
            }`}
          >
            Weight
            {selectedValues.Weight && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#3BA4A0] rounded-full"></div>
            )}
          </button>
          <button
            onClick={() => setSelectedTab('Custom')}
            className={`text-sm md:text-base px-4 py-2 rounded-full font-semibold transition-all relative ${
              selectedTab === 'Custom' 
                ? 'bg-[#F98679] text-white shadow-lg scale-105' 
                : 'bg-[#FFD8C9] text-[#B65C4B] hover:bg-[#F8C8B6]'
            }`}
          >
            Custom
            {selectedValues.Custom && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#3BA4A0] rounded-full"></div>
            )}
          </button>
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
      <div className="fixed bottom-6 right-6 flex flex-row gap-5">
        <button onClick={handleDownload} className="flex flex-col items-center text-[#B65C4B] hover:text-[#3BA4A0] transition text-lg">
          <FileDown size={30} />
          <span className="mt-1 font-bold">Download</span>
        </button>
        <button onClick={handleShare} className="flex flex-col items-center text-[#B65C4B] hover:text-[#3BA4A0] transition text-lg">
          <FileUp size={30} />
          <span className="mt-1 font-bold">Share</span>
        </button>
        <ShareSymptom isOpen={showShareSymptom} onClose={() => setShowShareSymptom(false)} />
      </div>
    </div>
  );
};

export default PeriodTracker;