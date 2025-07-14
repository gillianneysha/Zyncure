import React, { useState, useEffect, useRef } from 'react';
import {
  Droplet, Droplets, FileDown, FileUp, CloudSun, Leaf, Sun, Moon, Circle,
  Rainbow, Flame, TriangleAlert, MessageCircleWarning,
  Heart, Brain, Activity, CircleArrowDown, CircleArrowUp, CircleAlert, Eye, Bed,
  Laugh, Frown, Popcorn, CakeSlice, Beef, Apple, Drumstick, Candy,
  BatteryWarning, BatteryLow, BatteryMedium, BatteryFull, Gauge, NotebookPen, Check, Lock
} from 'lucide-react';
import TrackingCalendar from '../../components/TrackingCalendar';
import { supabase } from '../../client';
import ShareSymptom from '../../components/ShareSymptom';
import { generatePDF } from '../../utils/generateTrackingReport';

const PeriodTracker = () => {
  const [selectedTab, setSelectedTab] = useState('Feelings');
  const [selectedValues, setSelectedValues] = useState({
    Feelings: '',
    Cravings: [], 
    'Period Flow': '',
    'Symptoms': [], 
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
 
  
  const skipNextUpdate = useRef(false);
  const lastUpdateDate = useRef(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    birthdate: ''
  });


  const [userTier, setUserTier] = useState({
    current_tier: 'free',
    max_symptoms: 3,
    can_track_custom_symptoms: false,
    symptoms_tracked: 0,
    can_add_symptoms: true
  });


  const FREE_TIER_CATEGORIES = ['Period Flow', 'Symptoms', 'Feelings', 'Custom'];


  const fetchUserTierInfo = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_tier_status')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user tier:', error);
        return {
          current_tier: 'free',
          max_symptoms: 3,
          can_track_custom_symptoms: false,
          symptoms_tracked: 0,
          can_add_symptoms: true
        };
      }

      return {
        current_tier: data.current_tier,
        max_symptoms: data.max_symptoms,
        can_track_custom_symptoms: data.can_track_custom_symptoms,
        symptoms_tracked: data.symptoms_tracked,
        can_add_symptoms: data.can_add_symptoms
      };
    } catch (error) {
      console.error('Error in fetchUserTierInfo:', error);
      return {
        current_tier: 'free',
        max_symptoms: 3,
        can_track_custom_symptoms: false,
        symptoms_tracked: 0,
        can_add_symptoms: true
      };
    }
  };


  const canTrackCategory = (category) => {
    if (userTier.current_tier === 'free') {
      return FREE_TIER_CATEGORIES.includes(category) || 
             (category === 'Custom' && userTier.can_track_custom_symptoms);
    }
    
    return true; 
  };

 
  const loadSelectedValuesForDate = (targetDate, entries) => {
    const normalizedDate = new Date(targetDate);
    normalizedDate.setHours(0, 0, 0, 0);

    
    const entriesForDate = entries.filter(entry => {
      const entryDate = new Date(entry.date_logged);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === normalizedDate.getTime();
    });

    const newSelectedValues = {
      Feelings: '',
      Cravings: [],
      'Period Flow': '',
      'Symptoms': [],
      Energy: '',
      Weight: '',
      Custom: ''
    };

    entriesForDate.forEach(entry => {
      if (entry.symptoms && entry.severity) {
        if (entry.symptoms === 'Symptoms') {
      
          if (!newSelectedValues['Symptoms'].includes(entry.severity)) {
            newSelectedValues['Symptoms'].push(entry.severity);
          }
        } else if (entry.symptoms === 'Cravings') {
    
          if (!newSelectedValues['Cravings'].includes(entry.severity)) {
            newSelectedValues['Cravings'].push(entry.severity);
          }
        } else {
      
          newSelectedValues[entry.symptoms] = entry.severity;
        }
      }
    });

    return newSelectedValues;
  };

  useEffect(() => {
    const fetchAndStoreUserData = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('Supabase user:', user); 
      if (authError || !user) {
        console.error('User fetch failed:', authError?.message);
        return;
      }

    
      const tierInfo = await fetchUserTierInfo(user.id);
      setUserTier(tierInfo);

  
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

   
      const { data, error } = await supabase
        .from('symptomlog')
        .select('date_logged, symptoms, severity')
        .eq('patients_id', user.id)
        .order('date_logged', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error.message);
        return;
      }


      const normalized = data.map(entry => ({
        ...entry,
        date_logged: new Date(entry.date_logged),
      }));

      setLoggedDates(normalized);
     
  
      const initialValues = loadSelectedValuesForDate(date, normalized);
      setSelectedValues(initialValues);
      setWeightInput(initialValues.Weight || '');
      setCustomInput(initialValues.Custom || '');
    };

    fetchAndStoreUserData();
  }, []);


  useEffect(() => {

    if (skipNextUpdate.current) {
      skipNextUpdate.current = false;
      return;
    }


    const currentDateString = date.toDateString();
    if (lastUpdateDate.current === currentDateString) {
      return;
    }

    lastUpdateDate.current = currentDateString;

    const newSelectedValues = loadSelectedValuesForDate(date, loggedDates);
    setSelectedValues(newSelectedValues);
    setWeightInput(newSelectedValues.Weight || '');
    setCustomInput(newSelectedValues.Custom || '');
  }, [date, loggedDates]);


  const handleSymptomToggle = (category, name) => {
    if (!canTrackCategory(category)) {
      setModalContent({
        title: 'Category Locked',
        message: `The ${category} category is only available for premium users. Upgrade to access all tracking categories.`,
        isError: true
      });
      setShowModal(true);
      return;
    }

    if (selectedTab === 'Symptoms' || selectedTab === 'Cravings') {

      setSelectedValues(prev => ({
        ...prev,
        [selectedTab]: prev[selectedTab].includes(name)
          ? prev[selectedTab].filter(item => item !== name)
          : [...prev[selectedTab], name]
      }));
    } else {

      setSelectedValues(prev => ({
        ...prev,
        [selectedTab]: prev[selectedTab] === name ? '' : name
      }));
    }
  };

  const handleSave = async () => {

    if (!canTrackCategory(selectedTab)) {
      setModalContent({
        title: 'Category Locked',
        message: `The ${selectedTab} category is only available for premium users. Upgrade to access all tracking categories.`,
        isError: true
      });
      setShowModal(true);
      return;
    }

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


    if (selectedTab === 'Symptoms' || selectedTab === 'Cravings') {
      if (!valueToSave || valueToSave.length === 0) {
        setModalContent({ title: 'Error', message: `Please select at least one ${selectedTab.toLowerCase()} option.`, isError: true });
        setShowModal(true);
        return;
      }
    } else {

      if (!valueToSave && selectedTab !== 'Weight' && selectedTab !== 'Custom') {
        setModalContent({ title: 'Error', message: `Please select a ${selectedTab.toLowerCase()} option.`, isError: true });
        setShowModal(true);
        return;
      }
    }

    if (selectedTab === 'Weight') valueToSave = weightInput;
    if (selectedTab === 'Custom') valueToSave = customInput;

    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const now = new Date();
    const dateWithCurrentTime = new Date(date);
    dateWithCurrentTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    let supabaseError;

    if (selectedTab === 'Symptoms' || selectedTab === 'Cravings') {
 
      const { error: deleteError } = await supabase
        .from('symptomlog')
        .delete()
        .eq('patients_id', user.id)
        .eq('symptoms', selectedTab)
        .gte('date_logged', normalizedDate.toISOString())
        .lt('date_logged', new Date(normalizedDate.getTime() + 24 * 60 * 60 * 1000).toISOString());

      if (deleteError) {
        setModalContent({ title: 'Error', message: `Failed to save: ${deleteError.message}`, isError: true });
        setShowModal(true);
        return;
      }

  
      const dataToInsert = valueToSave.map(value => ({
        symptoms: selectedTab,
        severity: value,
        date_logged: dateWithCurrentTime.toISOString(),
        patients_id: user.id,
      }));

      const { error } = await supabase.from('symptomlog').insert(dataToInsert);
      supabaseError = error;
    } else {
   
      const existingEntry = loggedDates.find(entry => {
        const entryDate = new Date(entry.date_logged);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === normalizedDate.getTime() && entry.symptoms === selectedTab;
      });

      const dataToSave = {
        symptoms: selectedTab,
        severity: valueToSave,
        date_logged: dateWithCurrentTime.toISOString(),
        patients_id: user.id,
      };

      if (existingEntry) {
    
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
       
        const { error } = await supabase.from('symptomlog').insert([dataToSave]);
        supabaseError = error;
      }
    }

    if (supabaseError) {
      setModalContent({ title: 'Error', message: `Failed to save: ${supabaseError.message}`, isError: true });
      setShowModal(true);
      return;
    }


    skipNextUpdate.current = true;

   
    setSelectedValues(prev => ({
      ...prev,
      [selectedTab]: valueToSave
    }));

  
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
    
    let saveMessage;
    if (selectedTab === 'Symptoms' || selectedTab === 'Cravings') {
      saveMessage = `${selectedTab} saved as "${valueToSave.join(', ')}" on ${formattedDate} at ${formattedTime}`;
    } else {
      saveMessage = `${selectedTab} saved as "${valueToSave}" on ${formattedDate} at ${formattedTime}`;
    }

    setModalContent({
      title: 'Success!',
      message: saveMessage,
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
        { name: 'Anxious', icon: MessageCircleWarning, size: 36 },
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
    const canTrack = canTrackCategory(selectedTab);

    if (selectedTab === 'Weight') {
      return (
        <div className={`border border-[#F8C8B6] p-6 rounded-2xl w-full ${
          canTrack ? 'bg-[#FFEFE9]' : 'bg-gray-100'
        }`}>
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Gauge size={60} color={canTrack ? "#E67E22" : "#999"} />
              {!canTrack && (
                <div className="absolute -top-1 -right-1 bg-gray-500 rounded-full p-1">
                  <Lock size={12} className="text-white" />
                </div>
              )}
            </div>
            <label className={`text-lg font-semibold ${
              canTrack ? 'text-[#B65C4B]' : 'text-gray-500'
            }`}>
              Enter your weight:
            </label>
            <input
              type="text"
              value={weightInput}
              onChange={(e) => canTrack && setWeightInput(e.target.value)}
              placeholder="e.g., 65 kg or 143 lbs"
              disabled={!canTrack}
              className={`w-full max-w-xs px-4 py-3 text-lg border-2 rounded-xl focus:outline-none text-center ${
                canTrack 
                  ? 'border-[#F8C8B6] focus:border-[#3BA4A0]' 
                  : 'border-gray-300 bg-gray-50 cursor-not-allowed'
              }`}
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
        <div className={`border border-[#F8C8B6] p-6 rounded-2xl w-full ${
          canTrack ? 'bg-[#FFEFE9]' : 'bg-gray-100'
        }`}>
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <NotebookPen size={60} color={canTrack ? "#E67E22" : "#999"} />
              {!canTrack && (
                <div className="absolute -top-1 -right-1 bg-gray-500 rounded-full p-1">
                  <Lock size={12} className="text-white" />
                </div>
              )}
            </div>
            <label className={`text-lg font-semibold ${
              canTrack ? 'text-[#B65C4B]' : 'text-gray-500'
            }`}>
              Enter custom data:
            </label>
            <textarea
              value={customInput}
              onChange={(e) => canTrack && setCustomInput(e.target.value)}
              placeholder="Enter any additional notes or symptoms..."
              disabled={!canTrack}
              className={`w-full px-4 py-3 text-lg border-2 rounded-xl focus:outline-none resize-none ${
                canTrack 
                  ? 'border-[#F8C8B6] focus:border-[#3BA4A0]' 
                  : 'border-gray-300 bg-gray-50 cursor-not-allowed'
              }`}
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
      <div className={`border border-[#F8C8B6] p-4 rounded-2xl w-full ${
        canTrack ? 'bg-[#FFEFE9]' : 'bg-gray-100'
      }`}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {currentConfig.options.map(({ name, icon, size, color }) => {
            const IconComponent = icon;
            
        
            let isSelected, isFromPreviousLog;
            if (selectedTab === 'Symptoms' || selectedTab === 'Cravings') {
              isSelected = selectedValues[selectedTab].includes(name);
              isFromPreviousLog = selectedValues[selectedTab].includes(name);
            } else {
              isSelected = selectedValues[selectedTab] === name;
              isFromPreviousLog = selectedValues[selectedTab] && selectedValues[selectedTab] === name;
            }

            return (
              <div
                key={name}
                onClick={() => canTrack && handleSymptomToggle(selectedTab, name)}
                className={`flex flex-col items-center py-3 px-2 ${
                  canTrack ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full border-4 transition-all relative ${
                    !canTrack
                      ? 'bg-gray-100 border-gray-300 opacity-50'
                      : isSelected
                      ? 'bg-[#C2EDEA] border-[#3BA4A0] text-[#3BA4A0] scale-110 shadow-md'
                      : 'bg-[#EDEDED] border-[#D8D8D8] text-[#B6B6B6] hover:border-[#3BA4A0] hover:bg-[#F0F9F9]'
                  }`}
                >
                  <IconComponent size={size || 32} color={color} />
                  {isFromPreviousLog && canTrack && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#3BA4A0] rounded-full flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <span className={`mt-2 text-sm md:text-base font-semibold text-center transition-all ${
                  !canTrack ? 'text-gray-500' : isSelected ? 'text-[#3BA4A0]' : 'text-[#F98679]'
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


  const handleDateSelect = (date) => {
    setDate(date);
  };


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

        {/* Tab Navigation with Tier Restrictions */}
        <div className="flex flex-wrap gap-2 justify-center w-full">
          {Object.keys(tabConfigs).map(tab => {
            const isLocked = !canTrackCategory(tab);
            return (
              <button
                key={tab}
                onClick={() => !isLocked && setSelectedTab(tab)}
                className={`text-sm md:text-base px-4 py-2 rounded-full font-semibold transition-all relative ${
                  isLocked
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-60'
                    : selectedTab === tab
                    ? 'bg-[#F98679] text-white shadow-lg scale-105'
                    : 'bg-[#FFD8C9] text-[#B65C4B] hover:bg-[#F8C8B6]'
                }`}
                disabled={isLocked}
              >
                {tab}
                {isLocked && (
                  <div className="absolute -top-1 -right-1 bg-gray-500 rounded-full p-1">
                    <Lock size={12} className="text-white" />
                  </div>
                )}
                {!isLocked && ((tab === 'Symptoms' || tab === 'Cravings') ? selectedValues[tab].length > 0 : selectedValues[tab]) && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#3BA4A0] rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Content Area */}
        {renderContent()}

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="bg-[#3BA4A0] hover:bg-[#2E8B87] text-white text-lg md:text-xl px-8 py-3 rounded-full transition-all shadow-lg active:scale-95 font-semibold"
        >
          {((selectedTab === 'Symptoms' || selectedTab === 'Energy') ? selectedValues[selectedTab].length > 0 : selectedValues[selectedTab]) ? 'Update' : 'Save'} {selectedTab}
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
  );
};

export default PeriodTracker;

