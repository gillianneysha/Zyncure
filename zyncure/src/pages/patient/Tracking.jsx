import React, { useState } from 'react';
import {
  Droplet,
  Droplets,
  FileDown,
  FileUp,
  CloudSun,
  Leaf,
  Sun,
  Moon,
  Circle,
  Rainbow,
  Flame,
  Check,
  Lollipop,
  Scale,
  CircleAlert,
} from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabase } from '../../client'; // ✅ make sure this path is correct

const PeriodTracker = () => {
  const [selectedTab, setSelectedTab] = useState('Period');
  const [selectedFlow, setSelectedFlow] = useState('');
  const [selectedFeeling, setSelectedFeeling] = useState('');
  const [selectedSkin, setSelectedSkin] = useState('');
  const [selectedMetabolism, setSelectedMetabolism] = useState('');
  const [date, setDate] = useState(new Date());

  const handleFlowSelect = (flow) => setSelectedFlow(flow);
  const handleFeelingSelect = (feeling) => setSelectedFeeling(feeling);
  const handleSkinSelect = (skin) => setSelectedSkin(skin);
  const handleMetabolismSelect = (metabolism) => setSelectedMetabolism(metabolism);

  const handleSave = async () => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    alert('You must be logged in to save your data.');
    console.error('User fetch error:', userError);
    return;
  }

  const dataMap = {
    Period: { field: 'period', value: selectedFlow },
    Feelings: { field: 'feelings', value: selectedFeeling },
    Skin: { field: 'skin', value: selectedSkin },
    Metabolism: { field: 'metabolism', value: selectedMetabolism },
  };

  const { field, value } = dataMap[selectedTab];

  if (!value) {
    alert(`Please select a ${selectedTab.toLowerCase()} option`);
    return;
  }

  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  const dataToSave = {
    [field]: value,
    date_logged: normalizedDate.toISOString(),
    patients_id: user.id, // ✅ uses the authenticated user's ID
  };

  const { error } = await supabase.from('symptomlogs').insert([dataToSave]);

  if (error) {
    console.error('Supabase insert error:', error);
    alert(`Failed to save: ${error.message || JSON.stringify(error)}`);
  } else {
    alert(`${selectedTab} saved: ${value} on ${normalizedDate.toDateString()}`);
  }
};




  const tabConfigs = {
    Period: {
      options: [
        { name: 'Light', icon: Droplet, size: 20 },
        { name: 'Moderate', icon: Droplet, size: 28 },
        { name: 'Heavy', icon: Droplet, size: 34 },
      ],
      selected: selectedFlow,
      onSelect: handleFlowSelect,
    },
    Feelings: {
      options: [
        { name: 'Mood Swings', icon: CloudSun },
        { name: 'Fine', icon: Leaf },
        { name: 'Happy', icon: Sun },
        { name: 'Sad', icon: Moon },
      ],
      selected: selectedFeeling,
      onSelect: handleFeelingSelect,
    },
    Skin: {
      options: [
        { name: 'Oily', icon: Droplets },
        { name: 'Acne', icon: Circle },
        { name: 'Normal', icon: Rainbow },
        { name: 'Dry', icon: Flame },
      ],
      selected: selectedSkin,
      onSelect: handleSkinSelect,
    },
    Metabolism: {
      options: [
        { name: 'Healthy', icon: Check },
        { name: 'High Sugar', icon: Lollipop },
        { name: 'Overweight', icon: Scale },
        { name: 'Metabolic Risk', icon: CircleAlert },
      ],
      selected: selectedMetabolism,
      onSelect: handleMetabolismSelect,
    },
  };

  const currentConfig = tabConfigs[selectedTab];

  return (
<div className="bg-[#FFF0EA] min-h-[100dvh] overflow-x-hidden font-sans text-[#B65C4B] relative">
      <div className="flex flex-col items-center px-4 py-4 max-w-full w-full space-y-6">
        <Calendar
          onChange={setDate}
          value={date}
          className="!border-none !bg-[#FFD8C9] rounded-lg p-2 text-xs w-full max-w-md shadow-md"
          tileClassName={({ date: d }) =>
            d.toDateString() === date.toDateString()
              ? '!bg-[#3BA4A0] !text-white rounded-full'
              : ''
          }
          formatShortWeekday={(locale, date) =>
            date.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase()
          }
          next2Label={null}
          prev2Label={null}
        />

        <div className="flex flex-wrap gap-2 justify-center w-full max-w-md">
          {Object.keys(tabConfigs).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`text-xs px-6 py-2.5 rounded-full ${
                selectedTab === tab
                  ? 'bg-[#F98679] text-white'
                  : 'bg-[#FFD8C9] text-[#B65C4B] hover:bg-[#F8C8B6]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="bg-[#FFEFE9] border border-[#F8C8B6] p-4 rounded-lg w-full max-w-md">
          <div
            className={`${
              selectedTab === 'Period'
                ? 'flex justify-between'
                : 'grid grid-cols-2 gap-4 sm:flex sm:justify-around sm:gap-2'
            }`}
          >
            {currentConfig.options.map(({ name, icon: Icon, size }) => (
              <div
                key={name}
                onClick={() => currentConfig.onSelect(name)}
                className="flex flex-col items-center cursor-pointer w-full max-w-[80px]"
              >
                <div
                  className={`w-14 h-14 flex items-center justify-center rounded-full border-2 ${
                    currentConfig.selected === name
                      ? 'bg-[#C2EDEA] border-[#3BA4A0] text-[#3BA4A0]'
                      : 'bg-[#EDEDED] border-[#D8D8D8] text-[#B6B6B6] hover:border-[#3BA4A0] hover:bg-[#F0F9F9]'
                  }`}
                >
                  {Icon && <Icon size={size || 20} />}
                </div>
                <span
                  className={`mt-2 text-xs font-medium text-center ${
                    currentConfig.selected === name
                      ? 'text-[#3BA4A0]'
                      : 'text-[#F98679]'
                  }`}
                >
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="bg-[#3BA4A0] hover:bg-[#2E8B87] text-white text-sm px-6 py-2.5 rounded-full transition-all shadow-md active:scale-95"
        >
          Save {selectedTab}
        </button>
      </div>

      <div className="fixed bottom-4 right-4 bg-[#FFEFE9] border border-[#F8C8B6] rounded-2xl px-4 py-3 flex flex-wrap gap-4 justify-center items-center shadow-lg max-w-full sm:flex-nowrap z-50">
        <button className="flex flex-col items-center text-[#B65C4B] hover:text-[#3BA4A0] transition w-20">
          <FileDown size={26} />
          <span className="text-xs mt-1 font-semibold">Download</span>
        </button>
        <button className="flex flex-col items-center text-[#B65C4B] hover:text-[#3BA4A0] transition w-20">
          <FileUp size={26} />
          <span className="text-xs mt-1 font-semibold">Share</span>
        </button>
      </div>
    </div>
  );
};

export default PeriodTracker;
