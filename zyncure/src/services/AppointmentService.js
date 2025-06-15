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
    hours = '00';
  }
  if (modifier === 'PM') {
    hours = parseInt(hours, 10) + 12;
  }
  
  return `${hours.padStart(2, '0')}:${minutes}:00`;
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
   * Creates a new appointment
   * @param {object} appointmentData - Appointment details
   * @returns {object} Created appointment data or error
   */
  async createAppointment(appointmentData) {
    try {
      const user = await getCurrentUser();
      const time24h = convertTo24Hour(appointmentData.time);
      
      const appointmentToInsert = {
        patient_id: user.id,
        med_id: appointmentData.doctor_id,
        appointment_date: `${appointmentData.date}T${time24h}`,
        status: appointmentData.status || 'pending',
        reason: appointmentData.reason
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert([appointmentToInsert])
        .select(`
          appointment_id,
          appointment_date,
          status,
          reason,
          created_at,
          updated_at,
          patient_id,
          med_id
        `);

      if (error) throw error;

      // Get doctor information
      const { data: doctorData } = await supabase
        .from('medicalprofessionals')
        .select('first_name, last_name, user_type')
        .eq('med_id', appointmentData.doctor_id)
        .single();

      // Transform data for frontend
      const transformedData = data.map(apt => {
        const { date, time } = formatAppointmentDateTime(apt.appointment_date);
        return {
          id: apt.appointment_id,
          patient_id: apt.patient_id,
          doctor_id: apt.med_id,
          date,
          time,
          status: apt.status,
          reason: apt.reason,
          type: appointmentData.type || 'Consultation',
          doctor_name: doctorData ? `Dr. ${doctorData.first_name} ${doctorData.last_name}` : 'Unknown Doctor',
          specialty: doctorData?.user_type || 'General'
        };
      });

      return { data: transformedData, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  /**
   * Gets appointments for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} patientId - Optional patient ID filter
   * @returns {object} Appointments array or error
   */
  async getAppointments(date, patientId = null) {
    try {
      let query = supabase
        .from('appointment_details')
        .select('*')
        .gte('appointment_date', `${date}T00:00:00`)
        .lt('appointment_date', `${date}T23:59:59`);

      if (patientId) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('patient_id')
          .eq('user_id', patientId)
          .single();

        if (patientData) {
          query = query.eq('patient_id', patientData.patient_id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform data for frontend
      const transformedData = data.map(apt => {
        const { date, time } = formatAppointmentDateTime(apt.appointment_date);
        return {
          id: apt.appointment_id,
          patient_id: apt.patient_id,
          doctor_id: apt.med_id,
          date,
          time,
          status: apt.status,
          reason: apt.reason,
          doctor_name: apt.doctor_name,
          patient_name: apt.patient_name
        };
      });

      return { data: transformedData, error: null };
    } catch (error) {
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

      if (error) throw error;

      // Transform data for frontend
      const transformedData = data.map(apt => {
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
      return { data: [], error: error.message };
    }
  },

/**
 * Gets connected doctors for the current patient using the new database views
 * @returns {object} Connected doctors array or error
 */
async getConnectedDoctors() {
  try {
    // Use the new patient_connection_details view you created
    // The view automatically filters by auth.uid() due to RLS
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
      .eq('status', 'accepted')  // Only get accepted connections
      .order('doctor_first_name');

    if (error) throw error;

    if (!data || data.length === 0) {
      return { data: [], error: null };
    }

    // Transform data for frontend (matching the expected format)
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
    return { data: [], error: error.message };
  }
},

  // /**
  //  * Alternative method to get connected doctors using database view
  //  * @param {string} patientId - Optional patient ID
  //  * @returns {object} Connected doctors array or error
  //  */
  // async getConnectedDoctorsFromView(patientId = null) {
  //   try {
  //     const currentPatientId = patientId || (await getCurrentUser()).id;

  //     const { data, error } = await supabase
  //       .from('connection_details')
  //       .select(`
  //         med_id,
  //         doctor_first_name,
  //         doctor_last_name,
  //         doctor_type,
  //         doctor_email,
  //         status,
  //         doctor_short_id
  //       `)
  //       .eq('patient_id', currentPatientId)
  //       .eq('status', 'accepted')
  //       .order('doctor_first_name');

  //     if (error) throw error;

  //     if (!data || data.length === 0) {
  //       return { data: [], error: null };
  //     }

  //     // Transform data for frontend
  //     const transformedData = data.map(connection => ({
  //       id: connection.med_id,
  //       name: `Dr. ${connection.doctor_first_name} ${connection.doctor_last_name}`,
  //       specialty: connection.doctor_type,
  //       email: connection.doctor_email,
  //       available: true,
  //       shortId: connection.doctor_short_id
  //     }));

  //     return { data: transformedData, error: null };
  //   } catch (error) {
  //     return { data: [], error: error.message };
  //   }
  // },

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

      if (error) throw error;

      // Transform data for frontend
      const transformedData = data.map(apt => {
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

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  /**
   * Gets available time slots for a specific doctor and date
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
        .neq('status', 'cancelled');

      if (error) throw error;

      // Define available time slots
      const allTimeSlots = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
        '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30', '17:00'
      ];

      // Filter out booked slots
      const bookedTimes = existingAppointments.map(apt => 
        new Date(apt.appointment_date).toTimeString().substring(0, 5)
      );

      const availableSlots = allTimeSlots.filter(time => !bookedTimes.includes(time));

      return { data: availableSlots, error: null };
    } catch (error) {
      return { data: [], error: error.message };
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

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
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
          status: 'pending'
        }])
        .select('*');

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  /**
   * Gets patient's connections
   * @param {string} patientId - Optional patient ID
   * @returns {object} Connections array or error
   */
  async getPatientConnections(patientId = null) {
    try {
      const currentPatientId = patientId || (await getCurrentUser()).id;

      const { data, error } = await supabase
        .from('connection_details')
        .select('*')
        .eq('patient_id', currentPatientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: [], error: error.message };
    }
  },

  /**
   * Updates connection status (for medical professionals)
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

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
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

      return userData;
    } catch (err) {
      console.error('Error getting user data:', err.message);
      return null;
    }
  }
};