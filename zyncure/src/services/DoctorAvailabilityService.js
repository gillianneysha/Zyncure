import { supabase } from '../client';

// =============================================================================
// DOCTOR AVAILABILITY SERVICE
// =============================================================================

export const doctorAvailabilityService = {
  
  /**
   * Get current user (doctor)
   */
  async getCurrentDoctor() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('User not authenticated');
    }
    return user;
  },

  /**
   * Get doctor's availability schedule
   */
  async getAvailability() {
    try {
      const user = await this.getCurrentDoctor();
      
      const { data, error } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('med_id', user.id)
        .order('day_of_week')
        .order('start_time');

      if (error) {
        console.error('Error fetching availability:', error);
        throw error;
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error in getAvailability:', error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Add new availability slot
   */
  async addAvailability(availabilityData) {
    try {
      const user = await this.getCurrentDoctor();
      
      const { data, error } = await supabase
        .from('doctor_availability')
        .insert({
          med_id: user.id,
          day_of_week: availabilityData.day_of_week,
          start_time: availabilityData.start_time,
          end_time: availabilityData.end_time,
          duration_minutes: availabilityData.duration_minutes,
          is_active: availabilityData.is_active
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding availability:', error);
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in addAvailability:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Update existing availability slot
   */
  async updateAvailability(availabilityId, availabilityData) {
    try {
      const user = await this.getCurrentDoctor();
      
      const { data, error } = await supabase
        .from('doctor_availability')
        .update({
          day_of_week: availabilityData.day_of_week,
          start_time: availabilityData.start_time,
          end_time: availabilityData.end_time,
          duration_minutes: availabilityData.duration_minutes,
          is_active: availabilityData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', availabilityId)
        .eq('med_id', user.id) // Ensure doctor can only update their own availability
        .select()
        .single();

      if (error) {
        console.error('Error updating availability:', error);
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in updateAvailability:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Delete availability slot
   */
  async deleteAvailability(availabilityId) {
    try {
      const user = await this.getCurrentDoctor();
      
      const { error } = await supabase
        .from('doctor_availability')
        .delete()
        .eq('id', availabilityId)
        .eq('med_id', user.id); // Ensure doctor can only delete their own availability

      if (error) {
        console.error('Error deleting availability:', error);
        throw error;
      }

      return { error: null };
    } catch (error) {
      console.error('Error in deleteAvailability:', error);
      return { error: error.message };
    }
  },

  /**
   * Get doctor's unavailable dates
   */
  async getUnavailableDates() {
    try {
      const user = await this.getCurrentDoctor();
      
      const { data, error } = await supabase
        .from('doctor_unavailable_dates')
        .select('*')
        .eq('med_id', user.id)
        .gte('unavailable_date', new Date().toISOString().split('T')[0]) // Only future dates
        .order('unavailable_date');

      if (error) {
        console.error('Error fetching unavailable dates:', error);
        throw error;
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error in getUnavailableDates:', error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Add unavailable date
   */
  async addUnavailableDate(unavailableData) {
    try {
      const user = await this.getCurrentDoctor();
      
      const { data, error } = await supabase
        .from('doctor_unavailable_dates')
        .insert({
          med_id: user.id,
          unavailable_date: unavailableData.unavailable_date,
          start_time: unavailableData.start_time || null,
          end_time: unavailableData.end_time || null,
          reason: unavailableData.reason || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding unavailable date:', error);
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in addUnavailableDate:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Delete unavailable date
   */
  async deleteUnavailableDate(unavailableId) {
    try {
      const user = await this.getCurrentDoctor();
      
      const { error } = await supabase
        .from('doctor_unavailable_dates')
        .delete()
        .eq('id', unavailableId)
        .eq('med_id', user.id);

      if (error) {
        console.error('Error deleting unavailable date:', error);
        throw error;
      }

      return { error: null };
    } catch (error) {
      console.error('Error in deleteUnavailableDate:', error);
      return { error: error.message };
    }
  },

  /**
   * Get available time slots for a specific date
   */
  async getAvailableTimeSlots(date) {
    try {
      const user = await this.getCurrentDoctor();
      const dayOfWeek = new Date(date).getDay();
      
      // Get doctor's availability for this day of week
      const { data: availability, error: availError } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('med_id', user.id)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .order('start_time');

      if (availError) {
        throw availError;
      }

      if (!availability || availability.length === 0) {
        return { data: [], error: null };
      }

      // Check if the date is marked as unavailable
      const { data: unavailableDates, error: unavailError } = await supabase
        .from('doctor_unavailable_dates')
        .select('*')
        .eq('med_id', user.id)
        .eq('unavailable_date', date);

      if (unavailError) {
        throw unavailError;
      }

      // Get existing appointments for this date
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('requested_time, status')
        .eq('med_id', user.id)
        .eq('requested_date', date)
        .in('status', ['requested', 'confirmed']);

      if (apptError) {
        throw apptError;
      }

      // Generate all possible time slots based on availability
      const allSlots = [];
      
      for (const slot of availability) {
        const startTime = new Date(`2000-01-01T${slot.start_time}`);
        const endTime = new Date(`2000-01-01T${slot.end_time}`);
        const duration = slot.duration_minutes;
        
        let currentTime = new Date(startTime);
        
        while (currentTime < endTime) {
          const timeString = currentTime.toTimeString().substring(0, 5);
          
          // Check if this specific time is unavailable
          const isUnavailable = unavailableDates.some(unavail => {
            if (!unavail.start_time || !unavail.end_time) {
              return true; // Whole day is unavailable
            }
            return timeString >= unavail.start_time && timeString < unavail.end_time;
          });
          
          // Check if this time slot is already booked
          const isBooked = appointments.some(appt => appt.requested_time === timeString);
          
          if (!isUnavailable && !isBooked) {
            allSlots.push({
              time: timeString,
              display_time: this.convertTo12Hour(timeString),
              available: true
            });
          }
          
          currentTime.setMinutes(currentTime.getMinutes() + duration);
        }
      }

      return { data: allSlots, error: null };
    } catch (error) {
      console.error('Error in getAvailableTimeSlots:', error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Convert 24-hour time to 12-hour format
   */
  convertTo12Hour(time24h) {
    const [hours, minutes] = time24h.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes.padStart(2, '0')} ${ampm}`;
  },

  /**
   * Check if doctor is available on a specific date and time
   */
  async isDoctorAvailable(date, time) {
    try {
      const user = await this.getCurrentDoctor();
      const dayOfWeek = new Date(date).getDay();
      
      // Check if doctor has availability for this day and time
      const { data: availability, error: availError } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('med_id', user.id)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .lte('start_time', time)
        .gt('end_time', time);

      if (availError) {
        throw availError;
      }

      if (!availability || availability.length === 0) {
        return { available: false, reason: 'Doctor not available at this time' };
      }

      // Check unavailable dates
      const { data: unavailableDates, error: unavailError } = await supabase
        .from('doctor_unavailable_dates')
        .select('*')
        .eq('med_id', user.id)
        .eq('unavailable_date', date);

      if (unavailError) {
        throw unavailError;
      }

      if (unavailableDates && unavailableDates.length > 0) {
        const isUnavailable = unavailableDates.some(unavail => {
          if (!unavail.start_time || !unavail.end_time) {
            return true; // Whole day unavailable
          }
          return time >= unavail.start_time && time < unavail.end_time;
        });
        
        if (isUnavailable) {
          return { available: false, reason: 'Doctor unavailable on this date/time' };
        }
      }

      // Check existing appointments
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('appointment_id')
        .eq('med_id', user.id)
        .eq('requested_date', date)
        .eq('requested_time', time)
        .in('status', ['requested', 'confirmed']);

      if (apptError) {
        throw apptError;
      }

      if (appointments && appointments.length > 0) {
        return { available: false, reason: 'Time slot already booked' };
      }

      return { available: true };
    } catch (error) {
      console.error('Error in isDoctorAvailable:', error);
      return { available: false, reason: error.message };
    }
  }
};