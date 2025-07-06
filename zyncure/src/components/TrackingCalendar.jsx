import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const Calendar = ({
  currentDate,
  selectedDate,
  loggedDates = [], // Changed from appointments to loggedDates
  onDateSelect,
  onMonthNavigate,
  onMonthYearChange // optional, for parent to handle
}) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(currentDate.getMonth());
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());

  // Define symptom categories and their colors based on your app's categories
  const symptomColors = {
    'period flow': '#E91E63',    // Pink for period tracking
    'period_flow': '#E91E63',    // Alternative naming
    'symptoms': '#FF6B6B',       // Coral red for general symptoms
    'symptom': '#FF6B6B',        // Alternative naming
    'feelings': '#9C27B0',       // Purple for emotional tracking
    'mood': '#9C27B0',           // Alternative naming
    'emotions': '#9C27B0',       // Alternative naming
    'cravings': '#FF9800',       // Orange for food cravings
    'craving': '#FF9800',        // Alternative naming
    'food': '#FF9800',           // Alternative naming
    'energy': '#4CAF50',         // Green for energy levels
    'energy_level': '#4CAF50',   // Alternative naming
    'fatigue': '#4CAF50',        // Related to energy
    'weight': '#2196F3',         // Blue for weight tracking
    'weight_change': '#2196F3',  // Alternative naming
    'custom': '#607D8B',         // Blue-gray for custom entries
    'other': '#607D8B'           // Gray for miscellaneous
  };

  const formatDate = (date) => date.toISOString().split('T')[0];

  const isSameDate = (date1, date2) => {
    if (!date1 || !date2) return false;
    return formatDate(date1) === formatDate(date2);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(new Date(year, month, day));
    return days;
  };

  // Updated function to check for logged symptoms on a specific date
  const getLoggedSymptomsForDate = (date) => {
    const dateStr = formatDate(date);
    return loggedDates.filter(entry => {
      const entryDate = new Date(entry.date_logged);
      return formatDate(entryDate) === dateStr;
    });
  };

  // Get unique symptom types for a specific date
  const getUniqueSymptomTypes = (date) => {
    const symptoms = getLoggedSymptomsForDate(date);
    const uniqueTypes = [...new Set(symptoms.map(symptom => {
      // Extract symptom type from symptom object
      // Check for various possible property names
      if (symptom.category) return symptom.category.toLowerCase().replace(/\s+/g, '_');
      if (symptom.type) return symptom.type.toLowerCase().replace(/\s+/g, '_');
      if (symptom.symptom_type) return symptom.symptom_type.toLowerCase().replace(/\s+/g, '_');
      if (symptom.name) return symptom.name.toLowerCase().replace(/\s+/g, '_');
      // Handle specific app categories
      if (symptom.period_flow) return 'period_flow';
      if (symptom.symptoms) return 'symptoms';
      if (symptom.feelings) return 'feelings';
      if (symptom.cravings) return 'cravings';
      if (symptom.energy) return 'energy';
      if (symptom.weight) return 'weight';
      if (symptom.custom) return 'custom';
      return 'other';
    }))];
    return uniqueTypes;
  };

  // Check if a date has any logged symptoms
  const hasLoggedSymptoms = (date) => {
    return getLoggedSymptomsForDate(date).length > 0;
  };

  // Helper function to determine symptom type from data
  const getSymptomType = (symptom) => {
    // Debug: log the symptom object to see its structure
    console.log('Symptom object:', symptom);
    
    // Check all possible property names and values
    const checkValue = (value) => {
      if (!value) return null;
      const val = value.toString().toLowerCase().replace(/\s+/g, '_');
      
      // Direct matches
      if (val.includes('period') || val.includes('flow')) return 'period_flow';
      if (val.includes('symptom')) return 'symptoms';
      if (val.includes('feeling') || val.includes('mood') || val.includes('emotion')) return 'feelings';
      if (val.includes('craving') || val.includes('food')) return 'cravings';
      if (val.includes('energy') || val.includes('fatigue')) return 'energy';
      if (val.includes('weight')) return 'weight';
      if (val.includes('custom')) return 'custom';
      
      // Check if the value exactly matches our color keys
      if (symptomColors[val]) return val;
      
      return null;
    };
    
    // Check all properties of the symptom object
    for (const [key, value] of Object.entries(symptom)) {
      const result = checkValue(value);
      if (result) return result;
      
      // Also check the property name itself
      const keyResult = checkValue(key);
      if (keyResult) return keyResult;
    }
    
    return 'other';
  };

  // Render symptom dots for a specific date - shows total count of symptoms
  const renderSymptomDots = (date) => {
    const allSymptoms = getLoggedSymptomsForDate(date);
    if (allSymptoms.length === 0) return null;

    // Create dots for each individual symptom entry
    const dots = [];
    allSymptoms.forEach((symptom, index) => {
      const symptomType = getSymptomType(symptom);
      const color = symptomColors[symptomType] || symptomColors.other;
      
      // Debug: log the determined type and color
      console.log(`Symptom ${index + 1}:`, symptomType, 'Color:', color);
      
      dots.push(
        <div
          key={index}
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color }}
          title={`${symptomType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: Entry ${index + 1}`}
        />
      );
    });
    
    return (
      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5 flex-wrap justify-center max-w-12">
        {dots}
      </div>
    );
  };

  // Today's date (normalized to 00:00:00)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const renderCalendar = () => {
    const days = getDaysInMonth(currentDate);
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

    return weeks.map((week, weekIndex) => (
      <div key={weekIndex} className="grid grid-cols-7 gap-1">
        {week.map((day, dayIndex) => {
          if (!day) return <div key={dayIndex} className="h-12" />;
          const isFuture = day > today;
          const isSelected = isSameDate(day, selectedDate);
          const isToday = isSameDate(day, today);
          const hasSymptoms = hasLoggedSymptoms(day);

          return (
            <div
              key={dayIndex}
              className={`
                h-12 w-12 md:h-16 md:w-16 flex items-center justify-center text-base md:text-lg cursor-pointer relative select-none
                transition-all duration-150
                ${isFuture ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}
                ${isSelected && !isFuture ? 'bg-[#55A1A4] text-white rounded-full scale-110 shadow-lg' : ''}
                ${isToday && !isSelected && !isFuture ? 'bg-orange-200 text-orange-800 rounded-full font-semibold scale-105' : ''}
                ${!isSelected && !isToday && !isFuture ? 'text-[#F15629] hover:bg-orange-100 rounded-full' : ''}
              `}
              onClick={() => !isFuture && onDateSelect(day)}
              aria-disabled={isFuture}
              tabIndex={isFuture ? -1 : 0}
            >
              {day.getDate()}
              {hasSymptoms && renderSymptomDots(day)}
            </div>
          );
        })}
      </div>
    ));
  };

  // Picker years range
  const years = [];
  for (let y = today.getFullYear() - 10; y <= today.getFullYear() + 1; y++) years.push(y);

  const handlePickerApply = () => {
    setShowPicker(false);
    if (onMonthYearChange) {
      onMonthYearChange(pickerMonth, pickerYear);
    } else {
      onMonthNavigate(0, pickerMonth, pickerYear);
    }
  };

  return (
    <div className="bg-[#FFD4C3] rounded-2xl p-6 md:p-8 shadow-lg max-w-2xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => onMonthNavigate(-1)}
          className="p-2 hover:bg-orange-100 rounded-full transition-colors text-[#55A1A4]"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col items-center relative">
          <button
            className="text-xl md:text-2xl font-bold text-[#F15629] px-4 py-2 rounded-full transition-colors
              hover:bg-[#F8C8B6] hover:text-[#B65C4B] focus:outline-none"
            onClick={() => setShowPicker(v => !v)}
            type="button"
          >
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
          </button>
          {showPicker && (
            <div className="absolute z-50 mt-12 bg-white border rounded-xl shadow-lg p-4 flex flex-col items-center">
              <div className="flex gap-2 mb-2">
                <select
                  value={pickerMonth}
                  onChange={e => setPickerMonth(Number(e.target.value))}
                  className="border rounded px-2 py-1"
                >
                  {months.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
                <select
                  value={pickerYear}
                  onChange={e => setPickerYear(Number(e.target.value))}
                  className="border rounded px-2 py-1"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button
                className="bg-[#55A1A4] text-white px-4 py-1 rounded-full font-semibold"
                onClick={() => {
                  setShowPicker(false);
                  // Update parent calendar state
                  if (onMonthYearChange) {
                    onMonthYearChange(pickerMonth, pickerYear);
                  } else if (onMonthNavigate) {
                    // Fallback: update currentDate in parent
                    onMonthNavigate(0, pickerMonth, pickerYear);
                  }
                }}
              >
                Go
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => onMonthNavigate(1)}
          className="p-2 hover:bg-orange-100 rounded-full transition-colors text-[#55A1A4]"
        >
          <ChevronRight size={24} />
        </button>
      </div>
      


      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-xs md:text-base font-bold text-[#F15629] uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>
      <div className="space-y-1">
        {renderCalendar()}
      </div>
    </div>
  );
};

export default Calendar;