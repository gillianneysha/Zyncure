import { supabase } from '../client';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * 
 * @param {string} time24h 
 * @returns {string} 
 */
const convertTo12Hour = (time24h) => {
  const [hours, minutes] = time24h.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes.padStart(2, '0')} ${ampm}`;
};

/**

 * @param {string} appointmentDate 
 * @returns {object} 
 */
const formatAppointmentDateTime = (appointmentDate) => {

  const dateStr = appointmentDate.replace('Z', '').replace(/\.\d{3}/, '');
  const [datePart, timePart] = dateStr.split('T');
  
  return {
    date: datePart,
    time: convertTo12Hour(timePart)
  };
};

/**
 * 
 * @returns {object} 
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
 * @returns {object} 
 */
const getCurrentDoctor = async () => {
  try {
    const user = await getCurrentUser();
    
    console.log('Full user ID:', user.id); 
    

    let { data: doctorData, error } = await supabase
      .from('medicalprofessionals')
      .select('med_id, first_name, last_name, user_type, email, contact_no, createdate')
      .eq('med_id', user.id)
      .single();

    console.log('Direct match result:', { doctorData, error }); 


    if (!doctorData && error) {
      console.log('Trying LIKE pattern match...');
      const userShortId = user.id.substring(0, 8); 
      
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

    
    if (!doctorData && error) {
      console.log('Trying to fetch all doctors and match in JavaScript...');
      const { data: allDoctors, error: allError } = await supabase
        .from('medicalprofessionals')
        .select('med_id, first_name, last_name, user_type, email, contact_no, createdate');

      console.log('All doctors fetch result:', { allDoctors, allError }); 

      if (allDoctors && allDoctors.length > 0) {
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


    if (!doctorData && error) {
      console.log('Checking profiles table as fallback...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('Profile data result:', { profileData, profileError });
      
      if (profileData) {
       
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
   * @returns {object} 
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
   * @param {string} date 
   * @param {string} status 
   * @returns {object} 
   */
  async getDoctorAppointments(date, status = 'all') {
    try {
      const doctorInfo = await getCurrentDoctor();
      
      console.log('Debug - Query params:', {
        date,
        doctorId: doctorInfo.id,
        status
      });

      
      let query = supabase
        .from('appointment_details')
        .select('*')
        .eq('med_id', doctorInfo.id)
        .filter('appointment_date', 'gte', `${date}T00:00:00`)
        .filter('appointment_date', 'lt', `${date}T23:59:59`)
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

      
      const transformedData = (data || []).map(apt => {
        const { time } = formatAppointmentDateTime(apt.appointment_date);
        return {
          id: apt.appointment_id,
          time: time,
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
   * Get appointments for a date range
   * @param {string} startDate 
   * @param {string} endDate 
   * @param {string} status 
   * @returns {object} 
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
   * @param {string} appointmentId 
   * @param {string} newStatus 
   * @returns {object} 
   */
  async updateAppointmentStatus(appointmentId, newStatus) {
    try {
      const user = await getCurrentUser();
      
      
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
   * Reschedule an appointment
   * @param {string} appointmentId 
   * @param {string} reason 
   * @returns {object} 
   */
  async rescheduleAppointment(appointmentId, reason = '') {
    try {
      const user = await getCurrentUser();
      
      
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

   
      if (reason.trim()) {
        updateData.cancellation_reason = reason.trim();
      }

     
      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('appointment_id', appointmentId)
        .select('appointment_id');

      if (error) {
        console.error('Error rescheduling appointment:', error);
        throw error;
      }

      
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
   * @param {string} date 
   * @returns {object} 
   */
  async getAvailableTimeSlots(date) {
    try {
      const user = await getCurrentUser();
      
      
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

     
      const allTimeSlots24h = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
        '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30', '17:00'
      ];

      
      const bookedTimes = (existingAppointments || []).map(apt => {
        const { time } = formatAppointmentDateTime(apt.appointment_date);
        
        const [timeStr, ampm] = time.split(' ');
        let [hours, minutes] = timeStr.split(':');
        
        if (ampm === 'PM' && hours !== '12') {
          hours = (parseInt(hours) + 12).toString();
        } else if (ampm === 'AM' && hours === '12') {
          hours = '00';
        }
        
        return `${hours.padStart(2, '0')}:${minutes}`;
      });

      
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
   * @param {string} appointmentId 
   * @param {string} reason 
   * @returns {object} 
   */
  async cancelAppointment(appointmentId, reason = '') {
    try {
      const user = await getCurrentUser();
      
      
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

     
      if (reason.trim()) {
        updateData.cancellation_reason = reason.trim();
      }

      
      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('appointment_id', appointmentId)
        .select('appointment_id');

      if (error) {
        console.error('Error cancelling appointment:', error);
        throw error;
      }

      
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
   * @param {string} startDate 
   * @param {string} endDate 
   * @returns {object} 
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
   * @param {string} patientId 
   * @returns {object} 
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