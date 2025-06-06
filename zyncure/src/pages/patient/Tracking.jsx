import React, { useState } from 'react';
import { supabase } from '../../client';
import {
  Droplet,
  Droplets,
  FileDown,
  FileUp,
  CloudSun,
  Leaf,
  Sun,
  Moon,
  Bubbles,
  Rainbow,
  Flame,
  Check,
  Lollipop,
  Scale,
  CircleAlert,
} from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';


const PeriodTracker = () => {
  const [selectedTab, setSelectedTab] = useState('Period');
  const [selectedFlow, setSelectedFlow] = useState('Moderate');
  const [selectedFeeling, setSelectedFeeling] = useState('');
  const [selectedSkin, setSelectedSkin] = useState('');
  const [date, setDate] = useState(new Date());


  const handleFlowSelect = (flow) => setSelectedFlow(flow);
  const handleFeelingSelect = (feeling) => setSelectedFeeling(feeling);
  const handleSkinSelect = (skin) => setSelectedSkin(skin);


  const handleSavePeriod = async () => {
    const { error } = await supabase
      .from('SymptomLogs')
      .insert([{ Period: selectedFlow, date: date.toISOString().split('T')[0] }]);


    if (error) console.error('Error saving period:', error);
    else alert(`Flow saved: ${selectedFlow} on ${date.toDateString()}`);
  };


  const handleSaveFeeling = async () => {
    const { error } = await supabase
      .from('SymptomLogs')
      .insert([{ Feeling: selectedFeeling, date: date.toISOString().split('T')[0] }]);


    if (error) console.error('Error saving feeling:', error);
    else alert(`Feeling saved: ${selectedFeeling} on ${date.toDateString()}`);
  };


  const handleSaveSkin = async () => {
    const { error } = await supabase
      .from('SymptomLogs')
      .insert([{ Skin: selectedSkin, date: date.toISOString().split('T')[0] }]);


    if (error) console.error('Error saving skin:', error);
    else alert(`Skin type saved: ${selectedSkin} on ${date.toDateString()}`);
  };


  const [selectedMetabolism, setSelectedMetabolism] = useState('');


  const handleMetabolismSelect = (metabolism) => setSelectedMetabolism(metabolism);
  const handleSaveMetabolism = async () => {
  const { error } = await supabase
    .from('SymptomLogs')
    .insert([{ Metabolism: selectedMetabolism, date: date.toISOString().split('T')[0] }]);


  if (error) console.error('Error saving metabolism:', error);
  else alert(`Metabolism saved: ${selectedMetabolism} on ${date.toDateString()}`);
};


 
  const flowOptions = ['Light', 'Moderate', 'Heavy'];
  const iconSizes = {
    Light: 20,
    Moderate: 28,
    Heavy: 34,
  };


  return (
    <div className="bg-[#FFF0EA] min-h-screen flex flex-col items-center px-6 py-6 font-sans relative text-[#B65C4B] text-sm pb-16 -translate-y-2">


      {/* Calendar */}
      <div className="mb-2 text-xs scale-[0.92] shadow-lg rounded-lg">
        <Calendar
          onChange={setDate}
          value={date}
          className="!border-none !bg-[#FFD8C9] rounded-lg p-1 text-xs"
          tileClassName={({ date: d }) =>
            d.toDateString() === date.toDateString() ? '!bg-[#3BA4A0] !text-white rounded-full' : ''
          }
          formatShortWeekday={(locale, date) =>
            date.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase()
          }
          next2Label={null}
          prev2Label={null}
        />
      </div>


      {/* Tabs */}
      <div className="w-full max-w-md mb-2 flex gap-2 justify-center">
        {['Period', 'Feelings', 'Skin', 'Metabolism'].map((tab) => (
          <div
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`text-sm px-6 py-2 rounded-full cursor-pointer ${
              selectedTab === tab
                ? 'bg-[#F98679] text-white'
                : 'bg-[#FFD8C9] text-[#B65C4B]'
            }`}
          >
            {tab}
          </div>
        ))}
      </div>


      {/* Period Tab */}
      {selectedTab === 'Period' && (
        <>
          <div className="border border-[#F8C8B6] bg-[#FFEFE9] p-5 rounded-lg w-full max-w-2xl flex justify-between mb-5">
            {flowOptions.map((flow) => (
              <div
                key={flow}
                className="flex flex-col items-center cursor-pointer w-full"
                onClick={() => handleFlowSelect(flow)}
              >
                <div
                  className={`w-14 h-14 flex items-center justify-center rounded-full mb-2 border-2 transition-colors ${
                    selectedFlow === flow
                      ? 'bg-[#C2EDEA] border-[#3BA4A0] text-[#3BA4A0]'
                      : 'bg-[#EDEDED] border-[#D8D8D8] text-[#B6B6B6]'
                  }`}
                >
                  <Droplet size={iconSizes[flow]} />
                </div>
                <span className="text-xs">{flow}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleSavePeriod}
            className="bg-[#3BA4A0] text-white text-medium px-10 py-2 rounded-full mb-12"
          >
            Save
          </button>
        </>
      )}


      {/* Feelings Tab */}
      {selectedTab === 'Feelings' && (
        <>
          <div className="border border-[#F8C8B6] bg-[#FFEFE9] p-5 rounded-lg w-full max-w-2xl flex justify-around mb-5">
            {[
              { name: 'Mood Swings', icon: CloudSun },
              { name: 'Fine', icon: Leaf },
              { name: 'Happy', icon: Sun },
              { name: 'Sad', icon: Moon },
            ].map(({ name, icon: Icon }) => (
              <div
                key={name}
                onClick={() => handleFeelingSelect(name)}
                className="flex flex-col items-center cursor-pointer text-xs"
              >
                <div
                  className={`w-14 h-14 flex items-center justify-center rounded-full border-2 transition-colors ${
                    selectedFeeling === name
                      ? 'bg-[#C2EDEA] border-[#3BA4A0] text-[#3BA4A0]'
                      : 'bg-[#EDEDED] border-[#D8D8D8] text-[#B6B6B6]'
                  }`}
                >
                  {Icon && <Icon size={22} />}
                </div>
                <span className={`mt-1 ${selectedFeeling === name ? 'text-[#3BA4A0]' : 'text-[#F98679]'}`}>
                  {name}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={handleSaveFeeling}
            className="bg-[#3BA4A0] text-white text-medium px-10 py-2 rounded-full mb-12"
          >
            Save Feeling
          </button>
        </>
      )}


      {/* Skin Tab */}
      {selectedTab === 'Skin' && (
        <>
          <div className="border border-[#F8C8B6] bg-[#FFEFE9] p-5 rounded-lg w-full max-w-2xl flex justify-around mb-5">
            {[
              { name: 'Oily', icon: Droplets },
              { name: 'Acne', icon: Bubbles },
              { name: 'Normal', icon: Rainbow },
              { name: 'Dry', icon: Flame },
            ].map(({ name, icon: Icon }) => (
              <div
                key={name}
                onClick={() => handleSkinSelect(name)}
                className="flex flex-col items-center cursor-pointer text-xs"
              >
                <div
                  className={`w-14 h-14 flex items-center justify-center rounded-full border-2 transition-colors ${
                    selectedSkin === name
                      ? 'bg-[#C2EDEA] border-[#3BA4A0] text-[#3BA4A0]'
                      : 'bg-[#EDEDED] border-[#D8D8D8] text-[#B6B6B6]'
                  }`}
                >
                  {Icon && <Icon size={22} />}
                </div>
                <span className={`mt-1 ${selectedSkin === name ? 'text-[#3BA4A0]' : 'text-[#F98679]'}`}>
                  {name}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={handleSaveSkin}
            className="bg-[#3BA4A0] text-white text-medium px-10 py-2 rounded-full mb-12"
          >
            Save Skin Type
          </button>
        </>
      )}
     
      {/* Metabolism Tab */}
      {selectedTab === 'Metabolism' && (
  <>
    <div className="border border-[#F8C8B6] bg-[#FFEFE9] p-5 rounded-lg w-full max-w-2xl flex justify-around mb-5">
      {[
        { name: 'Healthy', icon: Check },
        { name: 'High Sugar', icon: Lollipop },
        { name: 'Overweight', icon: Scale },
        { name: 'Metabolic Risk', icon: CircleAlert },
      ].map(({ name, icon: Icon }) => (
        <div
          key={name}
          onClick={() => handleMetabolismSelect(name)}
          className="flex flex-col items-center cursor-pointer text-xs"
        >
          <div
            className={`w-14 h-14 flex items-center justify-center rounded-full border-2 transition-colors ${
              selectedMetabolism === name
                ? 'bg-[#C2EDEA] border-[#3BA4A0] text-[#3BA4A0]'
                : 'bg-[#EDEDED] border-[#D8D8D8] text-[#B6B6B6]'
            }`}
          >
            {Icon && <Icon size={22} />}
          </div>
          <span className={`mt-1 ${selectedMetabolism === name ? 'text-[#3BA4A0]' : 'text-[#F98679]'}`}>
            {name}
          </span>
        </div>
      ))}
    </div>
    <button
      onClick={handleSaveMetabolism}
      className="bg-[#3BA4A0] text-white text-medium px-10 py-2 rounded-full mb-12"
    >
      Save Metabolism
    </button>
  </>
)}




      {/* Report Buttons */}
      <div className="absolute bottom-16 right-4 bg-[#FFEFE9] border border-[#F8C8B6] rounded-xl px-6 py-4 flex gap-6 shadow-sm">
        <button className="flex flex-col items-center text-[#B65C4B] text-xs bg-transparent border-none">
          <FileDown size={14} />
          <span className="mt-1 text-[12px] font-medium">Download Report</span>
        </button>
        <button className="flex flex-col items-center text-[#B65C4B] text-xs bg-transparent border-none">
          <FileUp size={14} />
          <span className="mt-1 text-[12px] font-medium">Share Report</span>
        </button>
      </div>
    </div>
  );
};


export default PeriodTracker;






