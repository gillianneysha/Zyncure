import React, { useState } from 'react';
import { supabase } from '../../client';
import { Droplet } from 'lucide-react';
import { FileDown, FileUp } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const PeriodTracker = () => {
  const [selectedFlow, setSelectedFlow] = useState('Moderate');
  const [date, setDate] = useState(new Date());

  const handleFlowSelect = (flow) => setSelectedFlow(flow);

  const handleSave = async () => {
    const { error } = await supabase
      .from('period_logs')
      .insert([{ flow: selectedFlow, date: date.toISOString().split('T')[0] }]);

    if (error) {
      console.error('Error saving data:', error);
    } else {
      alert(`Flow saved: ${selectedFlow} on ${date.toDateString()}`);
    }
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
            className={`text-sm px-6 py-2 rounded-full cursor-pointer ${
              tab === 'Period'
                ? 'bg-[#F98679] text-white'
                : 'bg-[#FFD8C9] text-[#B65C4B]'
            }`}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Flow Selection */}
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
                  ? 'border-[#3BA4A0] bg-[#C2EDEA] text-[#3BA4A0]'
                  : 'border-[#E3B9AE] text-[#E3B9AE]'
              }`}
            >
              <Droplet size={iconSizes[flow]} />
            </div>
            <span className="text-xs">{flow}</span>
          </div>
        ))}
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="bg-[#3BA4A0] text-white text-medium px-10 py-2 rounded-full mb-12"
      >
        Save
      </button>

    {/* Report Button Container */}
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