// Mock data - replace with actual Supabase data
const mockData = {
  doctors: [
    { id: 1, name: 'Dr. Sarah Johnson', specialty: 'Ob-Gyn', available: true },
    { id: 2, name: 'Dr. Michael Chen', specialty: 'Pediatrics', available: true },
    { id: 3, name: 'Dr. Emily Rodriguez', specialty: 'Dermatology', available: true },
    { id: 4, name: 'Dr. James Wilson', specialty: 'Internal Medicine', available: true }
  ],
  appointments: [
    { id: 1, patient_id: 1, doctor_id: 1, date: '2025-06-03', time: '8:00 AM', type: 'Checkup', status: 'confirmed', reason: 'Routine checkup' },
    { id: 2, patient_id: 1, doctor_id: 2, date: '2025-06-03', time: '10:00 AM', type: 'Consultation', status: 'confirmed', reason: 'Follow-up consultation' },
    { id: 3, patient_id: 1, doctor_id: 3, date: '2025-06-05', time: '9:00 AM', type: 'Checkup', status: 'confirmed', reason: 'Skin examination' }
  ]
};

// Supabase integration functions
export const appointmentService = {
  async createAppointment(appointmentData) {
    // Replace with actual Supabase call
    // const { data, error } = await supabase
    //   .from('appointments')
    //   .insert([appointmentData])
    //   .select();
    
    return { 
      data: [{ ...appointmentData, id: Date.now(), patient_id: appointmentData.patient_id }], 
      error: null 
    };
  },
  
  async getAppointments(date, patientId) {
    // Replace with actual Supabase call
    // const { data, error } = await supabase
    //   .from('appointments')
    //   .select('*')
    //   .eq('date', date)
    //   .eq('patient_id', patientId);
    
    return { 
      data: mockData.appointments.filter(apt => apt.date === date && apt.patient_id === patientId), 
      error: null 
    };
  },
  
  async getUserAppointments(patientId) {
    // Replace with actual Supabase call
    // const { data, error } = await supabase
    //   .from('appointments')
    //   .select('*')
    //   .eq('patient_id', patientId);
    
    return { 
      data: mockData.appointments.filter(apt => apt.patient_id === patientId), 
      error: null 
    };
  },
  
  async getDoctors() {
    // Replace with actual Supabase call
    // const { data, error } = await supabase
    //   .from('doctors')
    //   .select('*')
    //   .eq('available', true);
    
    return { data: mockData.doctors, error: null };
  },

  async updateAppointment(appointmentId, updateData) {
    // Replace with actual Supabase call
    // const { data, error } = await supabase
    //   .from('appointments')
    //   .update(updateData)
    //   .eq('id', appointmentId)
    //   .select();
    
    return { 
      data: [{ id: appointmentId, ...updateData }], 
      error: null 
    };
  },

//   async deleteAppointment(appointmentId) {
//     // Replace with actual Supabase call
//     // const { data, error } = await supabase
//     //   .from('appointments')
//     //   .delete()
//     //   .eq('id', appointmentId);
    
//     return { data: null, error: null };
//   }
};

// User service for getting user data
export const userService = {
  async getUserData() {
    try {
      const tokenStr = sessionStorage.getItem("token");
      if (!tokenStr) return null;

      const token = JSON.parse(tokenStr);
      if (!token?.session?.user) return null;

      const { user } = token.session;
      const initialName = user.user_metadata?.first_name || 
                         user.email?.split("@")[0] || 
                         "User";

      let userData = {
        name: initialName,
        id: user.id,
      };

      // Uncomment when you have Supabase set up
      // const { data, error } = await supabase
      //   .from("patients")
      //   .select("full_name, display_name")
      //   .eq("id", user.id)
      //   .single();

      // if (data && !error) {
      //   userData.name = data.full_name || data.display_name || userData.name;
      // }

      return userData;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  }
};