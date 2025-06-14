import React, { useState, useEffect } from 'react';
import {
  Droplet, Droplets, FileDown, FileUp, CloudSun, Leaf, Sun, Moon, Circle,
  Rainbow, Flame, Check, Lollipop, Scale, CircleAlert,
} from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabase } from '../../client';

const PeriodTracker = () => {
  const [selectedTab, setSelectedTab] = useState('Period');
  const [selectedFlow, setSelectedFlow] = useState('');
  const [selectedFeeling, setSelectedFeeling] = useState('');
  const [selectedSkin, setSelectedSkin] = useState('');
  const [selectedMetabolism, setSelectedMetabolism] = useState('');
  const [date, setDate] = useState(new Date());
  const [loggedDates, setLoggedDates] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
  const fetchLoggedDates = async () => {
    try {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("Auth Error:", authError?.message);
        return;
      }

      const { data, error } = await supabase
        .from('symptomlog')
        .select('date_logged, symptoms')
        .eq('patients_id', user.id);

      if (error) {
        console.error('Supabase fetch error:', error.message);
        return;
      }

      if (!data || data.length === 0) {
        console.warn("No data returned from Supabase.");
        return;
      }

      // Normalize date and store
      const normalizedData = data.map((entry) => ({
        ...entry,
        date_logged: new Date(entry.date_logged),  // convert to Date object
      }));

      console.log("Fetched and normalized data:", normalizedData);
      setLoggedDates(normalizedData);
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  fetchLoggedDates();
}, []);



  const handleFlowSelect = (flow) => setSelectedFlow(flow);
  const handleFeelingSelect = (feeling) => setSelectedFeeling(feeling);
  const handleSkinSelect = (skin) => setSelectedSkin(skin);
  const handleMetabolismSelect = (metabolism) => setSelectedMetabolism(metabolism);

  const handleSave = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage('You must be logged in to save your data.');
      setShowErrorModal(true);
      return;
    }

    const selectedValues = {
      Period: selectedFlow,
      Feelings: selectedFeeling,
      Skin: selectedSkin,
      Metabolism: selectedMetabolism,
    };

    const selectedValue = selectedValues[selectedTab];

    if (!selectedValue) {
      setErrorMessage(`Please select a ${selectedTab.toLowerCase()} option`);
      setShowErrorModal(true);
      return;
    }

    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const dataToSave = {
      symptoms: selectedTab,
      severity: selectedValue,
      date_logged: normalizedDate.toISOString(),
      patients_id: user.id,
    };

    const { error } = await supabase.from('symptomlog').insert([dataToSave]);

    if (error) {
      setErrorMessage(`Failed to save: ${error.message}`);
      setShowErrorModal(true);
    } else {
      const formattedDate = normalizedDate.toDateString();
      setModalMessage(`${selectedTab} saved as ${selectedValue} on ${formattedDate}`);
      setShowSuccessModal(true);

      // Update state so dot shows immediately
      setLoggedDates((prev) => {
        const alreadyExists = prev.some(
          (entry) =>
            new Date(entry.date_logged).toDateString() === normalizedDate.toDateString() &&
            entry.symptoms === selectedTab
        );
        return alreadyExists ? prev : [...prev, { ...dataToSave }];
      });

      // Reset selected input
      if (selectedTab === 'Period') setSelectedFlow('');
      else if (selectedTab === 'Feelings') setSelectedFeeling('');
      else if (selectedTab === 'Skin') setSelectedSkin('');
      else if (selectedTab === 'Metabolism') setSelectedMetabolism('');
    }
  };

  const tabConfigs = {
    Period: {
      options: [
        { name: 'Light', icon: Droplet, size: 40 },
        { name: 'Moderate', icon: Droplet, size: 52 },
        { name: 'Heavy', icon: Droplet, size: 64 },
      ],
      selected: selectedFlow,
      onSelect: handleFlowSelect,
    },
    Feelings: {
      options: [
        { name: 'Mood Swings', icon: CloudSun, size: 48 },
        { name: 'Fine', icon: Leaf, size: 48 },
        { name: 'Happy', icon: Sun, size: 48 },
        { name: 'Sad', icon: Moon, size: 48 },
      ],
      selected: selectedFeeling,
      onSelect: handleFeelingSelect,
    },
    Skin: {
      options: [
        { name: 'Oily', icon: Droplets, size: 48 },
        { name: 'Acne', icon: Circle, size: 48 },
        { name: 'Normal', icon: Rainbow, size: 48 },
        { name: 'Dry', icon: Flame, size: 48 },
      ],
      selected: selectedSkin,
      onSelect: handleSkinSelect,
    },
    Metabolism: {
      options: [
        { name: 'Healthy', icon: Check, size: 48 },
        { name: 'High Sugar', icon: Lollipop, size: 48 },
        { name: 'Overweight', icon: Scale, size: 48 },
        { name: 'Metabolic Risk', icon: CircleAlert, size: 48 },
      ],
      selected: selectedMetabolism,
      onSelect: handleMetabolismSelect,
    },
  };

  const currentConfig = tabConfigs[selectedTab];

 const getTileContent = ({ date }) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);

  const matches = loggedDates.filter((entry) => {
    const entryDate = new Date(entry.date_logged);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate.getTime() === normalized.getTime();
  });

  if (matches.length === 0) return null;

  const colorMap = {
    Period: '#B65C4B',
    Feelings: '#3BA4A0',
    Skin: '#F98679',
    Metabolism: '#FFD800',
  };

  const uniqueSymptoms = [...new Set(matches.map((m) => m.symptoms))];

  return (
    <div
      className="flex justify-center mt-1 space-x-0.5"
      title={uniqueSymptoms.join(', ')}
    >
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



  return (
    <div className="bg-[#FFF0EA] min-h-[100svh] w-full overflow-hidden font-sans text-[#B65C4B] relative">
      <div className="flex flex-col items-center px-2 sm:px-4 md:px-8 py-8 space-y-10 w-full max-w-screen-md mx-auto overflow-hidden">
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

        <div className="flex flex-wrap gap-3 justify-center w-full">
          {Object.keys(tabConfigs).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`text-base md:text-lg px-7 py-3 rounded-full font-semibold transition-all ${
                selectedTab === tab
                  ? 'bg-[#F98679] text-white shadow-lg scale-105'
                  : 'bg-[#FFD8C9] text-[#B65C4B] hover:bg-[#F8C8B6]'
              }`}
              style={{ minWidth: 110 }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="bg-[#FFEFE9] border border-[#F8C8B6] p-4 sm:p-6 rounded-2xl w-full">
          <div className={
            selectedTab === 'Period'
              ? 'flex justify-between gap-4'
              : 'grid grid-cols-2 gap-4 md:flex md:justify-around md:gap-4'
          }>
            {currentConfig.options.map(({ name, icon: Icon, size }) => (
              <div
                key={name}
                onClick={() => currentConfig.onSelect(name)}
                className="flex flex-col items-center cursor-pointer w-full max-w-[110px] py-2"
              >
                <div
                  className={`w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-full border-4 transition-all ${
                    currentConfig.selected === name
                      ? 'bg-[#C2EDEA] border-[#3BA4A0] text-[#3BA4A0] scale-110 shadow-md'
                      : 'bg-[#EDEDED] border-[#D8D8D8] text-[#B6B6B6] hover:border-[#3BA4A0] hover:bg-[#F0F9F9]'
                  }`}
                >
                  {Icon && <Icon size={size || 40} />}
                </div>
                <span className={`mt-3 text-base md:text-lg font-semibold text-center transition-all ${
                  currentConfig.selected === name ? 'text-[#3BA4A0]' : 'text-[#F98679]'
                }`}>
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="bg-[#3BA4A0] hover:bg-[#2E8B87] text-white text-lg md:text-xl px-10 py-3 rounded-full transition-all shadow-lg active:scale-95"
        >
          Save {selectedTab}
        </button>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-2xl text-center max-w-sm w-full">
            <h2 className="text-xl font-bold text-[#3BA4A0] mb-2">Shared Successfully!</h2>
            <p className="text-[#555] mb-4">{modalMessage}</p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="bg-[#F98679] text-white font-semibold px-6 py-2 rounded-full hover:bg-[#d87364] transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-2xl text-center max-w-sm w-full">
            <h2 className="text-xl font-bold text-red-600 mb-2">Save Failed</h2>
            <p className="text-[#555] mb-4">{errorMessage}</p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="bg-red-500 text-white font-semibold px-6 py-2 rounded-full hover:bg-red-600 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-2 sm:right-4 bg-[#FFEFE9] border border-[#F8C8B6] rounded-2xl px-4 py-4 flex flex-wrap gap-6 justify-center items-center shadow-xl max-w-full sm:flex-nowrap z-50">
        <button className="flex flex-col items-center text-[#B65C4B] hover:text-[#3BA4A0] transition w-24">
          <FileDown size={28} />
          <span className="text-base mt-2 font-bold">Download</span>
        </button>
        <button className="flex flex-col items-center text-[#B65C4B] hover:text-[#3BA4A0] transition w-24">
          <FileUp size={28} />
          <span className="text-base mt-2 font-bold">Share</span>
        </button>
      </div>
    </div>
  );
};

export default PeriodTracker;
