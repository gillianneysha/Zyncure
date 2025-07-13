import { useState, useEffect } from "react";
import Calendar from "../../components/Calendar";
import AppointmentModal from "../../components/AppointmentModal";
import AppointmentList from "../../components/AppointmentList";
import {
  appointmentService,
  userService,
} from "../../services/AppointmentService";
import RescheduleModal from "../../components/RescheduleModal";
import { supabase } from "../../client";

const PersonalAppointmentTracker = () => {
  const [userData, setUserData] = useState({
    name: "User",
    id: "----",
  });

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newAppointment, setNewAppointment] = useState({
    doctor_id: "",
    time: "",
    reason: "",
  });

  // Function to refresh appointments from the database
  const refreshAppointments = async () => {
    if (!userData.id || userData.id === "----") return;

    try {
      const { data: refreshedAppointments, error: refreshError } =
        await appointmentService.getUserAppointments(userData.id);

      if (refreshError) {
        console.error("Error refreshing appointments:", refreshError);
        setError("Failed to refresh appointments");
      } else if (refreshedAppointments) {
        setAppointments(refreshedAppointments);
      }
    } catch (err) {
      console.error("Error refreshing appointments:", err);
      setError("Failed to refresh appointments");
    }
  };

  const getAppointmentStatusDetails = (appointment) => {
    const details = {
      status: appointment.status,
      reason: null,
      actionDate: null,
    };

    if (appointment.status === "cancelled" && appointment.cancellation_reason) {
      details.reason = appointment.cancellation_reason;
      details.actionDate = appointment.updated_at;
    } else if (
      appointment.status === "rescheduled" &&
      appointment.cancellation_reason
    ) {
      details.reason = appointment.cancellation_reason;
      details.actionDate = appointment.updated_at;
    }

    return details;
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        const user = await userService.getUserData();
        if (user) {
          setUserData(user);

          const { data: userAppointments, error: appointmentsError } =
            await appointmentService.getUserAppointments(user.id);

          if (appointmentsError) {
            console.error("Error loading appointments:", appointmentsError);
            setError("Failed to load your appointments");
          } else if (userAppointments) {
            setAppointments(userAppointments);
          }
        }

        const { data: connectedDoctors, error: doctorsError } =
          await appointmentService.getConnectedDoctors();

        if (doctorsError) {
          console.error("Error loading doctors:", doctorsError);
          setError("Failed to load connected doctors");
        } else if (connectedDoctors) {
          setDoctors(connectedDoctors);
        }
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Failed to initialize appointment system");
      } finally {
        setLoading(false);
      }
    };

    // Set up real-time notification subscription
    const setupNotificationSubscription = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error("Error getting user:", error);
          return null;
        }

        if (user?.id) {
          const notificationSubscription = supabase
            .channel("appointment_notifications")
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "notifications",
                filter: `user_id=eq.${user.id}`,
              },
              (payload) => {
                // Show a toast notification or update UI when new notification arrives
                if (payload.new.type.includes("appointment")) {
                  console.log("New appointment notification:", payload.new);
                  // You can add a toast notification here
                }
              }
            )
            .subscribe();

          return notificationSubscription;
        }
      } catch (err) {
        console.error("Error setting up notification subscription:", err);
        return null;
      }
      return null;
    };

    // Initialize data and set up subscription
    initializeData();

    let notificationSubscription = null;
    setupNotificationSubscription().then((subscription) => {
      notificationSubscription = subscription;
    });

    // Cleanup function
    return () => {
      if (notificationSubscription) {
        notificationSubscription.unsubscribe();
      }
    };
  }, []);

  const formatDateForStorage = (date) => {
    // Create a new date object to avoid timezone issues
    const localDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    );
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, "0");
    const day = String(localDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setError("");
  };

  const handleMonthNavigate = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const handleSetAppointment = () => {
    setError("");
    setShowModal(true);
  };

  const handleSubmitAppointment = async () => {
    setError("");
    setLoading(true);

    try {
      if (
        !newAppointment.doctor_id ||
        !newAppointment.time ||
        !newAppointment.reason
      ) {
        setError("Please fill in all required fields");
        return false;
      }

      if (newAppointment.reason.trim().length < 10) {
        setError(
          "Please provide a more detailed reason (at least 10 characters)"
        );
        return false;
      }
      const dateStr = formatDateForStorage(selectedDate);
      const { data: availableSlots, error: slotsError } =
        await appointmentService.getAvailableTimeSlots(
          newAppointment.doctor_id,
          dateStr
        );

      if (slotsError) {
        setError("Failed to verify time slot availability. Please try again.");
        return false;
      }

      if (!availableSlots || !availableSlots.includes(newAppointment.time)) {
        setError(
          "This time slot is no longer available. Please select a different time."
        );
        return false;
      }

      const appointmentData = {
        ...newAppointment,
        date: dateStr,
        status: "confirmed",
        patient_id: userData.id,
      };

      console.log("Submitting appointment:", appointmentData);

      const { data, error: submitError } =
        await appointmentService.createAppointment(appointmentData);

      if (submitError) {
        console.error("Appointment creation error:", submitError);

        if (
          submitError.includes("no longer available") ||
          submitError.includes("time slot") ||
          submitError.includes("conflict")
        ) {
          setError(
            "This time slot was just booked by someone else. Please select a different time."
          );
        } else {
          setError(submitError);
        }
        return false;
      }

      if (data && data.length > 0) {
        console.log("Appointment created successfully:", data[0]);

        setAppointments((prevAppointments) => [...prevAppointments, data[0]]);

        setShowModal(false);
        setNewAppointment({
          doctor_id: "",
          time: "",
          reason: "",
        });

        // Refresh appointments after a short delay
        setTimeout(refreshAppointments, 1000);

        return true;
      } else {
        setError("Failed to create appointment. Please try again.");
        return false;
      }
    } catch (err) {
      console.error("Unexpected error during appointment booking:", err);
      setError("An unexpected error occurred. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError("");
    setNewAppointment({
      doctor_id: "",
      time: "",
      reason: "",
    });
  };

  const handleRescheduleRequest = (appointment) => {
    setAppointmentToReschedule(appointment);
    setShowRescheduleModal(true);
    setError("");
  };

  const handleCancelRequest = async (appointment) => {
    // Check if cancellation is allowed
    if (!canCancelAppointment(appointment)) {
      setError(
        "Appointments can only be cancelled up to 24 hours before the scheduled time."
      );
      return;
    }

    // Get cancellation reason from user
    const cancelReason = prompt(
      "Please provide a reason for cancelling this appointment (optional):"
    );

    if (!window.confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        status: "cancelled",
        cancellation_reason: cancelReason || null,
        updated_at: new Date().toISOString(),
      };

      const { error: cancelError } = await appointmentService.updateAppointment(
        appointment.id,
        updateData
      );

      if (cancelError) {
        setError(`Failed to cancel appointment: ${cancelError}`);
      } else {
        // Update local state with the cancellation reason
        setAppointments((prevAppointments) =>
          prevAppointments.map((apt) =>
            apt.id === appointment.id ? { ...apt, ...updateData } : apt
          )
        );
      }
    } catch (err) {
      console.error("Error cancelling appointment:", err);
      setError("Failed to cancel appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle permanent removal of appointment from the list
  const handlePermanentRemove = (removedAppointment) => {
    setAppointments((prevAppointments) =>
      prevAppointments.filter((apt) => apt.id !== removedAppointment.id)
    );
  };

  const handleRescheduleComplete = (updatedAppointment) => {
    // Update the appointments list with the rescheduled appointment
    setAppointments((prevAppointments) =>
      prevAppointments.map((apt) =>
        apt.id === updatedAppointment.id ? updatedAppointment : apt
      )
    );

    setShowRescheduleModal(false);
    setAppointmentToReschedule(null);
  };

  const handleCloseRescheduleModal = () => {
    setShowRescheduleModal(false);
    setAppointmentToReschedule(null);
    setError("");
  };

  const canCancelAppointment = (appointment) => {
    const now = new Date();
    const appointmentCreatedAt = new Date(appointment.created_at);
    const hoursFromCreation =
      (now.getTime() - appointmentCreatedAt.getTime()) / (1000 * 60 * 60);

    // Allow cancellation only if within 24 hours of creation AND appointment is confirmed
    return appointment.status === "confirmed" && hoursFromCreation <= 24;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-myHeader mb-4 self-start">
        My Appointments
      </h1>

      {/* Global Error Display */}
      {error && !showModal && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="flex gap-8">
        {/* Left Calendar Section */}
        <div className="w-80">
          <Calendar
            currentDate={currentDate}
            selectedDate={selectedDate}
            appointments={appointments}
            onDateSelect={handleDateSelect}
            onMonthNavigate={handleMonthNavigate}
          />

          <button
            onClick={handleSetAppointment}
            disabled={loading || doctors.length === 0}
            className="w-full mt-6 bg-myHeader text-white py-4 px-6 rounded-2xl font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Book New Appointment"}
          </button>

          {doctors.length === 0 && !loading && (
            <p className="text-sm text-amber-600 mt-2 text-center">
              No connected doctors found. Please connect with doctors first.
            </p>
          )}
        </div>

        {/* Right Appointments Section */}
        <div className="flex-1">
          <AppointmentList
            selectedDate={selectedDate}
            appointments={appointments}
            doctors={doctors}
            onRescheduleRequest={handleRescheduleRequest}
            onCancelRequest={handleCancelRequest}
            onPermanentRemove={handlePermanentRemove}
            onRefresh={refreshAppointments}
            canCancelAppointment={canCancelAppointment}
            getAppointmentStatusDetails={getAppointmentStatusDetails} // Add this line
          />
        </div>
      </div>

      {/* Enhanced Appointment Modal */}
      <AppointmentModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmitAppointment}
        selectedDate={selectedDate}
        userData={userData}
        doctors={doctors}
        appointments={appointments}
        newAppointment={newAppointment}
        setNewAppointment={setNewAppointment}
        loading={loading}
        error={error}
        setError={setError}
      />

      {/* Reschedule Modal */}
      <RescheduleModal
        isOpen={showRescheduleModal}
        onClose={handleCloseRescheduleModal}
        appointment={appointmentToReschedule}
        doctors={doctors}
        onRescheduleComplete={handleRescheduleComplete}
      />
    </div>
  );
};

export default PersonalAppointmentTracker;
