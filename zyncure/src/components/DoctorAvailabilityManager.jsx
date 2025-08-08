import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Plus, Edit, Trash2, Save, X, AlertCircle } from 'lucide-react';
import { doctorAvailabilityService } from '../services/DoctorAvailabilityService';

const DoctorAvailabilityManager = () => {
  const [availability, setAvailability] = useState([]);
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUnavailableForm, setShowUnavailableForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [availabilityForm, setAvailabilityForm] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    duration_minutes: 30,
    is_active: true
  });

  const [unavailableForm, setUnavailableForm] = useState({
    unavailable_date: '',
    start_time: '',
    end_time: '',
    reason: ''
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Load existing availability on component mount
  useEffect(() => {
    loadAvailability();
    loadUnavailableDates();
  }, []);

const loadAvailability = async () => {
  setLoading(true);
  try {
    const { data, error } = await doctorAvailabilityService.getAvailability();
    if (error) {
      setError(`Failed to load availability: ${error}`);
      setAvailability([]);
    } else {
      setAvailability(data || []);
    }
  } catch (err) {
    console.error('Error loading availability:', err);
    setError('Failed to load availability');
    setAvailability([]);
  } finally {
    setLoading(false);
  }
};

  const loadUnavailableDates = async () => {
  try {
    const { data, error } = await doctorAvailabilityService.getUnavailableDates();
    if (error) {
      setError(`Failed to load unavailable dates: ${error}`);
      setUnavailableDates([]);
    } else {
      setUnavailableDates(data || []);
    }
  } catch (err) {
    console.error('Error loading unavailable dates:', err);
    setError('Failed to load unavailable dates');
    setUnavailableDates([]);
  }
};

  const handleAddAvailability = async () => {
  if (availabilityForm.start_time >= availabilityForm.end_time) {
    setError('End time must be after start time');
    return;
  }

  setLoading(true);
  try {
    const { error } = await doctorAvailabilityService.addAvailability(availabilityForm);
    
    if (error) {
      setError(`Failed to add availability: ${error}`);
    } else {
      setSuccess('Availability added successfully');
      setShowAddForm(false);
      resetAvailabilityForm();
      await loadAvailability(); // Reload the data
    }
  } catch (err) {
    console.error('Error adding availability:', err);
    setError('Failed to add availability');
  } finally {
    setLoading(false);
  }
};

  const handleUpdateAvailability = async () => {
  if (availabilityForm.start_time >= availabilityForm.end_time) {
    setError('End time must be after start time');
    return;
  }

  setLoading(true);
  try {
    const {  error } = await doctorAvailabilityService.updateAvailability(editingId, availabilityForm);
    
    if (error) {
      setError(`Failed to update availability: ${error}`);
    } else {
      setSuccess('Availability updated successfully');
      setEditingId(null);
      resetAvailabilityForm();
      setShowAddForm(false);
      await loadAvailability(); // Reload the data
    }
  } catch (err) {
    console.error('Error updating availability:', err);
    setError('Failed to update availability');
  } finally {
    setLoading(false);
  }
};

  const handleDeleteAvailability = async (id) => {
  if (!window.confirm('Are you sure you want to delete this availability slot?')) {
    return;
  }

  setLoading(true);
  try {
    const { error } = await doctorAvailabilityService.deleteAvailability(id);
    
    if (error) {
      setError(`Failed to delete availability: ${error}`);
    } else {
      setSuccess('Availability deleted successfully');
      await loadAvailability(); // Reload the data
    }
  } catch (err) {
    console.error('Error deleting availability:', err);
    setError('Failed to delete availability');
  } finally {
    setLoading(false);
  }
};

  const handleAddUnavailableDate = async () => {
  if (!unavailableForm.unavailable_date) {
    setError('Please select a date');
    return;
  }

  setLoading(true);
  try {
    const {  error } = await doctorAvailabilityService.addUnavailableDate(unavailableForm);
    
    if (error) {
      setError(`Failed to add unavailable date: ${error}`);
    } else {
      setSuccess('Unavailable date added successfully');
      setShowUnavailableForm(false);
      resetUnavailableForm();
      await loadUnavailableDates(); // Reload the data
    }
  } catch (err) {
    console.error('Error adding unavailable date:', err);
    setError('Failed to add unavailable date');
  } finally {
    setLoading(false);
  }
};

const handleDeleteUnavailableDate = async (id) => {
  if (!window.confirm('Are you sure you want to delete this unavailable date?')) {
    return;
  }

  setLoading(true);
  try {
    const { error } = await doctorAvailabilityService.deleteUnavailableDate(id);
    
    if (error) {
      setError(`Failed to delete unavailable date: ${error}`);
    } else {
      setSuccess('Unavailable date deleted successfully');
      await loadUnavailableDates(); // Reload the data
    }
  } catch (err) {
    console.error('Error deleting unavailable date:', err);
    setError('Failed to delete unavailable date');
  } finally {
    setLoading(false);
  }
};

  const resetAvailabilityForm = () => {
    setAvailabilityForm({
      day_of_week: 1,
      start_time: '09:00',
      end_time: '17:00',
      duration_minutes: 30,
      is_active: true
    });
  };

  const resetUnavailableForm = () => {
    setUnavailableForm({
      unavailable_date: '',
      start_time: '',
      end_time: '',
      reason: ''
    });
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setAvailabilityForm({
      day_of_week: item.day_of_week,
      start_time: item.start_time,
      end_time: item.end_time,
      duration_minutes: item.duration_minutes,
      is_active: item.is_active
    });
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetAvailabilityForm();
  };

  // Group availability by day
  const availabilityByDay = availability.reduce((acc, item) => {
    if (!acc[item.day_of_week]) {
      acc[item.day_of_week] = [];
    }
    acc[item.day_of_week].push(item);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Doctor Availability Management</h1>
        <p className="text-gray-600">Set your weekly schedule and manage unavailable dates</p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-600">{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <span className="text-green-600">{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-500 hover:text-green-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Schedule */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Weekly Schedule</h2>
              <button
  type="button"
  onClick={() => {
    console.log('Add Time Slot clicked'); // Debug log
    setShowAddForm(true);
    setEditingId(null); // Make sure we're not in edit mode
    resetAvailabilityForm(); // Reset form to defaults
  }}
  disabled={loading}
  className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
>
  <Plus className="w-4 h-4" />
  Add Time Slot
</button>
            </div>

            <div className="space-y-4">
              {dayNames.map((dayName, dayIndex) => (
                <div key={dayIndex} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">{dayName}</h3>
                  
                  {availabilityByDay[dayIndex] && availabilityByDay[dayIndex].length > 0 ? (
                    <div className="space-y-2">
                      {availabilityByDay[dayIndex].map((slot) => (
                        <div key={slot.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center gap-4">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">
                              {slot.start_time} - {slot.end_time}
                            </span>
                            <span className="text-sm text-gray-600">
                              ({slot.duration_minutes} min slots)
                            </span>
                            {!slot.is_active && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(slot)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAvailability(slot.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No availability set for this day</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Unavailable Dates */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800">Unavailable Dates</h3>
              <button
                onClick={() => setShowUnavailableForm(true)}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors text-sm flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Block Date
              </button>
            </div>
            
            {unavailableDates.length > 0 ? (
              <div className="space-y-2">
                {unavailableDates.map((date) => (
  <div key={date.id} className="bg-red-50 p-3 rounded-lg">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <div className="font-medium text-red-800">
          {new Date(date.unavailable_date).toLocaleDateString()}
        </div>
        {date.start_time && date.end_time && (
          <div className="text-sm text-red-600">
            {date.start_time} - {date.end_time}
          </div>
        )}
        {date.reason && (
          <div className="text-sm text-red-600 mt-1">
            {date.reason}
          </div>
        )}
      </div>
      <button
        onClick={() => handleDeleteUnavailableDate(date.id)}
        className="text-red-600 hover:text-red-800 ml-2"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No blocked dates</p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Schedule Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Time Slots:</span>
                <span className="font-semibold">{availability.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Days:</span>
                <span className="font-semibold">{Object.keys(availabilityByDay).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Blocked Dates:</span>
                <span className="font-semibold">{unavailableDates.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Availability Modal */}
  
{showAddForm && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl max-w-md w-full p-6">
      <h3 className="text-lg font-semibold mb-4">
        {editingId ? 'Edit Time Slot' : 'Add New Time Slot'}
      </h3>
      {/* Rest of your modal content */}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Day of Week
                </label>
                <select
                  value={availabilityForm.day_of_week}
                  onChange={(e) => setAvailabilityForm({
                    ...availabilityForm,
                    day_of_week: parseInt(e.target.value)
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {dayNames.map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={availabilityForm.start_time}
                    onChange={(e) => setAvailabilityForm({
                      ...availabilityForm,
                      start_time: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={availabilityForm.end_time}
                    onChange={(e) => setAvailabilityForm({
                      ...availabilityForm,
                      end_time: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Appointment Duration (minutes)
                </label>
                <select
                  value={availabilityForm.duration_minutes}
                  onChange={(e) => setAvailabilityForm({
                    ...availabilityForm,
                    duration_minutes: parseInt(e.target.value)
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={availabilityForm.is_active}
                  onChange={(e) => setAvailabilityForm({
                    ...availabilityForm,
                    is_active: e.target.checked
                  })}
                  className="mr-2"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Active (available for booking)
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={editingId ? handleUpdateAvailability : handleAddAvailability}
                disabled={loading}
                className="flex-1 bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Update' : 'Add'} Time Slot
              </button>
              <button
                onClick={editingId ? cancelEdit : () => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Unavailable Date Modal */}
      {showUnavailableForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Block Unavailable Date</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={unavailableForm.unavailable_date}
                  onChange={(e) => setUnavailableForm({
                    ...unavailableForm,
                    unavailable_date: e.target.value
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time (optional)
                  </label>
                  <input
                    type="time"
                    value={unavailableForm.start_time}
                    onChange={(e) => setUnavailableForm({
                      ...unavailableForm,
                      start_time: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time (optional)
                  </label>
                  <input
                    type="time"
                    value={unavailableForm.end_time}
                    onChange={(e) => setUnavailableForm({
                      ...unavailableForm,
                      end_time: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={unavailableForm.reason}
                  onChange={(e) => setUnavailableForm({
                    ...unavailableForm,
                    reason: e.target.value
                  })}
                  placeholder="e.g., Conference, Personal leave, Emergency..."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddUnavailableDate}
                disabled={loading}
                className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Block Date
              </button>
              <button
                onClick={() => setShowUnavailableForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAvailabilityManager;