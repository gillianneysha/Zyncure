import React, { useState, useEffect } from 'react';
import {
  Droplet, Droplets, FileDown, FileUp, CloudSun, Leaf, Sun, Moon, Circle,
  Rainbow, Flame, Check, Lollipop, Scale, CircleAlert
} from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabase } from '../../client';
import ShareSymptom from '../../components/ShareSymptom';

const PeriodTracker = () => {
  const [selectedTab, setSelectedTab] = useState('Period');
  const [selectedFlow, setSelectedFlow] = useState('');
  const [selectedFeeling, setSelectedFeeling] = useState('');
  const [selectedSkin, setSelectedSkin] = useState('');
  const [selectedMetabolism, setSelectedMetabolism] = useState('');
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
          .select('date_logged, symptoms')
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

  const handleSave = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setModalContent({ title: 'Error', message: 'You must be logged in to save.', isError: true });
      setShowModal(true);
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
      setModalContent({
        title: 'Error',
        message: `Please select a ${selectedTab.toLowerCase()} option.`,
        isError: true
      });
      setShowModal(true);
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
      setModalContent({ title: 'Error', message: `Failed to save: ${error.message}`, isError: true });
    } else {
      const formattedDate = normalizedDate.toDateString();
      setModalContent({
        title: 'Success!',
        message: `${selectedTab} saved as ${selectedValue} on ${formattedDate}`,
        isError: false
      });

      setLoggedDates(prev => {
        const alreadyExists = prev.some(entry =>
          new Date(entry.date_logged).toDateString() === normalizedDate.toDateString() &&
          entry.symptoms === selectedTab
        );
        const updated = alreadyExists ? prev : [...prev, { ...dataToSave, date_logged: normalizedDate }];
        localStorage.setItem(`loggedDates-${user.id}`, JSON.stringify(updated));
        return updated;
      });

      if (selectedTab === 'Period') setSelectedFlow('');
      if (selectedTab === 'Feelings') setSelectedFeeling('');
      if (selectedTab === 'Skin') setSelectedSkin('');
      if (selectedTab === 'Metabolism') setSelectedMetabolism('');
    }

    setShowModal(true);
  };

  const handleDownload = () => {
    const data = {
      selectedTab,
      selectedFlow,
      selectedFeeling,
      selectedSkin,
      selectedMetabolism,
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
    Period: {
      options: [
        { name: 'Light', icon: Droplet, size: 40 },
        { name: 'Moderate', icon: Droplet, size: 52 },
        { name: 'Heavy', icon: Droplet, size: 64 },
      ],
      selected: selectedFlow,
      onSelect: setSelectedFlow,
    },
    Feelings: {
      options: [
        { name: 'Mood Swings', icon: CloudSun, size: 48 },
        { name: 'Fine', icon: Leaf, size: 48 },
        { name: 'Happy', icon: Sun, size: 48 },
        { name: 'Sad', icon: Moon, size: 48 },
      ],
      selected: selectedFeeling,
      onSelect: setSelectedFeeling,
    },
    Skin: {
      options: [
        { name: 'Oily', icon: Droplets, size: 48 },
        { name: 'Acne', icon: Circle, size: 48 },
        { name: 'Normal', icon: Rainbow, size: 48 },
        { name: 'Dry', icon: Flame, size: 48 },
      ],
      selected: selectedSkin,
      onSelect: setSelectedSkin,
    },
    Metabolism: {
      options: [
        { name: 'Healthy', icon: Check, size: 48 },
        { name: 'High Sugar', icon: Lollipop, size: 48 },
        { name: 'Overweight', icon: Scale, size: 48 },
        { name: 'Metabolic Risk', icon: CircleAlert, size: 48 },
      ],
      selected: selectedMetabolism,
      onSelect: setSelectedMetabolism,
    },
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
      Period: '#B65C4B',
      Feelings: '#3BA4A0',
      Skin: '#F98679',
      Metabolism: '#FFD800',
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

        <div className="flex flex-wrap gap-2 justify-center w-full">
          {Object.keys(tabConfigs).map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`text-base md:text-lg px-5 py-2 rounded-full font-semibold transition-all ${
                selectedTab === tab ? 'bg-[#F98679] text-white shadow-lg scale-105' : 'bg-[#FFD8C9] text-[#B65C4B] hover:bg-[#F8C8B6]'
              }`}
              style={{ minWidth: 90 }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="bg-[#FFEFE9] border border-[#F8C8B6] p-4 rounded-2xl w-full">
          <div className={selectedTab === 'Period' ? 'flex justify-between gap-2' : 'grid grid-cols-2 gap-2 md:flex md:justify-around md:gap-4'}>
            {currentConfig.options.map(({ name, icon, size }) => {
              const IconComponent = icon;
              return (
                <div
                  key={name}
                  onClick={() => currentConfig.onSelect(name)}
                  className="flex flex-col items-center cursor-pointer w-full max-w-[90px] py-2"
                >
                  <div
                    className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full border-4 transition-all ${
                      currentConfig.selected === name ? 'bg-[#C2EDEA] border-[#3BA4A0] text-[#3BA4A0] scale-110 shadow-md' : 'bg-[#EDEDED] border-[#D8D8D8] text-[#B6B6B6] hover:border-[#3BA4A0] hover:bg-[#F0F9F9]'
                    }`}
                  >
                    <IconComponent size={size || 40} />
                  </div>
                  <span className={`mt-2 text-base md:text-lg font-semibold text-center transition-all ${
                    currentConfig.selected === name ? 'text-[#3BA4A0]' : 'text-[#F98679]'
                  }`}>
                    {name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="bg-[#3BA4A0] hover:bg-[#2E8B87] text-white text-lg md:text-xl px-8 py-2 rounded-full transition-all shadow-lg active:scale-95"
        >
          Save {selectedTab}
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-2xl text-center max-w-sm w-full">
            <h2 className={`text-xl font-bold ${modalContent.isError ? 'text-red-600' : 'text-[#3BA4A0]'}`}>
              {modalContent.title}
            </h2>
            <p className="text-[#555] mb-4">{modalContent.message}</p>
            <button
              onClick={() => setShowModal(false)}
              className={`${modalContent.isError ? 'bg-red-500 hover:bg-red-600' : 'bg-[#F98679] hover:bg-[#d87364]'} text-white font-semibold px-6 py-2 rounded-full transition`}
            >
              {modalContent.isError ? 'Close' : 'Got it'}
            </button>
          </div>
        </div>
      )}

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
