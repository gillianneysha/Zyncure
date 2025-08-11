import { supabase } from "../client";
import { createNotification } from "../utils/notifications"; // Make sure this is imported

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert 12-hour time format to 24-hour format
 * @param {string} time12h
 * @returns {string}
 */
const convertTo24Hour = (time12h) => {
  const [time, modifier] = time12h.split(" ");
  let [hours, minutes] = time.split(":");

  hours = parseInt(hours, 10);

  if (hours === 12) {
    hours = modifier === "AM" ? 0 : 12;
  } else if (modifier === "PM") {
    hours = hours + 12;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes}:00`;
};

/**
 * Convert 24-hour time format to 12-hour format
 * @param {string} time24h
 * @returns {string}
 */
const convertTo12Hour = (time24h) => {
  const [hours, minutes] = time24h.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes.padStart(2, "0")} ${ampm}`;
};

/**
 * Get current authenticated user
 * @returns {object}
 */
const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("User not authenticated");
  }
  return user;
};

// =============================================================================
// APPOINTMENT SERVICE
// =============================================================================
export const appointmentService = {
  /**
   * Request a new appointment (patients can only request, not confirm)
   * @param {object} appointmentData
   * @returns {object}
   */
  async requestAppointment(appointmentData) {
    try {
      const user = await getCurrentUser();

      // Ensure patient can only create appointments for themselves
      if (
        appointmentData.patient_id &&
        appointmentData.patient_id !== user.id
      ) {
        throw new Error("You can only create appointments for yourself.");
      }

      // Validate required fields
      if (
        !appointmentData.med_id ||
        !appointmentData.requested_date ||
        !appointmentData.requested_time
      ) {
        throw new Error("Doctor, date, and time are required.");
      }

      if (
        !appointmentData.patient_notes ||
        appointmentData.patient_notes.trim().length < 10
      ) {
        throw new Error(
          "Please provide a detailed reason for your visit (at least 10 characters)."
        );
      }

      // Convert time to 24-hour format for consistency
      const normalizedTime = appointmentData.requested_time; // Always use 12-hour format

      // Check if the requested time slot is available (not conflicting with existing appointments)
      const { data: existingAppointments, error: conflictError } =
        await supabase
          .from("appointments")
          .select("appointment_id, status")
          .eq("med_id", appointmentData.med_id)
          .eq("requested_date", appointmentData.requested_date)
          .eq("requested_time", normalizedTime)
          .in("status", ["requested", "confirmed"]);

      if (conflictError) {
        console.error("Error checking appointment conflicts:", conflictError);
        throw new Error("Failed to verify time slot availability.");
      }

      if (existingAppointments && existingAppointments.length > 0) {
        throw new Error(
          "This time slot is already requested or booked. Please select a different time."
        );
      }

      // Check if the time slot falls within doctor's availability
      const availabilityCheck = await this.getDoctorAvailability(
        appointmentData.med_id,
        appointmentData.requested_date,
        appointmentData.requested_time
      );

      if (availabilityCheck.error || !availabilityCheck.data?.available) {
        throw new Error(
          availabilityCheck.data?.reason || "This time slot is not available."
        );
      }

      // Insert appointment request with 'requested' status - NEVER auto-confirm
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          patient_id: user.id,
          med_id: appointmentData.med_id,
          appointment_date: appointmentData.requested_date,
          appointment_time: normalizedTime,
          requested_date: appointmentData.requested_date,
          requested_time: normalizedTime,
          duration_minutes: appointmentData.duration_minutes || 30,
          patient_notes: appointmentData.patient_notes.trim(),
          status: "requested",
          created_at: new Date().toISOString(),
        })
        .select(
          `
  appointment_id,
  appointment_date,
  appointment_time,  
  requested_date,
  requested_time,
  status,
  patient_notes,
  duration_minutes,
  patient_id,
  med_id,
  created_at
`
        )
        .single();

      if (error) {
        console.error("Error creating appointment request:", error);

        // Handle specific error cases
        if (error.code === "23505") {
          // Unique violation
          throw new Error(
            "This time slot was just requested by someone else. Please select a different time."
          );
        }

        throw new Error(
          error.message ||
            "Failed to submit appointment request. Please try again."
        );
      }

      if (!data) {
        throw new Error(
          "Appointment request submission failed. Please try again."
        );
      }

      // Get doctor information for the response
      const { data: doctorInfo, error: doctorError } = await supabase
        .from("medicalprofessionals")
        .select("first_name, last_name, user_type")
        .eq("med_id", appointmentData.med_id)
        .single();

      if (doctorError) {
        console.warn("Could not fetch doctor information:", doctorError);
      }

      // Transform data for consistent format
      const transformedData = [
        {
          id: data.appointment_id,
          patient_id: data.patient_id,
          doctor_id: data.med_id,
          med_id: data.med_id,
          requested_date: data.requested_date,
          requested_time: data.requested_time,
          date: data.requested_date,
          time: data.requested_time,
          status: data.status,
          reason: data.patient_notes,
          patient_notes: data.patient_notes,
          duration_minutes: data.duration_minutes,
          doctor_name: doctorInfo
            ? `Dr. ${doctorInfo.first_name} ${doctorInfo.last_name}`
            : "Unknown Doctor",
          specialty: doctorInfo?.user_type || "Unknown",
          created_at: data.created_at,
        },
      ];

      // First convert the time to 12-hour format if needed
      const displayTime =
        data.requested_time.includes("AM") || data.requested_time.includes("PM")
          ? data.requested_time
          : convertTo12Hour(data.requested_time);

      const appointmentDateTime = `${data.requested_date}T${data.requested_time}`;

      await createNotification(
        appointmentData.med_id,
        "appointment_requested",
        "New Appointment Request",
        `A patient has requested an appointment for ${data.requested_date} at ${displayTime}`,
        {
          appointment_id: data.appointment_id,
          patient_id: user.id,
          appointment_date: appointmentDateTime,
          reason: data.patient_notes,
        }
      );

      return { data: transformedData, error: null };
    } catch (error) {
      console.error("Appointment request error:", error);
      return { data: null, error: error.message };
    }
  },
  // Add this inside the appointmentService object, before the last closing brace

  /**
   * Get list of doctors connected to the current patient
   * @returns {object}
   */
  async getConnectedDoctors() {
    try {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from("connections")
        .select(
          `
        med_id,
        medicalprofessionals!inner (
          first_name,
          last_name,
          user_type
        )
      `
        )
        .eq("patient_id", user.id)
        .eq("status", "accepted");

      if (error) {
        console.error("Error fetching connected doctors:", error);
        return { data: [], error: error.message };
      }

      // Transform the data into the expected format
      const transformedData = (data || []).map((connection) => ({
        id: connection.med_id,
        name: `${connection.medicalprofessionals.first_name} ${connection.medicalprofessionals.last_name}`,
        type: connection.medicalprofessionals.user_type,
      }));

      return { data: transformedData, error: null };
    } catch (error) {
      console.error("Error in getConnectedDoctors:", error);
      return { data: [], error: error.message };
    }
  },
  /**
   * Get doctor's availability for a specific day of week (for modal time slot generation)
   * @param {string} doctorId
   * @param {number} dayOfWeek - 0 = Sunday, 1 = Monday, etc.
   * @returns {object}
   */
  async getDoctorAvailability(doctorId, date, time = null) {
    try {
      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Get doctor's general availability for this day of week
      const { data: availability, error: availabilityError } = await supabase
        .from("doctor_availability")
        .select("*")
        .eq("med_id", doctorId)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true)
        .order("start_time");

      if (availabilityError) {
        console.error("Error fetching doctor availability:", availabilityError);
        return {
          data: {
            available: false,
            reason: "Could not verify doctor availability",
          },
          error: availabilityError.message,
        };
      }

      // Check if doctor has any unavailable dates for this specific date
      const { data: unavailableDates, error: unavailableError } = await supabase
        .from("doctor_unavailable_dates")
        .select("*")
        .eq("med_id", doctorId)
        .eq("unavailable_date", date);

      if (unavailableError) {
        console.error("Error checking unavailable dates:", unavailableError);
        return {
          data: {
            available: false,
            reason: "Could not verify doctor availability",
          },
          error: unavailableError.message,
        };
      }

      // If doctor is completely unavailable on this date
      if (unavailableDates && unavailableDates.length > 0) {
        const unavailableDate = unavailableDates[0];
        if (!unavailableDate.start_time && !unavailableDate.end_time) {
          return {
            data: {
              available: false,
              reason:
                unavailableDate.reason ||
                "Doctor is not available on this date",
              slots: [],
            },
            error: null,
          };
        }
      }

      // If no availability set for this day of week
      if (!availability || availability.length === 0) {
        return {
          data: {
            available: true, // Changed from false to true
            reason: "Doctor has no scheduled availability for this day",
            slots: [],
          },
          error: null,
        };
      }

      // If checking specific time
      if (time) {
        const requestedTime =
          time.includes("AM") || time.includes("PM")
            ? convertTo24Hour(time)
            : time;

        const [requestedHour, requestedMinute] = requestedTime
          .split(":")
          .map(Number);
        const requestedMinutes = requestedHour * 60 + requestedMinute;

        // Check if requested time falls within any availability slot
        let isWithinAvailability = false;
        let matchingSlot = null;

        for (const slot of availability) {
          const [startHour, startMinute] = slot.start_time
            .split(":")
            .map(Number);
          const [endHour, endMinute] = slot.end_time.split(":").map(Number);
          const startMinutes = startHour * 60 + startMinute;
          const endMinutes = endHour * 60 + endMinute;

          if (
            requestedMinutes >= startMinutes &&
            requestedMinutes < endMinutes
          ) {
            // Check if it aligns with appointment slots (duration intervals)
            const minutesFromStart = requestedMinutes - startMinutes;
            if (minutesFromStart % slot.duration_minutes === 0) {
              isWithinAvailability = true;
              matchingSlot = slot;
              break;
            }
          }
        }

        if (!isWithinAvailability) {
          return {
            data: {
              available: false,
              reason: "Requested time is outside doctor's availability hours",
            },
            error: null,
          };
        }

        // Check for existing appointments at this time
        const { data: existingAppointments, error: appointmentsError } =
          await supabase
            .from("appointments")
            .select("appointment_id, status")
            .eq("med_id", doctorId)
            .eq("appointment_date", date)
            .eq("requested_time", requestedTime)
            .in("status", ["requested", "confirmed"]);

        if (appointmentsError) {
          console.error(
            "Error checking existing appointments:",
            appointmentsError
          );
          return {
            data: {
              available: false,
              reason: "Could not verify appointment conflicts",
            },
            error: appointmentsError.message,
          };
        }

        if (existingAppointments && existingAppointments.length > 0) {
          return {
            data: {
              available: false,
              reason: "Time slot is already requested or booked",
            },
            error: null,
          };
        }

        return {
          data: {
            available: true,
            duration: matchingSlot?.duration_minutes || 30,
          },
          error: null,
        };
      }

      // Return general availability information with slots array
      return {
        data: {
          available: true,
          slots: availability || [], // Ensure slots is always an array
        },
        error: null,
      };
    } catch (error) {
      console.error("Error in getDoctorAvailability:", error);
      return {
        data: {
          available: false,
          reason: "System error occurred",
          slots: [], // Add empty slots for error case
        },
        error: error.message,
      };
    }
  },

  /**
   * Get available time slots for a doctor on a specific date
   * @param {string} doctorId
   * @param {string} date
   * @returns {object}
   */
  async getAvailableTimeSlots(doctorId, date) {
    try {
      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.getDay();

      // Get doctor's availability for this day
      const { data: availability, error: availabilityError } = await supabase
        .from("doctor_availability")
        .select("*")
        .eq("med_id", doctorId)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true)
        .order("start_time");

      if (availabilityError) {
        console.error("Error fetching availability:", availabilityError);
        return { data: [], error: availabilityError.message };
      }

      if (!availability || availability.length === 0) {
        return { data: [], error: null };
      }

      // Check for unavailable dates
      const { data: unavailableDates } = await this.getDoctorUnavailableDates(
        doctorId,
        date
      );
      if (unavailableDates && unavailableDates.length > 0) {
        const unavailableDate = unavailableDates[0];
        if (!unavailableDate.start_time && !unavailableDate.end_time) {
          return { data: [], error: null }; // Completely unavailable
        }
      }

      // Generate time slots from availability
      const allSlots = [];
      availability.forEach((slot) => {
        const startTime = new Date(`2000-01-01T${slot.start_time}`);
        const endTime = new Date(`2000-01-01T${slot.end_time}`);
        const duration = slot.duration_minutes || 30;

        let currentTime = new Date(startTime);
        while (currentTime < endTime) {
          const time24 = currentTime.toTimeString().slice(0, 5); // HH:MM format
          const time12 = convertTo12Hour(time24);

          allSlots.push({
            time24: time24,
            time12: time12,
            duration: duration,
          });

          currentTime.setMinutes(currentTime.getMinutes() + duration);
        }
      });

      // Get existing appointments for this date
      const { data: existingAppointments, error: appointmentsError } =
        await supabase
          .from("appointments")
          .select("appointment_id, requested_time, status")
          .eq("med_id", doctorId)
          .eq("requested_date", date)
          .in("status", ["requested", "confirmed"]);

      if (appointmentsError) {
        console.error(
          "Error fetching existing appointments:",
          appointmentsError
        );
        return { data: [], error: appointmentsError.message };
      }

      // Filter out booked slots
      const bookedTimes = (existingAppointments || []).map(
        (apt) => apt.requested_time
      );
      const availableSlots = allSlots.filter(
        (slot) => !bookedTimes.includes(slot.time24)
      );

      // Return slots in 12-hour format for display
      return {
        data: availableSlots.map((slot) => ({
          time: slot.time12,
          value: slot.time12, // For form values
          duration: slot.duration,
        })),
        error: null,
      };
    } catch (error) {
      console.error("Error in getAvailableTimeSlots:", error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Get appointments for a specific date and doctor (for checking conflicts)
   * @param {string} date
   * @param {string} doctorId
   * @returns {object}
   */
  async getAppointments(date, doctorId = null) {
    try {
      let query = supabase
        .from("appointments")
        .select(
          `
          appointment_id,
          requested_date,
          requested_time,
          status,
          patient_notes,
          duration_minutes,
          patient_id,
          med_id
        `
        )
        .eq("appointment_date", date)
        .in("status", ["requested", "confirmed"])
        .order("requested_time");

      if (doctorId) {
        query = query.eq("med_id", doctorId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching appointments:", error);
        return { data: [], error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error("Error in getAppointments:", error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Get doctor's unavailable dates
   * @param {string} doctorId
   * @param {string} date
   * @returns {object}
   */
  async getDoctorUnavailableDates(doctorId, date) {
    try {
      const { data, error } = await supabase
        .from("doctor_unavailable_dates")
        .select("*")
        .eq("med_id", doctorId)
        .eq("unavailable_date", date);

      if (error) {
        console.error("Error fetching unavailable dates:", error);
        return { data: [], error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error("Error in getDoctorUnavailableDates:", error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Get all appointments for a user with optional filtering
   * @param {string} [userId] - Optional user ID, defaults to current user
   * @param {object} [options] - Optional query parameters
   * @param {string[]} [options.status] - Filter by status
   * @param {Date} [options.startDate] - Filter appointments after this date
   * @param {number} [options.limit] - Maximum number of results
   * @returns {Promise<{data: Array, error: string|null}>}
   */
  async getUserAppointments(userId = null, options = {}) {
    try {
      const currentUserId = userId || (await getCurrentUser()).id;

      let query = supabase
        .from("appointments")
        .select(
          `
    appointment_id,
    patient_id,
    med_id,
    appointment_date,
    appointment_time,
    requested_date,
    requested_time,
    status,
    reason,
    patient_notes,
    doctor_notes,
    duration_minutes,
    confirmed_at,
    confirmed_by,
    original_appointment_id,
    rescheduled_by,
    rescheduled_reason,
    cancel_reason,
    cancelled_at,
    cancelled_by,
    created_at,
    updated_at,
    medicalprofessionals!appointments_med_id_fkey (
      first_name,
      last_name,
      user_type
    )
  `
        )
        .eq("patient_id", currentUserId);

      // Apply filters if provided
      if (options.status && Array.isArray(options.status)) {
        query = query.in("status", options.status);
      }

      if (options.startDate) {
        const dateString = options.startDate.toISOString().split("T")[0];
        // Check both appointment_date and requested_date
        query = query.or(
          `appointment_date.gte.${dateString},and(appointment_date.is.null,requested_date.gte.${dateString})`
        );
      }

      // Add pagination/limit if specified
      if (options.limit) {
        query = query.limit(options.limit);
      }

      // Order by date and time - prioritize confirmed appointments, then requested
      query = query
        .order("status", { ascending: false }) // This will put 'requested' before 'confirmed' alphabetically, so we reverse it
        .order("appointment_date", { ascending: true, nullsLast: true })
        .order("requested_date", { ascending: true })
        .order("appointment_time", { ascending: true, nullsLast: true })
        .order("requested_time", { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching user appointments:", error);
        throw new Error(error.message);
      }

      // Transform the data for consistent format
      const transformedData = (data || []).map((apt) => {
        // FIXED: Properly determine which date/time to use based on appointment status
        let finalDate, finalTime;

        if (
          apt.status === "confirmed" &&
          apt.appointment_date &&
          apt.appointment_time
        ) {
          // For confirmed appointments, use the confirmed date/time
          finalDate = apt.appointment_date;
          finalTime = apt.appointment_time;
        } else {
          // For requested/other appointments, use requested date/time
          finalDate = apt.requested_date;
          finalTime = apt.requested_time;
        }

        return {
          id: apt.appointment_id,
          patient_id: apt.patient_id,
          doctor_id: apt.med_id,
          med_id: apt.med_id,

          // Keep both sets of date/time for reference
          appointment_date: apt.appointment_date,
          appointment_time: apt.appointment_time
            ? convertTo12Hour(apt.appointment_time)
            : null,
          requested_date: apt.requested_date,
          requested_time: apt.requested_time
            ? convertTo12Hour(apt.requested_time)
            : null,

          // FIXED: Use the appropriate date/time for display
          date: finalDate,
          time: finalTime ? convertTo12Hour(finalTime) : null,

          status: apt.status,
          reason: apt.reason || apt.patient_notes,
          patient_notes: apt.patient_notes,
          doctor_notes: apt.doctor_notes,
          duration_minutes: apt.duration_minutes || 30,
          confirmed_at: apt.confirmed_at,
          confirmed_by: apt.confirmed_by,

          // ADD THESE MISSING FIELDS:
          cancel_reason: apt.cancel_reason,
          cancelled_at: apt.cancelled_at,
          cancelled_by: apt.cancelled_by,

          rescheduling: {
            original_id: apt.original_appointment_id,
            rescheduled_by: apt.rescheduled_by,
            reason: apt.rescheduled_reason,
          },
          rescheduled_reason: apt.rescheduled_reason, // Add this for direct access

          doctor: apt.medicalprofessionals
            ? {
                name: `Dr. ${apt.medicalprofessionals.first_name} ${apt.medicalprofessionals.last_name}`,
                specialty: apt.medicalprofessionals.user_type || "Unknown",
              }
            : {
                name: "Unknown Doctor",
                specialty: "Unknown",
              },
          doctor_name: apt.medicalprofessionals
            ? `Dr. ${apt.medicalprofessionals.first_name} ${apt.medicalprofessionals.last_name}`
            : "Unknown Doctor",
          timestamps: {
            created: apt.created_at,
            updated: apt.updated_at,
          },
        };
      });

      // Sort the transformed data properly - confirmed appointments should show their confirmed date/time
      transformedData.sort((a, b) => {
        const aDate = new Date(
          `${a.date}T${
            (a.time && a.time.includes("AM")) ||
            (a.time && a.time.includes("PM"))
              ? convertTo24Hour(a.time)
              : "00:00"
          }`
        );
        const bDate = new Date(
          `${b.date}T${
            (b.time && b.time.includes("AM")) ||
            (b.time && b.time.includes("PM"))
              ? convertTo24Hour(b.time)
              : "00:00"
          }`
        );
        return aDate - bDate;
      });

      console.log("Transformed appointments:", transformedData);

      return {
        data: transformedData,
        error: null,
      };
    } catch (error) {
      console.error("Error in getUserAppointments:", error);
      return {
        data: [],
        error: error.message,
      };
    }
  },

  /**
   * Update appointment (limited actions for patients)
   * @param {string} appointmentId
   * @param {object} updateData
   * @returns {object}
   */
  async updateAppointment(appointmentId, updateData) {
    try {
      const user = await getCurrentUser();

      // First, verify the appointment belongs to the current user
      const { data: existingAppointment, error: fetchError } = await supabase
        .from("appointments")
        .select("patient_id, status, med_id, requested_date, requested_time")
        .eq("appointment_id", appointmentId)
        .single();

      if (fetchError) {
        console.error("Error fetching appointment:", fetchError);
        return { data: null, error: "Appointment not found" };
      }

      if (existingAppointment.patient_id !== user.id) {
        return {
          data: null,
          error: "You can only modify your own appointments",
        };
      }

      // Prepare update data - patients can update more fields for rescheduling
      const allowedUpdates = {};

      // Handle rescheduling (date and time updates)
      if (updateData.date && updateData.time) {
        // Convert time to 24-hour format if needed
        const normalizedTime =
          updateData.time.includes("AM") || updateData.time.includes("PM")
            ? convertTo24Hour(updateData.time)
            : updateData.time;

        allowedUpdates.requested_date = updateData.date;
        allowedUpdates.requested_time = normalizedTime;
        allowedUpdates.appointment_date = updateData.date;
        allowedUpdates.appointment_time = normalizedTime;

        allowedUpdates.status = "requested";
      }

      // Patients can cancel their own 'requested' appointments
      if (updateData.status === "cancelled") {
        if (existingAppointment.status === "requested") {
          allowedUpdates.status = "cancelled";
          allowedUpdates.cancelled_at = new Date().toISOString();
          allowedUpdates.cancelled_by = user.id;
          allowedUpdates.cancel_reason =
            updateData.cancel_reason || "Cancelled by patient";
        } else {
          return {
            data: null,
            error:
              "Only requested appointments can be cancelled directly. Please contact the doctor to cancel confirmed appointments.",
          };
        }
      }

      if (
        updateData.patient_notes &&
        existingAppointment.status === "requested"
      ) {
        allowedUpdates.patient_notes = updateData.patient_notes;
      }

      if (Object.keys(allowedUpdates).length === 0) {
        return {
          data: null,
          error: "No valid updates provided or appointment cannot be modified",
        };
      }

      allowedUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("appointments")
        .update(allowedUpdates)
        .eq("appointment_id", appointmentId)
        .select(
          `
        appointment_id,
        appointment_date,
        appointment_time,
        requested_date,
        requested_time,
        status,
        patient_notes,
        doctor_notes,
        duration_minutes,
        updated_at,
        cancelled_at,
        cancel_reason,
        confirmed_at,
        med_id,
        medicalprofessionals!appointments_med_id_fkey(first_name, last_name, user_type)
      `
        )
        .single();

      if (error) {
        console.error("Error updating appointment:", error);
        return { data: null, error: error.message };
      }

      // Rest of the function remains the same...
      // (notification logic and data transformation)

      const transformedData = {
        id: data.appointment_id,
        doctor_id: data.med_id,
        requested_date: data.requested_date,
        requested_time: data.requested_time
          ? convertTo12Hour(data.requested_time)
          : null,
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time
          ? convertTo12Hour(data.appointment_time)
          : null,
        date: data.appointment_date || data.requested_date,
        time: data.appointment_time
          ? convertTo12Hour(data.appointment_time)
          : convertTo12Hour(data.requested_time),
        status: data.status,
        reason: data.patient_notes,
        patient_notes: data.patient_notes,
        doctor_notes: data.doctor_notes,
        duration_minutes: data.duration_minutes,
        cancelled_at: data.cancelled_at,
        cancel_reason: data.cancel_reason,
        confirmed_at: data.confirmed_at,
        doctor_name: `Dr. ${data.medicalprofessionals.first_name} ${data.medicalprofessionals.last_name}`,
        updated_at: data.updated_at,
      };

      return { data: [transformedData], error: null }; // Return as array to match expected format
    } catch (error) {
      console.error("Error in updateAppointment:", error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Cancel appointment (patient can only cancel 'requested' appointments)
   * @param {string} appointmentId
   * @param {string} reason
   * @returns {object}
   */
  async cancelAppointment(appointmentId, reason = null) {
    return await this.updateAppointment(appointmentId, {
      status: "cancelled",
      cancel_reason: reason || "Cancelled by patient",
    });
  },

  /**
   * Request reschedule (creates a new appointment request and marks old one as rescheduled)
   * @param {string} originalAppointmentId
   * @param {object} newAppointmentData
   * @param {string} reason
   * @returns {object}
   */
  async requestReschedule(originalAppointmentId, newAppointmentData, reason) {
    try {
      const user = await getCurrentUser();

      // Verify original appointment belongs to user
      const { data: originalAppointment, error: fetchError } = await supabase
        .from("appointments")
        .select("*")
        .eq("appointment_id", originalAppointmentId)
        .eq("patient_id", user.id)
        .single();

      if (fetchError || !originalAppointment) {
        return {
          data: null,
          error: "Original appointment not found or access denied",
        };
      }

      // Check if appointment can be rescheduled
      if (
        ["cancelled", "completed", "no_show"].includes(
          originalAppointment.status
        )
      ) {
        return {
          data: null,
          error:
            "Cannot reschedule cancelled, completed, or no-show appointments",
        };
      }

      // Create new appointment request with reschedule information
      const rescheduleData = {
        ...newAppointmentData,
        med_id: originalAppointment.med_id, // Keep same doctor
        patient_id: user.id,
        original_appointment_id: originalAppointmentId,
        rescheduled_by: user.id,
        rescheduled_reason: reason,
        patient_notes:
          newAppointmentData.patient_notes || originalAppointment.patient_notes,
      };

      const { data: newAppointment, error: createError } =
        await this.requestAppointment(rescheduleData);

      if (createError) {
        return { data: null, error: createError };
      }

      // Mark original appointment as rescheduled
      await this.updateAppointment(originalAppointmentId, {
        status: "rescheduled",
        rescheduled_reason: reason,
      });

      // Notify doctor about reschedule request
      try {
        await supabase.from("notifications").insert({
          user_id: originalAppointment.med_id,
          type: "appointment_rescheduled",
          title: "Appointment Reschedule Request",
          message: `Patient has requested to reschedule their appointment from ${
            originalAppointment.requested_date
          } ${
            originalAppointment.requested_time.includes("AM") ||
            originalAppointment.requested_time.includes("PM")
              ? originalAppointment.requested_time
              : convertTo12Hour(originalAppointment.requested_time)
          } to ${newAppointmentData.requested_date} ${
            newAppointmentData.requested_time
          }`,
          data: {
            original_appointment_id: originalAppointmentId,
            new_appointment_id: newAppointment.data[0].id,
            patient_id: user.id,
            reschedule_reason: reason,
          },
          read: false,
        });
      } catch (notificationError) {
        console.warn(
          "Failed to create reschedule notification:",
          notificationError
        );
      }

      return { data: newAppointment.data[0], error: null };
    } catch (error) {
      console.error("Error in requestReschedule:", error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Delete appointment permanently (only allowed for certain statuses)
   * @param {string} appointmentId
   * @returns {object}
   */
  async deleteAppointment(appointmentId) {
    try {
      const user = await getCurrentUser();

      // Verify appointment belongs to user
      const { data: appointment, error: fetchError } = await supabase
        .from("appointments")
        .select("patient_id, status, med_id, requested_date, requested_time")
        .eq("appointment_id", appointmentId)
        .single();

      if (fetchError) {
        console.error("Error fetching appointment:", fetchError);
        return { data: null, error: "Appointment not found" };
      }

      if (appointment.patient_id !== user.id) {
        return {
          data: null,
          error: "You can only delete your own appointments",
        };
      }

      // Only allow deletion of cancelled or rescheduled appointments
      if (!["cancelled", "rescheduled"].includes(appointment.status)) {
        return {
          data: null,
          error:
            "Only cancelled or rescheduled appointments can be permanently removed",
        };
      }

      const { error: deleteError } = await supabase
        .from("appointments")
        .delete()
        .eq("appointment_id", appointmentId);

      if (deleteError) {
        console.error("Error deleting appointment:", deleteError);
        return { data: null, error: "Failed to delete appointment" };
      }

      return { data: { success: true }, error: null };
    } catch (error) {
      console.error("Error in deleteAppointment:", error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Get appointment details by ID
   * @param {string} appointmentId
   * @returns {object}
   */
  async getAppointmentById(appointmentId) {
    try {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
        appointment_id,
        requested_date,
        requested_time,
        status,
        patient_notes,
        doctor_notes,
        duration_minutes,
        confirmed_at,
        confirmed_by,
        cancelled_at,
        cancelled_by,
        cancel_reason,
        original_appointment_id,
        rescheduled_by,
        rescheduled_reason,
        created_at,
        updated_at,
        patient_id,
        med_id,
        medicalprofessionals!appointments_med_id_fkey(first_name, last_name, user_type)
      `
        )
        .eq("appointment_id", appointmentId)
        .eq("patient_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching appointment:", error);
        return { data: null, error: error.message };
      }

      if (!data) {
        return { data: null, error: "Appointment not found" };
      }

      const transformedData = {
        id: data.appointment_id,
        patient_id: data.patient_id,
        doctor_id: data.med_id,
        med_id: data.med_id,
        requested_date: data.requested_date,
        requested_time: convertTo12Hour(data.requested_time),
        date: data.requested_date,
        time: convertTo12Hour(data.requested_time),
        status: data.status,
        reason: data.patient_notes,
        patient_notes: data.patient_notes,
        doctor_notes: data.doctor_notes,
        duration_minutes: data.duration_minutes,
        confirmed_at: data.confirmed_at,
        confirmed_by: data.confirmed_by,
        cancelled_at: data.cancelled_at,
        cancelled_by: data.cancelled_by,
        cancel_reason: data.cancel_reason,
        original_appointment_id: data.original_appointment_id,
        rescheduled_by: data.rescheduled_by,
        rescheduled_reason: data.rescheduled_reason,
        doctor_name: `Dr. ${data.medicalprofessionals.first_name} ${data.medicalprofessionals.last_name}`,
        specialty: data.medicalprofessionals.user_type,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      return { data: transformedData, error: null };
    } catch (error) {
      console.error("Error in getAppointmentById:", error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Get upcoming appointments for the user
   * @param {number} limit
   * @returns {object}
   */
  async getUpcomingAppointments(limit = 5) {
    try {
      const user = await getCurrentUser();
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
        appointment_id,
        requested_date,
        requested_time,
        status,
        patient_notes,
        doctor_notes,
        duration_minutes,
        confirmed_at,
        med_id,
        medicalprofessionals!appointments_med_id_fkey(first_name, last_name, user_type)
      `
        )
        .eq("patient_id", user.id)
        .gte("requested_date", today)
        .in("status", ["requested", "confirmed"])
        .order("requested_date", { ascending: true })
        .order("requested_time", { ascending: true })
        .limit(limit);

      if (error) {
        console.error("Error fetching upcoming appointments:", error);
        return { data: [], error: error.message };
      }

      const transformedData = (data || []).map((apt) => ({
        id: apt.appointment_id,
        doctor_id: apt.med_id,
        requested_date: apt.requested_date,
        requested_time: convertTo12Hour(apt.requested_time),
        date: apt.requested_date,
        time: convertTo12Hour(apt.requested_time),
        status: apt.status,
        reason: apt.patient_notes,
        patient_notes: apt.patient_notes,
        doctor_notes: apt.doctor_notes,
        duration_minutes: apt.duration_minutes,
        confirmed_at: apt.confirmed_at,
        doctor_name: `Dr. ${apt.medicalprofessionals.first_name} ${apt.medicalprofessionals.last_name}`,
        specialty: apt.medicalprofessionals.user_type,
      }));

      return { data: transformedData, error: null };
    } catch (error) {
      console.error("Error in getUpcomingAppointments:", error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Get appointment history for the user
   * @param {number} offset
   * @param {number} limit
   * @returns {object}
   */
  async getAppointmentHistory(offset = 0, limit = 20) {
    try {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
        appointment_id,
        requested_date,
        requested_time,
        status,
        patient_notes,
        doctor_notes,
        duration_minutes,
        confirmed_at,
        cancelled_at,
        cancel_reason,
        created_at,
        med_id,
        medicalprofessionals!appointments_med_id_fkey(first_name, last_name, user_type)
      `
        )
        .eq("patient_id", user.id)
        .in("status", ["completed", "cancelled", "no_show"])
        .order("requested_date", { ascending: false })
        .order("requested_time", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Error fetching appointment history:", error);
        return { data: [], error: error.message };
      }

      const transformedData = (data || []).map((apt) => ({
        id: apt.appointment_id,
        doctor_id: apt.med_id,
        requested_date: apt.requested_date,
        requested_time: convertTo12Hour(apt.requested_time),
        date: apt.requested_date,
        time: convertTo12Hour(apt.requested_time),
        status: apt.status,
        reason: apt.patient_notes,
        patient_notes: apt.patient_notes,
        doctor_notes: apt.doctor_notes,
        duration_minutes: apt.duration_minutes,
        confirmed_at: apt.confirmed_at,
        cancelled_at: apt.cancelled_at,
        cancel_reason: apt.cancel_reason,
        doctor_name: `Dr. ${apt.medicalprofessionals.first_name} ${apt.medicalprofessionals.last_name}`,
        specialty: apt.medicalprofessionals.user_type,
        created_at: apt.created_at,
      }));

      return { data: transformedData, error: null };
    } catch (error) {
      console.error("Error in getAppointmentHistory:", error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Check if user can reschedule a specific appointment
   * @param {object} appointment
   * @returns {boolean}
   */
  canRescheduleAppointment(appointment) {
    if (["cancelled", "completed", "no_show"].includes(appointment.status)) {
      return false;
    }

    if (appointment.status === "requested") {
      return true;
    }

    if (appointment.status === "confirmed") {
      const appointmentDateTime = new Date(
        `${appointment.requested_date || appointment.date}T${
          appointment.requested_time || appointment.time
        }`
      );
      const now = new Date();
      const hoursUntilAppointment =
        (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      return hoursUntilAppointment > 4;
    }

    return false;
  },

  /**
   * Check if user can cancel a specific appointment
   * @param {object} appointment
   * @returns {boolean}
   */
  canCancelAppointment(appointment) {
    if (["cancelled", "completed", "no_show"].includes(appointment.status)) {
      return false;
    }

    if (appointment.status === "requested") {
      return true;
    }

    if (appointment.status === "confirmed") {
      const appointmentDateTime = new Date(
        `${appointment.requested_date || appointment.date}T${
          appointment.requested_time || appointment.time
        }`
      );
      const now = new Date();
      const hoursUntilAppointment =
        (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      return hoursUntilAppointment > 24;
    }

    return false;
  },
};

// =============================================================================
// USER SERVICE
// =============================================================================
export const userService = {
  /**
   * Get current user data
   * @returns {object}
   */
  async getUserData() {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("Authentication error:", authError);
        return null;
      }

      // Get patient profile data
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("patient_id, first_name, last_name")
        .eq("patient_id", user.id)
        .single();

      if (patientError) {
        console.error("Error fetching patient data:", patientError);
        return {
          id: user.id,
          name: user.email.split("@")[0],
          email: user.email,
        };
      }

      return {
        id: user.id,
        name: `${patientData.first_name} ${patientData.last_name}`,
        firstName: patientData.first_name,
        lastName: patientData.last_name,
        email: user.email,
      };
    } catch (error) {
      console.error("Error in getUserData:", error);
      return null;
    }
  },

  /**
   * Update user profile
   * @param {object} updateData
   * @returns {object}
   */
  async updateUserProfile(updateData) {
    try {
      const user = await getCurrentUser();

      const allowedFields = {
        first_name: updateData.firstName,
        last_name: updateData.lastName,
        phone: updateData.phone,
        emergency_contact: updateData.emergencyContact,
      };

      Object.keys(allowedFields).forEach((key) => {
        if (allowedFields[key] === undefined) {
          delete allowedFields[key];
        }
      });

      if (Object.keys(allowedFields).length === 0) {
        return { data: null, error: "No valid fields to update" };
      }

      const { data, error } = await supabase
        .from("patients")
        .update({
          ...allowedFields,
          updated_at: new Date().toISOString(),
        })
        .eq("patient_id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating profile:", error);
        return { data: null, error: error.message };
      }

      return { data: data, error: null };
    } catch (error) {
      console.error("Error in updateUserProfile:", error);
      return { data: null, error: error.message };
    }
  },
};
