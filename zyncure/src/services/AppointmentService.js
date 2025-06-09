import { supabase } from '../client'; // Adjust path as needed

// Supabase integration functions
export const appointmentService = {
  async createAppointment(appointmentData) {
    try {
      // Get current user first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Convert 12-hour format time to 24-hour format for database
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

      const time24h = convertTo24Hour(appointmentData.time);
      
      // Prepare appointment data - using auth.uid() directly as per your policies
      const appointmentToInsert = {
        patient_id: user.id, // Using auth.uid() directly
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

      // Get doctor info separately
      const { data: doctorData } = await supabase
        .from('medicalprofessionals')
        .select('first_name, last_name, user_type')
        .eq('med_id', appointmentData.doctor_id)
        .single();

      // Transform data to match frontend expectations
      const transformedData = data.map(apt => ({
        id: apt.appointment_id,
        patient_id: apt.patient_id,
        doctor_id: apt.med_id,
        date: apt.appointment_date.split('T')[0],
        time: new Date(apt.appointment_date).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        }),
        status: apt.status,
        reason: apt.reason,
        type: appointmentData.type || 'Consultation',
        doctor_name: doctorData ? `Dr. ${doctorData.first_name} ${doctorData.last_name}` : 'Unknown Doctor',
        specialty: doctorData?.user_type || 'General'
      }));

      return { data: transformedData, error: null };
    } catch (error) {
      console.error('Error creating appointment:', error);
      return { data: null, error: error.message };
    }
  },
  
  async getAppointments(date, patientId = null) {
    try {
      let query = supabase
        .from('appointment_details')
        .select('*')
        .gte('appointment_date', `${date}T00:00:00`)
        .lt('appointment_date', `${date}T23:59:59`);

      if (patientId) {
        // Get patient_id from patients table
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

      // Transform data to match frontend expectations
      const transformedData = data.map(apt => ({
        id: apt.appointment_id,
        patient_id: apt.patient_id,
        doctor_id: apt.med_id,
        date: apt.appointment_date.split('T')[0],
        time: new Date(apt.appointment_date).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        }),
        status: apt.status,
        reason: apt.reason,
        doctor_name: apt.doctor_name,
        patient_name: apt.patient_name
      }));

      return { data: transformedData, error: null };
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return { data: [], error: error.message };
    }
  },
  
  async getUserAppointments(userId = null) {
    try {
      // Get current user if userId not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error('User not authenticated');
        }
        currentUserId = user.id;
      }

      // Since patient_id references auth.uid() directly, we can query directly
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

      // Transform data to match frontend expectations
      const transformedData = data.map(apt => ({
        id: apt.appointment_id,
        patient_id: apt.patient_id,
        doctor_id: apt.med_id,
        date: apt.appointment_date.split('T')[0],
        time: new Date(apt.appointment_date).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        }),
        status: apt.status,
        reason: apt.reason,
        type: 'Consultation', // Default type, adjust as needed
        doctor_name: `Dr. ${apt.medicalprofessionals.first_name} ${apt.medicalprofessionals.last_name}`,
        specialty: apt.medicalprofessionals.user_type
      }));

      return { data: transformedData, error: null };
    } catch (error) {
      console.error('Error fetching user appointments:', error);
      return { data: [], error: error.message };
    }
  },
  
  async getDoctors() {
    try {
      const { data, error } = await supabase
        .from('medicalprofessionals')
        .select('med_id, first_name, last_name, user_type, email, status')
        // .eq('status', 'active') // Assuming you want active doctors only
        .order('first_name');

      if (error) throw error;

      // Transform data to match frontend expectations
      const transformedData = data.map(doctor => ({
        id: doctor.med_id,
        name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
        specialty: doctor.user_type,
        email: doctor.email,
        available: doctor.status === 'active'
      }));

      return { data: transformedData, error: null };
    } catch (error) {
      console.error('Error fetching doctors:', error);
      return { data: [], error: error.message };
    }
  },

  async updateAppointment(appointmentId, updateData) {
    try {
      // Prepare update data
      const dataToUpdate = {};
      
      if (updateData.date && updateData.time) {
        // Convert 12-hour format time to 24-hour format for database
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

        const time24h = convertTo24Hour(updateData.time);
        dataToUpdate.appointment_date = `${updateData.date}T${time24h}`;
      }
      
      if (updateData.status) {
        dataToUpdate.status = updateData.status;
      }
      
      if (updateData.reason) {
        dataToUpdate.reason = updateData.reason;
      }

      if (updateData.doctor_id) {
        dataToUpdate.med_id = updateData.doctor_id;
      }

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

      // Transform data to match frontend expectations
      const transformedData = data.map(apt => ({
        id: apt.appointment_id,
        doctor_id: apt.med_id,
        date: apt.appointment_date.split('T')[0],
        time: new Date(apt.appointment_date).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        }),
        status: apt.status,
        reason: apt.reason,
        doctor_name: `Dr. ${apt.medicalprofessionals.first_name} ${apt.medicalprofessionals.last_name}`
      }));

      return { data: transformedData, error: null };
    } catch (error) {
      console.error('Error updating appointment:', error);
      return { data: null, error: error.message };
    }
  },

  async deleteAppointment(appointmentId) {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('appointment_id', appointmentId);

      if (error) throw error;

      return { data: null, error: null };
    } catch (error) {
      console.error('Error deleting appointment:', error);
      return { data: null, error: error.message };
    }
  },

  // Get available time slots for a specific doctor and date
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

      // Define available time slots (you can customize this)
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
      console.error('Error fetching available time slots:', error);
      return { data: [], error: error.message };
    }
  }
};

// User service for getting user data
export const userService = {
  async getUserData() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('User authentication error:', userError);
        return null;
      }

      let userData = {
        name: user.user_metadata?.first_name || 
              user.email?.split("@")[0] || 
              "User",
        id: user.id,
      };

      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("patient_id, first_name, last_name, email, phone")
        .eq("patient_id", user.id)
        .single();

      if (patientData && !patientError) {
        userData = {
          ...userData,
          name: patientData.first_name && patientData.last_name ? `${patientData.first_name} ${patientData.last_name}` : userData.name,
          patient_id: patientData.patient_id,
          email: patientData.email,
          phone: patientData.phone
        };
      }

      return userData;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  }
};