import { useState, useEffect, useCallback } from "react";
import { X, RefreshCw, AlertCircle, Clock, Calendar, User } from "lucide-react";
import { appointmentService } from "../services/AppointmentService";

// ...existing code...
const normalizeTimeFormat = (time) => {
  if (!time) return "";

  // Already in 24-hour format, possibly with seconds
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    // Always return HH:mm
    return time.slice(0, 5);
  }

  // Convert from 12-hour to 24-hour format
  if (time.includes("AM") || time.includes("PM")) {
    const [timePart, period] = time.split(" ");
    let [hours, minutes] = timePart.split(":");
    hours = parseInt(hours);

    if (period === "AM" && hours === 12) hours = 0;
    if (period === "PM" && hours !== 12) hours += 12;

    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  }

  return time;
};
// ...existing code...
const AppointmentModal = ({
  isOpen,
  onClose,
  onSubmit,
  selectedDate,
  userData,
  doctors = [],
  newAppointment,
  setNewAppointment,
  loading: parentLoading = false,
  error: parentError = "",
  setError: setParentError,
}) => {
  const [doctorAvailability, setDoctorAvailability] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [refreshingSlots, setRefreshingSlots] = useState(false);
  const [localError, setLocalError] = useState("");
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  // FIXED: Either add the state variable or remove this line entirely
  // Since conflictingAppointments is not used anywhere, I'm removing this line
  // const [conflictingAppointments, setConflictingAppointments] = useState([]);

  const isLoading = parentLoading || localLoading;
  const displayError = parentError || localError;

  const formatDate = useCallback((date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const getDayOfWeek = useCallback((date) => {
    return date.getDay();
  }, []);

  // Generate time slots based on doctor's availability and filter out unavailable periods
  const generateTimeSlots = useCallback(
    (availability, unavailableDates = []) => {
      const slots = [];

      availability.forEach((slot) => {
        if (!slot.is_active) return;

        const startTime = new Date(`2000-01-01T${slot.start_time}`);
        const endTime = new Date(`2000-01-01T${slot.end_time}`);
        const duration = slot.duration_minutes || 30;

        let currentTime = new Date(startTime);
        while (currentTime < endTime) {
          const time24 = currentTime.toTimeString().slice(0, 5); // "09:00"
          const time12 = currentTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });

          // Check if this time slot falls within any unavailable period
          let isUnavailable = false;
          unavailableDates.forEach((unavailableDate) => {
            if (unavailableDate.start_time && unavailableDate.end_time) {
              const unavailableStart = new Date(
                `2000-01-01T${unavailableDate.start_time}`
              );
              const unavailableEnd = new Date(
                `2000-01-01T${unavailableDate.end_time}`
              );

              // Check if current time slot overlaps with unavailable period
              // We check if the slot starts within the unavailable period
              if (
                currentTime >= unavailableStart &&
                currentTime < unavailableEnd
              ) {
                isUnavailable = true;
                console.log(`Blocking slot ${time24} due to unavailable period ${unavailableDate.start_time} - ${unavailableDate.end_time}`);
              }
            }
          });

          // Only add the slot if it's not in an unavailable period
          if (!isUnavailable) {
            slots.push({
              time: time12,
              time24, // Add this property for comparison
              available: true,
              duration: duration,
            });
          }

          currentTime.setMinutes(currentTime.getMinutes() + duration);
        }
      });

      return slots.sort((a, b) => {
        const timeA = new Date(`2000-01-01 ${a.time24}`);
        const timeB = new Date(`2000-01-01 ${b.time24}`);
        return timeA - timeB;
      });
    },
    []
  );

  const loadDoctorSchedule = useCallback(
    async (showRefreshingIndicator = true) => {
      if (!newAppointment.doctor_id || !selectedDate) {
        setDoctorAvailability([]);
        // FIXED: Removed the setConflictingAppointments call since it's not defined
        return;
      }

      if (showRefreshingIndicator) {
        setRefreshingSlots(true);
      }

      try {
        const dateStr = formatDate(selectedDate);
        const dayOfWeek = getDayOfWeek(selectedDate);

        console.log(
          `Loading schedule for doctor ${newAppointment.doctor_id} on ${dateStr} (day ${dayOfWeek})`
        );

        // FIXED: Use the correct function name
        const availabilityResult =
          await appointmentService.getDoctorAvailability(
            newAppointment.doctor_id,
            dateStr
          );
        // Get existing appointments for this date
        const appointmentsResult = await appointmentService.getAppointments(
          dateStr,
          newAppointment.doctor_id
        );

        // Check for doctor's unavailable dates
        const unavailableDatesResult =
          await appointmentService.getDoctorUnavailableDates(
            newAppointment.doctor_id,
            dateStr
          );

        console.log("Availability result:", availabilityResult); // DEBUG
        console.log("Appointments result:", appointmentsResult); // DEBUG
        console.log("Unavailable dates result:", unavailableDatesResult); // DEBUG

        if (availabilityResult.error) {
          console.error(
            "Error fetching doctor availability:",
            availabilityResult.error
          );
          setLocalError(
            "Failed to load doctor availability. Please try again."
          );
          setDoctorAvailability([]);
          return;
        }

        // Additional check for availability data structure
        if (!availabilityResult.data) {
          console.error("No availability data returned");
          setLocalError("No availability data found for this doctor.");
          setDoctorAvailability([]);
          return;
        }

        // Check if doctor is unavailable on this specific date
        if (
          unavailableDatesResult.data &&
          unavailableDatesResult.data.length > 0
        ) {
          const unavailableDate = unavailableDatesResult.data[0];
          // If it's a full day block (no specific times), show error and return
          if (!unavailableDate.start_time && !unavailableDate.end_time) {
            setLocalError(
              `Doctor is not available on this date. Reason: ${unavailableDate.reason || "Not specified"
              }`
            );
            setDoctorAvailability([]);
            return;
          }
          // If it's a partial block, show info message but continue processing
          if (unavailableDate.start_time && unavailableDate.end_time) {
            console.log(
              `Doctor has partial unavailability: ${unavailableDate.start_time} - ${unavailableDate.end_time}`
            );
            // Clear any existing error since we can still show available slots
            setLocalError("");
          }
        }
        // Handle different data structures from availability service
        let availability = [];
        if (availabilityResult.data?.slots) {
          // When called with specific time, returns { available, slots }
          availability = availabilityResult.data.slots;
        } else if (Array.isArray(availabilityResult.data)) {
          // When called without time, might return array directly
          availability = availabilityResult.data;
        } else if (availabilityResult.data?.available) {
          // Single slot check, no slots to display
          availability = [];
        }

        const existingAppointments = appointmentsResult.data || [];

        console.log("Raw availability result:", availabilityResult); // DEBUG
        console.log("Processed availability:", availability); // DEBUG
        console.log("Existing appointments:", existingAppointments); // DEBUG

        if (availability.length === 0) {
          console.log("No availability found for day of week:", dayOfWeek); // DEBUG
          setLocalError(
            "Doctor has no scheduled availability for this day of the week."
          );
          setDoctorAvailability([]);
          // FIXED: Removed the setConflictingAppointments call since it's not defined
          return;
        }

        // Generate available time slots (filtering out unavailable periods)
        const timeSlots = generateTimeSlots(
          availability,
          unavailableDatesResult.data || []
        );
        console.log("Generated time slots:", timeSlots); // DEBUG

        // Mark slots as unavailable if they conflict with existing appointments

        const updatedSlots = timeSlots.map((slot) => {
          const slotTime24 = normalizeTimeFormat(slot.time24);
          const hasConflict = existingAppointments.some((apt) => {
            const aptTime = normalizeTimeFormat(apt.requested_time || apt.time);
            return (
              aptTime === slotTime24 &&
              ["requested", "confirmed"].includes(apt.status)
            );
          });
          return {
            ...slot,
            available: !hasConflict,
            conflictReason: hasConflict ? "Already booked" : null,
          };
        });

        console.log("Final updated slots:", updatedSlots); // DEBUG

        setDoctorAvailability(updatedSlots);
        // FIXED: Removed the setConflictingAppointments call since it's not defined
        setLocalError("");
        setLastRefreshTime(new Date());

        // Clear selected time if it's no longer available
        if (newAppointment.time) {
          const normalizedSelectedTime = normalizeTimeFormat(
            newAppointment.time
          );
          const selectedSlot = updatedSlots.find(
            (slot) => normalizeTimeFormat(slot.time) === normalizedSelectedTime
          );

          if (!selectedSlot || !selectedSlot.available) {
            setNewAppointment((prev) => ({ ...prev, time: "" }));
            setLocalError(
              "Your selected time is no longer available. Please choose a different time."
            );
          }
        }
      } catch (err) {
        console.error("Error loading doctor schedule:", err);
        setLocalError("Failed to load doctor schedule. Please try again.");
        setDoctorAvailability([]);
        // FIXED: Removed the setConflictingAppointments call since it's not defined
      } finally {
        if (showRefreshingIndicator) {
          setRefreshingSlots(false);
        }
      }
    },
    [
      newAppointment.doctor_id,
      selectedDate,
      formatDate,
      getDayOfWeek,
      generateTimeSlots,
      newAppointment.time,
      setNewAppointment,
    ]
  );
  // Auto-refresh every 30 seconds when modal is open
  useEffect(() => {
    if (!isOpen || !newAppointment.doctor_id) return;

    const interval = setInterval(() => {
      loadDoctorSchedule(false); // Silent refresh
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen, newAppointment.doctor_id, loadDoctorSchedule]);

  // Load schedule when doctor or date changes
  useEffect(() => {
    loadDoctorSchedule();
  }, [loadDoctorSchedule]);

  // Reset time when doctor changes
  useEffect(() => {
    if (newAppointment.doctor_id) {
      setNewAppointment((prev) => ({ ...prev, time: "" }));
      setLocalError("");
    }
  }, [newAppointment.doctor_id, setNewAppointment]);

  // Clear errors when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalError("");
      if (setParentError) {
        setParentError("");
      }
    }
  }, [isOpen, setParentError]);

  const handleSubmit = async () => {
    setLocalError("");
    if (setParentError) {
      setParentError("");
    }

    // Validation
    if (
      !newAppointment.doctor_id ||
      !newAppointment.time ||
      !newAppointment.reason
    ) {
      setLocalError("Please fill in all required fields");
      return;
    }

    if (newAppointment.reason.trim().length < 10) {
      setLocalError(
        "Please provide a more detailed reason (at least 10 characters)"
      );
      return;
    }

    // Check if selected time is still available
    const selectedSlot = doctorAvailability.find(
      (slot) =>
        normalizeTimeFormat(slot.time) ===
        normalizeTimeFormat(newAppointment.time)
    );

    if (!selectedSlot || !selectedSlot.available) {
      setLocalError(
        "Selected time slot is no longer available. Please choose a different time."
      );
      await loadDoctorSchedule();
      return;
    }

    // Check for past dates
    const selectedDateTime = new Date(
      `${formatDate(selectedDate)}T${normalizeTimeFormat(newAppointment.time)}`
    );
    const now = new Date();

    if (selectedDateTime <= now) {
      setLocalError("Cannot request appointments for past dates or times.");
      return;
    }

    setLocalLoading(true);

    try {
      const dateStr = formatDate(selectedDate);

      const [availabilityCheck, appointmentsCheck] = await Promise.all([
        appointmentService.getDoctorAvailability(
          newAppointment.doctor_id,
          dateStr,
          newAppointment.time
        ),
        appointmentService.getAppointments(dateStr, newAppointment.doctor_id),
      ]);

      if (availabilityCheck.error) {
        setLocalError(
          "Failed to verify doctor availability. Please try again."
        );
        return;
      }

      // Check if time slot is still available
      const currentAppointments = appointmentsCheck.data || [];
      const normalizedSelectedTime = normalizeTimeFormat(newAppointment.time);

      const hasConflict = currentAppointments.some((apt) => {
        const aptTime = normalizeTimeFormat(apt.requested_time || apt.time);
        return (
          aptTime === normalizedSelectedTime &&
          ["requested", "confirmed"].includes(apt.status)
        );
      });

      if (hasConflict) {
        setLocalError(
          "This time slot was just requested by someone else. Please select a different time."
        );
        await loadDoctorSchedule();
        return;
      }

      const result = await onSubmit();

      if (result !== false) {
        console.log("Appointment request submitted successfully");
      }
    } catch (err) {
      console.error("Appointment request error:", err);
      setLocalError("Failed to submit appointment request. Please try again.");
    } finally {
      setLocalLoading(false);
    }
  };

  const handleClose = () => {
    setLocalError("");
    setDoctorAvailability([]);
    // FIXED: Removed the setConflictingAppointments call since it's not defined
    setLastRefreshTime(null);
    if (setParentError) {
      setParentError("");
    }
    onClose();
  };

  const handleDoctorChange = (doctorId) => {
    setNewAppointment({
      ...newAppointment,
      doctor_id: doctorId,
      time: "",
    });
    setLocalError("");
  };

  const handleTimeChange = (time) => {
    setNewAppointment({ ...newAppointment, time });
    setLocalError("");
  };

  if (!isOpen) return null;

  // const selectedDoctor = doctors.find(d => d.id === newAppointment.doctor_id);
  const availableSlots = doctorAvailability.filter((slot) => slot.available);
  const unavailableSlots = doctorAvailability.filter((slot) => !slot.available);

  // Check if selected date is in the past
  const isPastDate =
    selectedDate.setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-800">
            Request Appointment
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 p-1"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        {displayError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={20}
                className="text-red-500 mt-0.5 flex-shrink-0"
              />
              <p className="text-red-600 text-sm">{displayError}</p>
            </div>
          </div>
        )}

        {isPastDate && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={20}
                className="text-amber-500 mt-0.5 flex-shrink-0"
              />
              <p className="text-amber-600 text-sm">
                You cannot request appointments for past dates. Please select a
                future date.
              </p>
            </div>
          </div>
        )}

        {/* Appointment Details Card */}
        <div className="mb-6 p-4 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="text-teal-600" size={20} />
            <div>
              <p className="text-sm text-gray-600">
                Requesting appointment for:
              </p>
              <p className="font-semibold text-gray-800">{userData.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="text-teal-600" size={20} />
            <div>
              <p className="text-sm text-gray-600">Date:</p>
              <p className="font-semibold text-gray-800">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Request Process Info */}
          <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle
                size={16}
                className="text-blue-600 mt-0.5 flex-shrink-0"
              />
              <div className="text-xs sm:text-sm text-blue-800">
                <p className="font-medium mb-1">
                  How appointment requests work:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Submit your appointment request</li>
                  <li>Doctor will review your request</li>
                  <li>
                    You'll be notified when confirmed or if changes are needed
                  </li>
                  <li>Confirmed appointments will appear in your schedule</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Doctor *
            </label>
            <select
              value={newAppointment.doctor_id}
              onChange={(e) => handleDoctorChange(e.target.value)}
              className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-base"
              disabled={isLoading || isPastDate}
            >
              <option value="">Choose a doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  Dr. {doctor.name}
                </option>
              ))}
            </select>
            {doctors.length === 0 && (
              <p className="text-sm text-amber-600 mt-2">
                No connected doctors found. Please connect with doctors first.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700">
                Preferred Time *
              </label>
              {newAppointment.doctor_id && (
                <div className="flex items-center gap-2">
                  {lastRefreshTime && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={12} />
                      <span>
                        Updated{" "}
                        {new Date().getTime() - lastRefreshTime.getTime() <
                          60000
                          ? "just now"
                          : `${Math.floor(
                            (new Date().getTime() -
                              lastRefreshTime.getTime()) /
                            60000
                          )}m ago`}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => loadDoctorSchedule(true)}
                    disabled={refreshingSlots}
                    className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-800 disabled:opacity-50"
                  >
                    <RefreshCw
                      size={16}
                      className={refreshingSlots ? "animate-spin" : ""}
                    />
                    Refresh
                  </button>
                </div>
              )}
            </div>

            <select
              value={newAppointment.time}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-base"
              disabled={
                isLoading ||
                !newAppointment.doctor_id ||
                refreshingSlots ||
                isPastDate
              }
            >
              <option value="">
                {!newAppointment.doctor_id
                  ? "Select a doctor first..."
                  : refreshingSlots
                    ? "Loading available times..."
                    : availableSlots.length === 0
                      ? "No available time slots"
                      : "Choose your preferred time..."}
              </option>
              {availableSlots.map((slot) => (
                <option key={slot.time} value={slot.time}>
                  {slot.time} ({slot.duration} min)
                </option>
              ))}
            </select>

            {/* Availability Status */}
            {newAppointment.doctor_id && !refreshingSlots && (
              <div className="mt-3 space-y-2">
                {availableSlots.length > 0 && (
                  <p className="text-sm text-green-600 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    {availableSlots.length} time slot
                    {availableSlots.length !== 1 ? "s" : ""} available
                  </p>
                )}
                {unavailableSlots.length > 0 && (
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    {unavailableSlots.length} slot
                    {unavailableSlots.length !== 1 ? "s" : ""} already booked
                  </p>
                )}
                {doctorAvailability.length === 0 && !refreshingSlots && (
                  <p className="text-sm text-amber-600">
                    Doctor has no scheduled availability for this day.
                  </p>
                )}
              </div>
            )}

            {refreshingSlots && (
              <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                Checking doctor's availability...
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Reason for Visit *
            </label>
            <textarea
              value={newAppointment.reason}
              onChange={(e) =>
                setNewAppointment({ ...newAppointment, reason: e.target.value })
              }
              rows="4"
              className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-base resize-none"
              placeholder="Please describe your symptoms, concerns, or reason for the appointment."
              disabled={isLoading || isPastDate}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">
                {newAppointment.reason.length}/10 minimum characters
              </p>
              {newAppointment.reason.length >= 10 && (
                <p className="text-xs text-green-600">
                  ✓ Sufficient detail provided
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <button
            onClick={handleClose}
            className="flex-1 py-3 px-4 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 px-4 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={
              isLoading ||
              !newAppointment.doctor_id ||
              !newAppointment.time ||
              !newAppointment.reason ||
              newAppointment.reason.trim().length < 10 ||
              refreshingSlots ||
              availableSlots.length === 0 ||
              isPastDate
            }
          >
            {isLoading && <RefreshCw size={16} className="animate-spin" />}
            {isLoading ? "Submitting Request..." : "Submit Request"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AppointmentModal;