import { ChevronLeft, ChevronRight } from 'lucide-react';

const Calendar = ({ 
  currentDate, 
  selectedDate, 
  appointments = [], 
  onDateSelect, 
  onMonthNavigate,
  isPastDate 
}) => {
 
  const checkIsPastDate = isPastDate || ((date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  });
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isSameDate = (date1, date2) => {
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
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getAppointmentsForDate = (date) => {
    const dateStr = formatDate(date);
    return appointments.filter(apt => apt.date === dateStr);
  };

  const handleDateClick = (date) => {
    if (!date || checkIsPastDate(date)) return;
    onDateSelect(date);
  };

  const renderCalendar = () => {
    const days = getDaysInMonth(currentDate);
    const weeks = [];
    
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return weeks.map((week, weekIndex) => (
      <div key={weekIndex} className="grid grid-cols-7 gap-1">
        {week.map((day, dayIndex) => {
          const hasAppointments = day && getAppointmentsForDate(day).length > 0;
          const isSelected = day && isSameDate(day, selectedDate);
          const isToday = day && isSameDate(day, new Date());
          const isPast = day && checkIsPastDate(day);
          
          return (
            <div
              key={dayIndex}
              className={`h-10 flex items-center justify-center text-sm relative
                ${day === null ? '' : 
                  isPast ? 'cursor-not-allowed text-gray-400 pointer-events-none' :
                  isSelected ? 'bg-[#55A1A4] text-white rounded-full' :
                  isToday ? 'bg-orange-200 text-orange-800 rounded-full font-semibold' :
                  'text-[#F15629] hover:bg-orange-100 rounded-full cursor-pointer'}
              `}
              onClick={() => {
                if (!day || checkIsPastDate(day)) return;
                handleDateClick(day);
              }}
            >
              {day && (
                <span>
                  {day.getDate()}
                </span>
              )}
              {hasAppointments && (
                <div className={`absolute bottom-1 w-1 h-1 rounded-full
                  ${isPast ? 'bg-gray-400' : 'bg-teal-400'}
                `}></div>
              )}
            </div>
          );
        })}
      </div>
    ));
  };

  return (
    <div className="bg-[#FFD4C3] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => onMonthNavigate(-1)}
          className="p-2 hover:bg-orange-100 rounded-full transition-colors text-[#55A1A4]"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold text-[#F15629]">
          {months[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <button
          onClick={() => onMonthNavigate(1)}
          className="p-2 hover:bg-orange-100 rounded-full transition-colors text-[#55A1A4]"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-4">
        {daysOfWeek.map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-[#F15629]">
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