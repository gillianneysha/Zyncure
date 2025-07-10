import { supabase } from '../client';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert 12-hour time format to 24-hour format
 * @param {string} time12h - Time in 12-hour format (e.g., "2:30 PM")
 * @returns {string} Time in 24-hour format (e.g., "14:30:00")
 */
// const convertTo24Hour = (time12h) => {
//   const [time, modifier] = time12h.split(' ');
//   let [hours, minutes] = time.split(':');
  
//   if (hours === '12') {
//     hours = modifier === 'AM' ? '00' : '12';
//   } else if (modifier === 'PM') {
//     hours = (parseInt(hours, 10) + 12).toString();
//   }
  
//   return `${hours.padStart(2, '0')}:${minutes}:00`;
// };

/**
 * Convert 24-hour time format to 12-hour format
 * @param {string} time24h - Time in 24-hour format (e.g., "14:30:00")
 * @returns {string} Time in 12-hour format (e.g., "2:30 PM")
 */
const convertTo12Hour = (time24h) => {
  const [hours, minutes] = time24h.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes.padStart(2, '0')} ${ampm}`;
};

/**
 * Format appointment date and time from ISO string
 * @param {string} appointmentDate - ISO date string
 * @returns {object} Object with date and time properties
 */
const formatAppointmentDateTime = (appointmentDate) => ({
  date: appointmentDate.split('T')[0],
  time: new Date(appointmentDate).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  })
});

/**
 * Get current authenticated user
 * @returns {object} Current user object
 */
const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  return user;
};

/**
 * Get current doctor's profile data
 * @returns {object} Doctor profile data
 */
const getCurrentDoctor = async () => {
  try {
    const user = await getCurrentUser();
    
    console.log('Full user ID:', user.id); // Debug log
    
    // Try multiple approaches to find the doctor record
    
    // Approach 1: Direct match with full user ID
    let { data: doctorData, error } = await supabase
      .from('medicalprofessionals')
      .select('med_id, first_name, last_name, user_type, email, contact_no, createdate')
      .eq('med_id', user.id)
      .single();

    console.log('Direct match result:', { doctorData, error }); // Debug log

    // Approach 2: If direct match fails, try with string conversion and LIKE
    if (!doctorData && error) {
      console.log('Trying LIKE pattern match...');
      const userShortId = user.id.substring(0, 8); // Use first 8 characters instead of 4
      
      const { data: doctorDataLike, error: errorLike } = await supabase
        .from('medicalprofessionals')
        .select('med_id, first_name, last_name, user_type, email, contact_no, createdate')
        .filter('med_id', 'like', `${userShortId}%`);

      console.log('LIKE match result:', { doctorDataLike, errorLike, userShortId }); // Debug log

      if (doctorDataLike && doctorDataLike.length > 0) {
        doctorData = doctorDataLike[0];
        error = null;
      } else {
        error = errorLike;
      }
    }

    // Approach 3: If still no match, try searching all records and find match in JavaScript
    if (!doctorData && error) {
      console.log('Trying to fetch all doctors and match in JavaScript...');
      const { data: allDoctors, error: allError } = await supabase
        .from('medicalprofessionals')
        .select('med_id, first_name, last_name, user_type, email, contact_no, createdate');

      console.log('All doctors fetch result:', { allDoctors, allError }); // Debug log

      if (allDoctors && allDoctors.length > 0) {
        // Try to find a match by comparing IDs
        const userShortId = user.id.substring(0, 8);
        doctorData = allDoctors.find(doc => 
          doc.med_id === user.id || 
          doc.med_id.toString().startsWith(userShortId) ||
          user.id.startsWith(doc.med_id.toString().substring(0, 8))
        );
        
        if (doctorData) {
          error = null;
          console.log('Found matching doctor:', doctorData);
        }
      }
    }

    // Approach 4: Check if there's a profiles table as fallback
    if (!doctorData && error) {
      console.log('Checking profiles table as fallback...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('Profile data result:', { profileData, profileError });
      
      if (profileData) {
        // Map profile data to doctor format if it exists
        return {
          id: profileData.id,
          name: `Dr. ${profileData.first_name || 'Unknown'} ${profileData.last_name || 'User'}`,
          firstName: profileData.first_name || 'Unknown',
          lastName: profileData.last_name || 'User',
          email: profileData.email || user.email,
          contact_no: profileData.contact_no || profileData.phone || 'N/A',
          shortId: profileData.id.toString().substring(0, 4)
        };
      }
    }

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!doctorData) {
      throw new Error(`No doctor profile found for user ID: ${user.id}`);
    }

    return {
      id: doctorData.med_id,
      name: `Dr. ${doctorData.first_name} ${doctorData.last_name}`,
      firstName: doctorData.first_name,
      lastName: doctorData.last_name,
      email: doctorData.email,
      contact_no: doctorData.contact_no,
      shortId: doctorData.med_id.toString().substring(0, 4)
    };
  } catch (error) {
    console.error('getCurrentDoctor error:', error);
    throw error;
  }
};

// =============================================================================
// DOCTOR APPOINTMENT SERVICE
// =============================================================================

export const doctorAppointmentService = {
  /**
   * Get doctor's profile information
   * @returns {object} Doctor profile data
   */
  async getDoctorProfile() {
    try {
      const doctorData = await getCurrentDoctor();
      return { data: doctorData, error: null };
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
      return { data: null, error: error.message };
    }
  },

/**
 * Get all appointments for the logged-in doctor for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} status - Filter by status ('all', 'confirmed', 'pending', 'cancelled', 'completed')
 * @returns {object} Appointments data and error
 */
async getDoctorAppointments(date, status = 'all') {
  try {
    const doctorInfo = await getCurrentDoctor();
    
    console.log('Debug - Query params:', {
      date,
      doctorId: doctorInfo.id,
      status
    });

    // Fix: Construct date range without timezone conversion
    const startDate = `${date}T00:00:00`;
    const endDate = `${date}T23:59:59`;

    console.log('Debug - Date range:', {
      startDate,
      endDate
    });

    let query = supabase
      .from('appointment_details')
      .select('*')
      .eq('med_id', doctorInfo.id)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)
      .order('appointment_date');

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    console.log('Debug - Query result:', {
      appointmentsFound: data?.length || 0,
      error: error?.message
    });

    if (error) {
      throw error;
    }

    // Transform the data
    const transformedData = (data || []).map(apt => {
      const appointmentDate = new Date(apt.appointment_date);
      return {
        id: apt.appointment_id,
        time: appointmentDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        patient_name: apt.patient_name,
        patient_id: apt.patient_id,
        patient_email: apt.patient_email,
        type: 'Consultation',
        status: apt.status,
        reason: apt.reason,
        created_at: apt.created_at,
        updated_at: apt.updated_at,
        doctor_name: apt.doctor_name,
        doctor_email: apt.doctor_email
      };
    });

    console.log('Debug - Transformed data:', {
      transformedCount: transformedData.length,
      firstAppointment: transformedData[0]
    });

    return { data: transformedData, error: null };
    
  } catch (error) {
    console.error('Error in getDoctorAppointments:', error);
    return { data: [], error: error.message };
  }
},
  /**
 **
 * Get appointments for a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {string} status - Filter by status
 * @returns {object} Appointments data and error
 */
async getDoctorAppointmentsByDateRange(startDate, endDate, status = 'all') {
  try {
    const doctorInfo = await getCurrentDoctor();
    
    let query = supabase
      .from('appointment_details')
      .select('*')
      .eq('med_id', doctorInfo.id)
      .gte('appointment_date', `${startDate}T00:00:00`)
      .lte('appointment_date', `${endDate}T23:59:59`)
      .order('appointment_date');

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching doctor appointments by date range:', error);
      throw error;
    }

    const transformedData = (data || []).map(apt => {
      const { date: appointmentDate, time } = formatAppointmentDateTime(apt.appointment_date);
      return {
        id: apt.appointment_id,
        date: appointmentDate,
        time,
        patient_name: apt.patient_name,
        patient_id: apt.patient_id,
        patient_email: apt.patient_email,
        type: 'Consultation',
        status: apt.status,
        reason: apt.reason,
        created_at: apt.created_at,
        updated_at: apt.updated_at,
        doctor_name: apt.doctor_name,
        doctor_email: apt.doctor_email
      };
    });

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Error in getDoctorAppointmentsByDateRange:', error);
    return { data: [], error: error.message };
  }
},

  /**
   * Update appointment status
   * @param {string} appointmentId - Appointment ID
   * @param {string} newStatus - New status ('confirmed', 'pending', 'cancelled', 'completed')
   * @returns {object} Updated appointment data and error
   */
  async updateAppointmentStatus(appointmentId, newStatus) {
    try {
      const user = await getCurrentUser();
      
      // First verify that this appointment belongs to the current doctor using the view
      const { data: appointment, error: fetchError } = await supabase
        .from('appointment_details')
        .select('med_id')
        .eq('appointment_id', appointmentId)
        .single();

      if (fetchError || !appointment) {
        throw new Error('Appointment not found');
      }

      if (appointment.med_id !== user.id) {
        throw new Error('Unauthorized: This appointment does not belong to you');
      }

      // Update the appointment status in the original appointments table
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('appointment_id', appointmentId)
        .select('appointment_id');

      if (error) {
        console.error('Error updating appointment status:', error);
        throw error;
      }

      // Fetch updated appointment details from the view
      const { data: updatedAppointment, error: updatedError } = await supabase
        .from('appointment_details')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single();

      if (updatedError) {
        throw updatedError;
      }

      const { date, time } = formatAppointmentDateTime(updatedAppointment.appointment_date);
      const transformedData = {
        id: updatedAppointment.appointment_id,
        date,
        time,
        status: updatedAppointment.status,
        reason: updatedAppointment.reason,
        patient_name: updatedAppointment.patient_name,
        updated_at: updatedAppointment.updated_at
      };

      return { data: transformedData, error: null };
    } catch (error) {
      console.error('Error in updateAppointmentStatus:', error);
      return { data: null, error: error.message };
    }
  },

    /**
   * Cancel an appointment
   * @param {string} appointmentId - Appointment ID
   * @param {string} reason - Cancellation reason (optional)
   * @returns {object} Updated appointment data and error
   */
  async rescheduleAppointment(appointmentId, reason = '') {
    try {
      const user = await getCurrentUser();
      
      // Verify appointment belongs to current doctor using the view
      const { data: appointment, error: fetchError } = await supabase
        .from('appointment_details')
        .select('med_id')
        .eq('appointment_id', appointmentId)
        .single();

      if (fetchError || !appointment) {
        throw new Error('Appointment not found');
      }

      if (appointment.med_id !== user.id) {
        throw new Error('Unauthorized: This appointment does not belong to you');
      }

      const updateData = {
        status: 'rescheduled',
        updated_at: new Date().toISOString()
      };

      // Add cancellation reason if provided
      if (reason.trim()) {
        updateData.cancellation_reason = reason.trim();
      }

      // Update the appointment in the original appointments table
      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('appointment_id', appointmentId)
        .select('appointment_id');

      if (error) {
        console.error('Error rescheduling appointment:', error);
        throw error;
      }

      // Fetch updated appointment details from the view
      const { data: updatedAppointment, error: updatedError } = await supabase
        .from('appointment_details')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single();

      if (updatedError) {
        throw updatedError;
      }

      const { date, time } = formatAppointmentDateTime(updatedAppointment.appointment_date);
      const transformedData = {
        id: updatedAppointment.appointment_id,
        date,
        time,
        status: updatedAppointment.status,
        reason: updatedAppointment.reason,
        patient_name: updatedAppointment.patient_name,
        updated_at: updatedAppointment.updated_at
      };

      return { data: transformedData, error: null };
    } catch (error) {
      console.error('Error in rescheduleAppointment:', error);
      return { data: null, error: error.message };
    }
  },

  
  /**
   * Get available time slots for the doctor on a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {object} Available time slots and error
   */
  async getAvailableTimeSlots(date) {
    try {
      const user = await getCurrentUser();
      
      // Get existing appointments for the date using the view
      const { data: existingAppointments, error } = await supabase
        .from('appointment_details')
        .select('appointment_date')
        .eq('med_id', user.id)
        .gte('appointment_date', `${date}T00:00:00`)
        .lt('appointment_date', `${date}T23:59:59`)
        .in('status', ['confirmed', 'pending'])
        .order('appointment_date');

      if (error) {
        console.error('Error fetching existing appointments:', error);
        throw error;
      }

      // Define all possible time slots (24-hour format)
      const allTimeSlots24h = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
        '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30', '17:00'
      ];

      // Get booked times
      const bookedTimes = (existingAppointments || []).map(apt => 
        new Date(apt.appointment_date).toTimeString().substring(0, 5)
      );

      // Filter available slots and convert to 12-hour format
      const availableSlots24h = allTimeSlots24h.filter(time => !bookedTimes.includes(time));
      const availableSlots12h = availableSlots24h.map(time => convertTo12Hour(time + ':00'));

      return { data: availableSlots12h, error: null };
    } catch (error) {
      console.error('Error in getAvailableTimeSlots:', error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Cancel an appointment
   * @param {string} appointmentId - Appointment ID
   * @param {string} reason - Cancellation reason (optional)
   * @returns {object} Updated appointment data and error
   */
  async cancelAppointment(appointmentId, reason = '') {
    try {
      const user = await getCurrentUser();
      
      // Verify appointment belongs to current doctor using the view
      const { data: appointment, error: fetchError } = await supabase
        .from('appointment_details')
        .select('med_id')
        .eq('appointment_id', appointmentId)
        .single();

      if (fetchError || !appointment) {
        throw new Error('Appointment not found');
      }

      if (appointment.med_id !== user.id) {
        throw new Error('Unauthorized: This appointment does not belong to you');
      }

      const updateData = {
        status: 'cancelled',
        updated_at: new Date().toISOString()
      };

      // Add cancellation reason if provided
      if (reason.trim()) {
        updateData.cancellation_reason = reason.trim();
      }

      // Update the appointment in the original appointments table
      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('appointment_id', appointmentId)
        .select('appointment_id');

      if (error) {
        console.error('Error cancelling appointment:', error);
        throw error;
      }

      // Fetch updated appointment details from the view
      const { data: updatedAppointment, error: updatedError } = await supabase
        .from('appointment_details')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single();

      if (updatedError) {
        throw updatedError;
      }

      const { date, time } = formatAppointmentDateTime(updatedAppointment.appointment_date);
      const transformedData = {
        id: updatedAppointment.appointment_id,
        date,
        time,
        status: updatedAppointment.status,
        reason: updatedAppointment.reason,
        patient_name: updatedAppointment.patient_name,
        updated_at: updatedAppointment.updated_at
      };

      return { data: transformedData, error: null };
    } catch (error) {
      console.error('Error in cancelAppointment:', error);
      return { data: null, error: error.message };
    }
  },

  

  /**
   * Get appointment statistics for the doctor
   * @param {string} startDate - Start date for statistics (optional)
   * @param {string} endDate - End date for statistics (optional)
   * @returns {object} Statistics data and error
   */
  async getAppointmentStats(startDate = null, endDate = null) {
    try {
      const user = await getCurrentUser();
      
      let query = supabase
        .from('appointment_details')
        .select('status, appointment_date')
        .eq('med_id', user.id);

      if (startDate && endDate) {
        query = query
          .gte('appointment_date', `${startDate}T00:00:00`)
          .lt('appointment_date', `${endDate}T23:59:59`);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching appointment stats:', error);
        throw error;
      }

      // Calculate statistics
      const stats = {
        total: data.length,
        confirmed: data.filter(apt => apt.status === 'confirmed').length,
        pending: data.filter(apt => apt.status === 'pending').length,
        cancelled: data.filter(apt => apt.status === 'cancelled').length,
        completed: data.filter(apt => apt.status === 'completed').length
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error in getAppointmentStats:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Get patient details for an appointment
   * @param {string} patientId - Patient ID
   * @returns {object} Patient details and error
   */
  async getPatientDetails(patientId) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          patient_id,
          first_name,
          last_name,
          email,
          contact_no,
          birthdate,
          address,
          created_at
        `)
        .eq('patient_id', patientId)
        .single();

      if (error) {
        console.error('Error fetching patient details:', error);
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in getPatientDetails:', error);
      return { data: null, error: error.message };
    }
  }
};