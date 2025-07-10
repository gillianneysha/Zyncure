import React, { useState, useEffect, useRef } from 'react';
import {
  Droplet, Droplets, FileDown, FileUp, CloudSun, Leaf, Sun, Moon, Circle,
  Rainbow, Flame, TriangleAlert, MessageCircleWarning,
  Heart, Brain, Activity, CircleArrowDown, CircleArrowUp, CircleAlert, Eye, Bed,
  Laugh, Frown, Popcorn, CakeSlice, Beef, Apple, Drumstick, Candy,
  BatteryWarning, BatteryLow, BatteryMedium, BatteryFull, Gauge, NotebookPen, Check, Save
} from 'lucide-react';
import TrackingCalendar from '../../components/TrackingCalendar';
import { supabase } from '../../client';
import ShareSymptom from '../../components/ShareSymptom';
import { generatePDF } from '../../utils/generateTrackingReport';

const PeriodTracker = () => {
  const [selectedTab, setSelectedTab] = useState('Feelings');
  const [selectedValues, setSelectedValues] = useState({
  Feelings: [],
  Cravings: [],
  'Period Flow': [],
  'Symptoms': [],
  Energy: [],
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
  const [selectedSymptoms, setSelectedSymptoms] = useState(new Set());
 
  // Use ref to track if we should skip the next useEffect update
  const skipNextUpdate = useRef(false);
  const lastUpdateDate = useRef(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    birthdate: ''
  });

  // Function to load selected values for a specific date
  const loadSelectedValuesForDate = (targetDate, entries) => {
    const normalizedDate = new Date(targetDate);
    normalizedDate.setHours(0, 0, 0, 0);

    // Find all entries for the selected date
    const entriesForDate = entries.filter(entry => {
    const entryDate = new Date(entry.date_logged);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate.getTime() === normalizedDate.getTime();
  });

  const newSelectedValues = {
    Feelings: [],
    Cravings: [],
    'Period Flow': [],
    'Symptoms': [],
    Energy: [],
    Weight: '',
    Custom: ''
  };

  entriesForDate.forEach(entry => {
    if (entry.symptoms && entry.severity) {
      // For Weight and Custom, keep as single values
      if (entry.symptoms === 'Weight' || entry.symptoms === 'Custom') {
        newSelectedValues[entry.symptoms] = entry.severity;
      } else {
        // For other categories, store as arrays
        if (!newSelectedValues[entry.symptoms].includes(entry.severity)) {
          newSelectedValues[entry.symptoms].push(entry.severity);
        }
      }
    }

    const newSelectedValues = {
      Feelings: '',
      Cravings: '',
      'Period Flow': '',
      'Symptoms': '',
      Energy: '',
      Weight: '',
      Custom: ''
    };
  });
  
    entriesForDate.forEach(entry => {
      if (entry.symptoms && entry.severity) {
        newSelectedValues[entry.symptoms] = entry.severity;
      }
    });

    return newSelectedValues;
  };

  // Handle symptom selection (always in multi-select mode)
  const handleSymptomToggle = (category, value) => {
    const symptomKey = `${category}:${value}`;
    const newSelected = new Set(selectedSymptoms);
   
    if (newSelected.has(symptomKey)) {
      newSelected.delete(symptomKey);
    } else {
      newSelected.add(symptomKey);
    }
   
    setSelectedSymptoms(newSelected);
  };

  // Save multiple symptoms at once
  const handleMultiSave = async () => {
    if (selectedSymptoms.size === 0) {
      setModalContent({ title: 'Error', message: 'Please select at least one symptom to save.', isError: true });
      setShowModal(true);
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setModalContent({ title: 'Error', message: 'You must be logged in to save.', isError: true });
      setShowModal(true);
      return;
    }

    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const now = new Date();
    const dateWithCurrentTime = new Date(date);
    dateWithCurrentTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    const savePromises = [];
    const savedSymptoms = [];

    for (const symptomKey of selectedSymptoms) {
      const [category, value] = symptomKey.split(':');
     
      // Check if entry exists for this date and symptom type
      const existingEntry = loggedDates.find(entry => {
        const entryDate = new Date(entry.date_logged);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === normalizedDate.getTime() && entry.symptoms === category;
      });

      const dataToSave = {
        symptoms: category,
        severity: value,
        date_logged: dateWithCurrentTime.toISOString(),
        patients_id: user.id,
      };

      if (existingEntry) {
        // Update existing entry
        const promise = supabase
          .from('symptomlog')
          .update({
            severity: value,
            date_logged: dateWithCurrentTime.toISOString()
          })
          .eq('patients_id', user.id)
          .eq('symptoms', category)
          .eq('date_logged', existingEntry.date_logged.toISOString());
       
        savePromises.push(promise);
      } else {
        // Insert new entry
        const promise = supabase.from('symptomlog').insert([dataToSave]);
        savePromises.push(promise);
      }
     
      savedSymptoms.push(`${category}: ${value}`);
    }

    try {
      const results = await Promise.all(savePromises);
      const hasError = results.some(result => result.error);
     
      if (hasError) {
        setModalContent({ title: 'Error', message: 'Some symptoms failed to save. Please try again.', isError: true });
        setShowModal(true);
        return;
      }

      // Skip the next useEffect update
      skipNextUpdate.current = true;

      // Update the selected values with all saved symptoms
      const newSelectedValues = { ...selectedValues };
for (const symptomKey of selectedSymptoms) {
  const [category, value] = symptomKey.split(':');
  // For Weight and Custom, store as single values
  if (category === 'Weight' || category === 'Custom') {
    newSelectedValues[category] = value;
  } else {
    // For other categories, store as arrays
    if (!newSelectedValues[category].includes(value)) {
      newSelectedValues[category].push(value);
    }
  }
}
setSelectedValues(newSelectedValues);

      // Refresh data from Supabase
      const { data, error: fetchError } = await supabase
        .from('symptomlog')
        .select('date_logged, symptoms, severity')
        .eq('patients_id', user.id)
        .order('date_logged', { ascending: false });

      if (!fetchError) {
        const normalized = data.map(entry => ({
          ...entry,
          date_logged: new Date(entry.date_logged),
        }));
        setLoggedDates(normalized);
      }

      const formattedDate = normalizedDate.toDateString();
      const formattedTime = now.toLocaleTimeString();
     
      setModalContent({
        title: 'Success!',
        message: `${savedSymptoms.length} symptoms saved on ${formattedDate} at ${formattedTime}:\n${savedSymptoms.join('\n')}`,
        isError: false
      });

      setShowModal(true);
     
      // Clear selections after successful save - symptoms will remain highlighted via selectedValues
      setSelectedSymptoms(new Set());
     
    } catch (error) {
      setModalContent({ title: 'Error', message: 'Failed to save symptoms. Please try again.', isError: true });
      setShowModal(true);
    }
  };

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

      // Always fetch fresh data from Supabase instead of using localStorage
      const { data, error } = await supabase
        .from('symptomlog')
        .select('date_logged, symptoms, severity')
        .eq('patients_id', user.id)
        .order('date_logged', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error.message);
        return;
      }

      // Normalize the data - ensure dates are properly formatted
      const normalized = data.map(entry => ({
        ...entry,
        date_logged: new Date(entry.date_logged),
      }));

      setLoggedDates(normalized);
     
      // Load initial selected values for current date
      const initialValues = loadSelectedValuesForDate(date, normalized);
      setSelectedValues(initialValues);
      setWeightInput(initialValues.Weight || '');
      setCustomInput(initialValues.Custom || '');
    };

    fetchAndStoreUserData();
  }, []);

  // Effect to update selected values when date changes (but not when data refreshes after save)
  useEffect(() => {
    // Skip this update if we just saved data
    if (skipNextUpdate.current) {
      skipNextUpdate.current = false;
      return;
    }

    // Only update if the date actually changed
    const currentDateString = date.toDateString();
    if (lastUpdateDate.current === currentDateString) {
      return;
    }

    lastUpdateDate.current = currentDateString;

    const newSelectedValues = loadSelectedValuesForDate(date, loggedDates);
    setSelectedValues(newSelectedValues);
    setWeightInput(newSelectedValues.Weight || '');
    setCustomInput(newSelectedValues.Custom || '');
    
    // Reset selections when date changes
    setSelectedSymptoms(new Set());
    
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

    // Check if entry exists for this date and symptom type
    const existingEntry = loggedDates.find(entry => {
      const entryDate = new Date(entry.date_logged);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === normalizedDate.getTime() && entry.symptoms === selectedTab;
    });

    // Use the selected date but with current time for timestamp
    const now = new Date();
    const dateWithCurrentTime = new Date(date);
    dateWithCurrentTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    const dataToSave = {
      symptoms: selectedTab,
      severity: valueToSave,
      date_logged: dateWithCurrentTime.toISOString(),
      patients_id: user.id,
    };

    let supabaseError;

    if (existingEntry) {
      // Update existing entry
      const { error } = await supabase
        .from('symptomlog')
        .update({
          severity: valueToSave,
          date_logged: dateWithCurrentTime.toISOString()
        })
        .eq('patients_id', user.id)
        .eq('symptoms', selectedTab)
        .eq('date_logged', existingEntry.date_logged.toISOString());

      supabaseError = error;
    } else {
      // Insert new entry
      const { error } = await supabase.from('symptomlog').insert([dataToSave]);
      supabaseError = error;
    }

    if (supabaseError) {
      setModalContent({ title: 'Error', message: `Failed to save: ${supabaseError.message}`, isError: true });
      setShowModal(true);
      return;
    }

    // Skip the next useEffect update since we're manually updating the state
    skipNextUpdate.current = true;

    // Update the selected values immediately with the saved value
    setSelectedValues(prev => {
  const newValues = { ...prev };
  if (selectedTab === 'Weight' || selectedTab === 'Custom') {
    newValues[selectedTab] = valueToSave;
  } else {
    if (!newValues[selectedTab].includes(valueToSave)) {
      newValues[selectedTab] = [...newValues[selectedTab], valueToSave];
    }
  }
  return newValues;
});

    // Refresh data from Supabase after successful save
    const { data, error: fetchError } = await supabase
      .from('symptomlog')
      .select('date_logged, symptoms, severity')
      .eq('patients_id', user.id)
      .order('date_logged', { ascending: false });

    if (!fetchError) {
      const normalized = data.map(entry => ({
        ...entry,
        date_logged: new Date(entry.date_logged),
      }));
      setLoggedDates(normalized);
    }

    const formattedDate = normalizedDate.toDateString();
    const formattedTime = now.toLocaleTimeString();
    setModalContent({
      title: 'Success!',
      message: `${selectedTab} saved as "${valueToSave}" on ${formattedDate} at ${formattedTime}`,
      isError: false
    });

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
            const isSelected = selectedSymptoms.has(`${selectedTab}:${name}`);
const isFromPreviousLog = selectedValues[selectedTab] && 
  (Array.isArray(selectedValues[selectedTab]) 
    ? selectedValues[selectedTab].includes(name)
    : selectedValues[selectedTab] === name);
            return (
              <div
                key={name}
                onClick={() => handleSymptomToggle(selectedTab, name)}
                className="flex flex-col items-center cursor-pointer py-3 px-2"
              >
                <div
                  className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full border-4 transition-all relative ${
                    isSelected || isFromPreviousLog
                      ? 'bg-[#C2EDEA] border-[#3BA4A0] text-[#3BA4A0] scale-110 shadow-md'
                      : 'bg-[#EDEDED] border-[#D8D8D8] text-[#B6B6B6] hover:border-[#3BA4A0] hover:bg-[#F0F9F9]'
                  }`}
                >
                  <IconComponent size={size || 32} color={color} />
                  {(isSelected || isFromPreviousLog) && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#3BA4A0] rounded-full flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <span className={`mt-2 text-sm md:text-base font-semibold text-center transition-all ${
                  isSelected || isFromPreviousLog ? 'text-[#3BA4A0]' : 'text-[#F98679]'
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

  return (
    <div className="calendar-container min-h-[100vh] w-full relative">
      <div className="flex flex-col items-center px-4 md:px-8 py-4 space-y-6 w-full max-w-4xl mx-auto">
        <TrackingCalendar
          currentDate={currentDate}
          selectedDate={date}
          loggedDates={loggedDates}
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
              className={`text-sm md:text-base px-4 py-2 rounded-full font-semibold transition-all relative ${
                selectedTab === tab
                  ? 'bg-[#F98679] text-white shadow-lg scale-105'
                  : 'bg-[#FFD8C9] text-[#B65C4B] hover:bg-[#F8C8B6]'
              }`}
            >
              {tab}
              {((Array.isArray(selectedValues[tab]) && selectedValues[tab].length > 0) || 
  (!Array.isArray(selectedValues[tab]) && selectedValues[tab])) && (
  <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#3BA4A0] rounded-full"></div>
)}
            </button>
          ))}
        </div>

        {/* Selection counter */}
        {selectedSymptoms.size > 0 && (
          <div className="bg-[#C2EDEA] border border-[#3BA4A0] px-4 py-2 rounded-full">
            <span className="text-sm text-[#3BA4A0] font-medium">
              {selectedSymptoms.size} symptom{selectedSymptoms.size > 1 ? 's' : ''} selected
            </span>
          </div>
        )}

        {/* Content Area */}
        {renderContent()}

        {/* Save Button */}
        <div className="flex gap-4 w-full justify-center">
          {selectedTab === 'Weight' || selectedTab === 'Custom' ? (
            <button
              onClick={handleSave}
 className="bg-[#3BA4A0] hover:bg-[#2E8B87] text-white text-lg md:text-xl px-8 py-3 rounded-full transition-all shadow-lg active:scale-95 font-semibold"            >
              {selectedValues[selectedTab] ? 'Update' : 'Save'} {selectedTab}
            </button>
          ) : (
            <button
              onClick={handleMultiSave}
              disabled={selectedSymptoms.size === 0}
              className={`flex items-center gap-2 text-lg md:text-xl px-8 py-3 rounded-full transition-all shadow-lg active:scale-95 font-semibold ${
  selectedSymptoms.size === 0
    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
    : 'bg-teal-600 hover:bg-teal-600 text-white'
}`}
            >
              <Save size={20} />
              {selectedSymptoms.size === 0
                ? 'Select symptoms to save'
                : `Save ${selectedSymptoms.size} Symptom${selectedSymptoms.size > 1 ? 's' : ''}`
              }
            </button>
          )}
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
            disabled={!userInfo.name}
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
     </div>   
  );
};


export default PeriodTracker;