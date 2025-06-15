import { supabase } from '../client';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Converts 12-hour format time to 24-hour format for database storage
 * @param {string} time12h - Time in 12-hour format (e.g., "2:30 PM")
 * @returns {string} Time in 24-hour format (e.g., "14:30:00")
 */
const convertTo24Hour = (time12h) => {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = modifier === 'AM' ? '00' : '12';
  } else if (modifier === 'PM') {
    hours = (parseInt(hours, 10) + 12).toString();
  }
  
  return `${hours.padStart(2, '0')}:${minutes}:00`;
};

/**
 * Converts 24-hour format time to 12-hour format for display
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
 * Formats appointment date for display
 * @param {string} appointmentDate - ISO date string from database
 * @returns {object} Object containing formatted date and time
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
 * Gets current authenticated user
 * @returns {object} User object or throws error if not authenticated
 */
const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  return user;
};

// =============================================================================
// APPOINTMENT SERVICE
// =============================================================================
export const appointmentService = {
  /**
   * Creates a new appointment with enhanced race condition protection
   * @param {object} appointmentData - Appointment details
   * @returns {object} Created appointment data or error
   */
// APPROACH 2: Using the simpler function that returns only appointment ID
async createAppointment(appointmentData) {
  try {
    const user = await getCurrentUser();
    const time24h = convertTo24Hour(appointmentData.time);
    const fullDateTime = `${appointmentData.date}T${time24h}`;

    // Pre-flight check: Verify time slot is still available
    const { data: availableSlots } = await this.getAvailableTimeSlots(
      appointmentData.doctor_id, 
      appointmentData.date
    );
    
    if (!availableSlots || !availableSlots.includes(appointmentData.time)) {
      throw new Error('This time slot is no longer available. Please select a different time.');
    }

    // Use the simpler database function
    const { data: appointmentId, error } = await supabase.rpc('create_appointment_simple', {
      p_patient_id: user.id,
      p_med_id: appointmentData.doctor_id,
      p_appointment_date: fullDateTime,
      p_reason: appointmentData.reason,
      p_status: appointmentData.status || 'confirmed'
    });

    if (error) {
      console.error('Error creating appointment:', error);
      
      if (error.message.includes('time_slot_conflict') || 
          error.message.includes('duplicate key') ||
          error.message.includes('already exists') ||
          error.message.includes('already booked') ||
          error.message.includes('unique_violation')) {
        throw new Error('This time slot was just booked by someone else. Please select a different time.');
      }
      
      if (error.message.includes('Unauthorized')) {
        throw new Error('You are not authorized to create this appointment.');
      }
      
      throw new Error(error.message || 'Failed to create appointment. Please try again.');
    }

    if (!appointmentId) {
      throw new Error('Appointment creation failed. Please try again.');
    }

    // Fetch the created appointment details
    const { data: appointmentDetails, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        appointment_id,
        appointment_date,
        status,
        reason,
        patient_id,
        med_id,
        medicalprofessionals!inner(first_name, last_name, user_type)
      `)
      .eq('appointment_id', appointmentId)
      .single();

    if (fetchError || !appointmentDetails) {
      console.warn('Could not fetch created appointment details:', fetchError);
      // Return basic info if we can't fetch full details
      return {
        data: [{
          id: appointmentId,
          patient_id: user.id,
          doctor_id: appointmentData.doctor_id,
          date: appointmentData.date,
          time: appointmentData.time,
          status: appointmentData.status || 'confirmed',
          reason: appointmentData.reason,
          type: appointmentData.type || 'Consultation'
        }],
        error: null
      };
    }

    // Transform data for frontend
    const { date, time } = formatAppointmentDateTime(appointmentDetails.appointment_date);
    const transformedData = [{
      id: appointmentDetails.appointment_id,
      patient_id: appointmentDetails.patient_id,
      doctor_id: appointmentDetails.med_id,
      date,
      time,
      status: appointmentDetails.status,
      reason: appointmentDetails.reason,
      type: appointmentData.type || 'Consultation',
      doctor_name: `Dr. ${appointmentDetails.medicalprofessionals.first_name} ${appointmentDetails.medicalprofessionals.last_name}`,
      specialty: appointmentDetails.medicalprofessionals.user_type
    }];

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Appointment creation error:', error);
    return { data: null, error: error.message };
  }
},



  /**
   * Gets appointments for a specific date - IMPROVED VERSION
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} doctorId - Optional doctor ID filter
   * @returns {object} Appointments array or error
   */
  async getAppointments(date, doctorId = null) {
    try {
      let query = supabase
        .from('appointments')
        .select(`
          appointment_id,
          appointment_date,
          status,
          reason,
          patient_id,
          med_id,
          medicalprofessionals!inner(first_name, last_name, user_type)
        `)
        .gte('appointment_date', `${date}T00:00:00`)
        .lt('appointment_date', `${date}T23:59:59`)
        .in('status', ['confirmed', 'pending'])
        .order('appointment_date');

      if (doctorId) {
        query = query.eq('med_id', doctorId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }

      // Transform data for frontend
      const transformedData = (data || []).map(apt => {
        const { date, time } = formatAppointmentDateTime(apt.appointment_date);
        return {
          id: apt.appointment_id,
          patient_id: apt.patient_id,
          doctor_id: apt.med_id,
          date,
          time,
          status: apt.status,
          reason: apt.reason,
          type: 'Consultation',
          doctor_name: `Dr. ${apt.medicalprofessionals.first_name} ${apt.medicalprofessionals.last_name}`,
          specialty: apt.medicalprofessionals.user_type
        };
      });

      return { data: transformedData, error: null };
    } catch (error) {
      console.error('Error in getAppointments:', error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Gets all appointments for the current user
   * @param {string} userId - Optional user ID (defaults to current user)
   * @returns {object} User's appointments array or error
   */
  async getUserAppointments(userId = null) {
    try {
      const currentUserId = userId || (await getCurrentUser()).id;

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          appointment_id,
          appointment_date,
          status,
          reason,
          created_at,
          updated_at,
          patient_id,
          med_id,
          medicalprofessionals!inner(first_name, last_name, user_type)
        `)
        .eq('patient_id', currentUserId)
        .order('appointment_date', { ascending: true });

      if (error) {
        console.error('Error fetching user appointments:', error);
        throw error;
      }

      const transformedData = (data || []).map(apt => {
        const { date, time } = formatAppointmentDateTime(apt.appointment_date);
        return {
          id: apt.appointment_id,
          patient_id: apt.patient_id,
          doctor_id: apt.med_id,
          date,
          time,
          status: apt.status,
          reason: apt.reason,
          type: 'Consultation',
          doctor_name: `Dr. ${apt.medicalprofessionals.first_name} ${apt.medicalprofessionals.last_name}`,
          specialty: apt.medicalprofessionals.user_type
        };
      });

      return { data: transformedData, error: null };
    } catch (error) {
      console.error('Error in getUserAppointments:', error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Gets connected doctors for the current patient
   * @returns {object} Connected doctors array or error
   */
  async getConnectedDoctors() {
    try {
      // Use the simplified view
      const { data, error } = await supabase
        .from('patient_connection_details')
        .select(`
          med_id,
          doctor_first_name,
          doctor_last_name,
          doctor_type,
          doctor_email,
          doctor_short_id,
          status
        `)
        .eq('status', 'accepted')
        .order('doctor_first_name');

      if (error) {
        console.error('Error fetching connected doctors:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return { data: [], error: null };
      }

      const transformedData = data.map(connection => ({
        id: connection.med_id,
        name: `Dr. ${connection.doctor_first_name} ${connection.doctor_last_name}`,
        specialty: connection.doctor_type,
        email: connection.doctor_email,
        available: true,
        shortId: connection.doctor_short_id
      }));

      return { data: transformedData, error: null };
    } catch (error) {
      console.error('Error in getConnectedDoctors:', error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Gets available time slots with real-time conflict checking
   * @param {string} doctorId - Doctor's ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {object} Available time slots array or error
   */
  async getAvailableTimeSlots(doctorId, date) {
    try {
      // Get existing appointments for the doctor on that date
      const { data: existingAppointments, error } = await supabase
        .from('appointments')
        .select('appointment_date')
        .eq('med_id', doctorId)
        .gte('appointment_date', `${date}T00:00:00`)
        .lt('appointment_date', `${date}T23:59:59`)
        .in('status', ['confirmed', 'pending'])
        .order('appointment_date');

      if (error) {
        console.error('Error fetching existing appointments:', error);
        throw error;
      }

      // Define available time slots in 24-hour format
      const allTimeSlots24h = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
        '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30', '17:00'
      ];

      // Get booked times in 24-hour format
      const bookedTimes = (existingAppointments || []).map(apt => 
        new Date(apt.appointment_date).toTimeString().substring(0, 5)
      );

      // Filter out booked slots and convert to 12-hour format
      const availableSlots24h = allTimeSlots24h.filter(time => !bookedTimes.includes(time));
      const availableSlots12h = availableSlots24h.map(time => convertTo12Hour(time + ':00'));

      return { data: availableSlots12h, error: null };
    } catch (error) {
      console.error('Error in getAvailableTimeSlots:', error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Updates an existing appointment
   * @param {string} appointmentId - Appointment ID to update
   * @param {object} updateData - Data to update
   * @returns {object} Updated appointment data or error
   */
  async updateAppointment(appointmentId, updateData) {
    try {
      const dataToUpdate = {};
      
      // Handle date and time updates
      if (updateData.date && updateData.time) {
        const time24h = convertTo24Hour(updateData.time);
        dataToUpdate.appointment_date = `${updateData.date}T${time24h}`;
      }
      
      // Handle other field updates
      if (updateData.status) dataToUpdate.status = updateData.status;
      if (updateData.reason) dataToUpdate.reason = updateData.reason;
      if (updateData.doctor_id) dataToUpdate.med_id = updateData.doctor_id;

      const { data, error } = await supabase
        .from('appointments')
        .update(dataToUpdate)
        .eq('appointment_id', appointmentId)
        .select(`
          appointment_id,
          appointment_date,
          status,
          reason,
          updated_at,
          med_id,
          medicalprofessionals!inner(first_name, last_name, user_type)
        `);

      if (error) {
        console.error('Error updating appointment:', error);
        throw error;
      }

      // Transform data for frontend
      const transformedData = (data || []).map(apt => {
        const { date, time } = formatAppointmentDateTime(apt.appointment_date);
        return {
          id: apt.appointment_id,
          doctor_id: apt.med_id,
          date,
          time,
          status: apt.status,
          reason: apt.reason,
          doctor_name: `Dr. ${apt.medicalprofessionals.first_name} ${apt.medicalprofessionals.last_name}`
        };
      });

      return { data: transformedData, error: null };
    } catch (error) {
      console.error('Error in updateAppointment:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Deletes an appointment
   * @param {string} appointmentId - Appointment ID to delete
   * @returns {object} Success status or error
   */
  async deleteAppointment(appointmentId) {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('appointment_id', appointmentId);

      if (error) {
        console.error('Error deleting appointment:', error);
        throw error;
      }
      return { data: null, error: null };
    } catch (error) {
      console.error('Error in deleteAppointment:', error);
      return { data: null, error: error.message };
    }
  }
};

// =============================================================================
// CONNECTION SERVICE
// =============================================================================

export const connectionService = {
  /**
   * Searches for medical professionals by short ID
   * @param {string} shortId - Short ID to search for
   * @returns {object} Search results or error
   */
  async searchDoctorByShortId(shortId) {
    try {
      const { data, error } = await supabase
        .rpc('search_medical_professional_by_short_id', { search_id: shortId });

      if (error) {
        console.error('Error searching doctors:', error);
        throw error;
      }
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error in searchDoctorByShortId:', error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Creates a new connection request
   * @param {string} medId - Medical professional ID
   * @returns {object} Created connection or error
   */
  async createConnection(medId) {
    try {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('connections')
        .insert([{
          patient_id: user.id,
          med_id: medId,
          status: 'pending',
          requester_type: 'patient'
        }])
        .select('*');

      if (error) {
        console.error('Error creating connection:', error);
        throw error;
      }
      return { data, error: null };
    } catch (error) {
      console.error('Error in createConnection:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Gets patient's connections
   * @returns {object} Connections array or error
   */
  async getPatientConnections() {
    try {
      const { data, error } = await supabase
        .from('patient_connection_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching patient connections:', error);
        throw error;
      }
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error in getPatientConnections:', error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Updates connection status
   * @param {string} connectionId - Connection ID
   * @param {string} status - New status ('pending', 'accepted', 'rejected')
   * @returns {object} Updated connection or error
   */
  async updateConnectionStatus(connectionId, status) {
    try {
      const { data, error } = await supabase
        .from('connections')
        .update({ status })
        .eq('id', connectionId)
        .select('*');

      if (error) {
        console.error('Error updating connection status:', error);
        throw error;
      }
      return { data, error: null };
    } catch (error) {
      console.error('Error in updateConnectionStatus:', error);
      return { data: null, error: error.message };
    }
  }
};

// =============================================================================
// USER SERVICE
// =============================================================================

export const userService = {
  /**
   * Gets current user data with patient information
   * @returns {object} User data or null if error
   */
  async getUserData() {
    try {
      const user = await getCurrentUser();
      
      let userData = {
        name: user.user_metadata?.first_name || 
              user.email?.split("@")[0] || 
              "User",
        id: user.id,
      };

      // Try to get additional patient data
      try {
        const { data: patientData, error: patientError } = await supabase
          .from("patients")
          .select("patient_id, first_name, last_name, email, phone")
          .eq("patient_id", user.id)
          .single();

        if (patientData && !patientError) {
          userData = {
            ...userData,
            name: patientData.first_name && patientData.last_name 
              ? `${patientData.first_name} ${patientData.last_name}` 
              : userData.name,
            patient_id: patientData.patient_id,
            email: patientData.email,
            phone: patientData.phone
          };
        }
      } catch (patientErr) {
        console.warn('Could not fetch patient data:', patientErr);
        // Continue with basic user data
      }

      return userData;
    } catch (err) {
      console.error('Error getting user data:', err.message);
      return null;
    }
  }
};