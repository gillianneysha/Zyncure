import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const TrackingCalendar = ({
  currentDate = new Date(),
  selectedDate,
  appointments = [],
  loggedDates = [], // Add this prop for tracking data
  onDateSelect = () => {},
  onMonthNavigate = () => {},
  onMonthYearChange
}) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(currentDate?.getMonth() || new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(currentDate?.getFullYear() || new Date().getFullYear());

  const formatDate = (date) => date.toISOString().split('T')[0];

  const isSameDate = (date1, date2) => {
    if (!date1 || !date2) return false;
    return formatDate(date1) === formatDate(date2);
  };

  const getDaysInMonth = (date) => {
    const validDate = date || new Date();
    const year = validDate.getFullYear();
    const month = validDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(new Date(year, month, day));
    return days;
  };

  const getAppointmentsForDate = (date) => {
    const dateStr = formatDate(date);
    return appointments.filter(apt => apt.date === dateStr);
  };

  // Enhanced dot logic from period tracker
  const getTrackingDotsForDate = (date) => {
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
        className="flex justify-center mt-0.5 space-x-0.5 flex-wrap max-w-full"
        title={uniqueSymptoms.join(', ')}
      >
        {uniqueSymptoms.slice(0, 3).map((symptom, idx) => (
          <span
            key={idx}
            className="block h-1.5 w-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: colorMap[symptom] || '#999' }}
          />
        ))}
        {uniqueSymptoms.length > 3 && (
          <span className="text-xs font-bold text-gray-600">+</span>
        )}
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
          const hasAppointments = getAppointmentsForDate(day).length > 0;
          const trackingDots = getTrackingDotsForDate(day);

          return (
            <div
              key={dayIndex}
              className={`
                h-12 w-12 md:h-16 md:w-16 flex flex-col items-center justify-center text-base md:text-lg cursor-pointer relative select-none
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
              <span className="leading-none">{day.getDate()}</span>
              
              {/* Container for both appointment and tracking dots */}
              <div className="flex flex-col items-center space-y-0.5 mt-0.5">
                {/* Appointment dot (kept as single dot) */}
                {hasAppointments && (
                  <div className="w-1.5 h-1.5 bg-[#3BA4A0] rounded-full flex-shrink-0"></div>
                )}
                
                {/* Tracking dots (multi-category) */}
                {trackingDots}
              </div>
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
            {months[currentDate?.getMonth() || new Date().getMonth()]} {currentDate?.getFullYear() || new Date().getFullYear()}
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
                  if (onMonthYearChange) {
                    onMonthYearChange(pickerMonth, pickerYear);
                  } else if (onMonthNavigate) {
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

export default TrackingCalendar;