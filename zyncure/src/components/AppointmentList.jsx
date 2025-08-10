import { useState, useEffect } from "react";
import { appointmentService } from "../services/AppointmentService"; // Adjust path as needed

const AppointmentList = ({
  selectedDate,
  appointments = [],
  doctors = [],
  emptyStateMessage = "No appointments scheduled for this date",
  emptyStateSubtext = 'Click "Request New Appointment" to schedule one',
  onRescheduleRequest,
  onCancelRequest,
  onPermanentRemove,
  onRefresh,
  canCancelAppointment,
}) => {
  const [expandedAppointment, setExpandedAppointment] = useState(null);
  const [isRemoving, setIsRemoving] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [appointmentToRemove, setAppointmentToRemove] = useState(null);

  useEffect(() => {
    if (onRefresh) {
      onRefresh();
    }
  }, [selectedDate, onRefresh]);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getStatusConfig = (status) => {
    const configs = {
      requested: {
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: "⏳",
        label: "Pending Confirmation",
        description: "Waiting for doctor's confirmation",
      },
      confirmed: {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: "✓",
        label: "Confirmed",
        description: "Approved by doctor",
      },
      cancelled: {
        color: "bg-red-100 text-red-800 border-red-200",
        icon: "✕",
        label: "Cancelled",
        description: "Appointment was cancelled",
      },
      rescheduled: {
        color: "bg-purple-100 text-purple-800 border-purple-200",
        icon: "📅",
        label: "Rescheduled",
        description: "Moved to different time",
      },
      completed: {
        color: "bg-gray-100 text-gray-800 border-gray-200",
        icon: "✅",
        label: "Completed",
        description: "Appointment finished",
      },
      no_show: {
        color: "bg-orange-100 text-orange-800 border-orange-200",
        icon: "⚠",
        label: "No Show",
        description: "Patient did not attend",
      },
    };
    return configs[status] || configs.requested;
  };

  const canReschedule = (appointment) => {
    // Can reschedule if:
    // 1. Status is requested (before doctor confirmation)
    // 2. Status is confirmed and appointment is in the future
    // 3. Cannot reschedule cancelled, completed, or no_show appointments
    if (["cancelled", "completed", "no_show"].includes(appointment.status)) {
      return false;
    }

    if (appointment.status === "requested") {
      return true; // Can always reschedule before confirmation
    }

    if (appointment.status === "confirmed") {
      const appointmentDateTime = new Date(
        `${appointment.requested_date || appointment.date}T${
          appointment.requested_time || appointment.time
        }`
      );
      return appointmentDateTime > new Date();
    }

    return false;
  };

  const canCancel = (appointment) => {
    // Can cancel if:
    // 1. Status is requested (anytime before confirmation)
    // 2. Status is confirmed and follows the cancellation policy set by canCancelAppointment prop
    if (appointment.status === "requested") {
      return true; // Can always cancel requests before confirmation
    }

    if (appointment.status === "confirmed") {
      return canCancelAppointment ? canCancelAppointment(appointment) : false;
    }

    return false;
  };

  const getTimeUntilAppointment = (appointment) => {
    const now = new Date();
    const appointmentDate =
      appointment.appointment_date ||
      appointment.requested_date ||
      appointment.date;
    const appointmentTime =
      appointment.appointment_time ||
      appointment.requested_time ||
      appointment.time;
    const appointmentDateTime = new Date(
      `${appointmentDate}T${appointmentTime}`
    );
    const diff = appointmentDateTime.getTime() - now.getTime();

    if (diff < 0) return "Past";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days !== 1 ? "s" : ""} away`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""} away`;
    return "Soon";
  };

  const handleRemoveClick = (appointment) => {
    setAppointmentToRemove(appointment);
    setShowConfirmModal(true);
  };

  const handleConfirmRemove = async () => {
    if (!appointmentToRemove) return;

    try {
      setIsRemoving(appointmentToRemove.id);
      setShowConfirmModal(false);

      const { error } = await appointmentService.deleteAppointment(
        appointmentToRemove.id
      );

      if (error) {
        console.error("Error removing appointment:", error);
        alert("Failed to remove appointment. Please try again.");
        return;
      }

      if (onPermanentRemove) {
        onPermanentRemove(appointmentToRemove);
      }

      if (onRefresh) {
        onRefresh();
      }

      console.log("Appointment removed successfully");
    } catch (error) {
      console.error("Error removing appointment:", error);
      alert("Failed to remove appointment. Please try again.");
    } finally {
      setIsRemoving(null);
      setAppointmentToRemove(null);
    }
  };

  const handleCancelRemove = () => {
    setShowConfirmModal(false);
    setAppointmentToRemove(null);
  };

  const selectedDateAppointments = appointments.filter(
    (apt) =>
      (apt.appointment_date || apt.requested_date || apt.date) ===
      formatDate(selectedDate)
  );

  const toggleExpanded = (appointmentId) => {
    setExpandedAppointment(
      expandedAppointment === appointmentId ? null : appointmentId
    );
  };

  return (
    <>
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border">
        <div className="bg-myHeader text-white p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <h2 className="text-lg sm:text-xl font-semibold">My Schedule</h2>
            <span className="text-sm sm:text-lg font-medium mt-1 sm:mt-0">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <p className="text-teal-100 mt-1 text-sm sm:text-base">
            {selectedDateAppointments.length} appointment
            {selectedDateAppointments.length !== 1 ? "s" : ""} scheduled
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {selectedDateAppointments.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-gray-500">
              <p className="text-base sm:text-lg">{emptyStateMessage}</p>
              <p className="text-sm mt-2">{emptyStateSubtext}</p>
            </div>
          ) : (
            selectedDateAppointments.map((appointment) => {
              const doctor = doctors.find(
                (d) =>
                  d.id === appointment.med_id || d.id === appointment.doctor_id
              );
              const statusConfig = getStatusConfig(appointment.status);
              const isExpanded = expandedAppointment === appointment.id;
              const needsAction = ["cancelled", "rescheduled"].includes(
                appointment.status
              );
              const isBeingRemoved = isRemoving === appointment.id;
              const timeUntil = getTimeUntilAppointment(appointment);

              return (
                <div
                  key={appointment.id}
                  className={`transition-all duration-200 ${
                    needsAction
                      ? "bg-red-50 border-l-4 border-l-red-400"
                      : appointment.status === "confirmed"
                      ? "bg-green-50 border-l-4 border-l-green-500"
                      : appointment.status === "requested"
                      ? "bg-blue-50 border-l-4 border-l-blue-500"
                      : "bg-gray-50 border-l-4 border-l-gray-400"
                  }`}
                >
                  <div className="p-4 sm:p-6">
                    {/* Mobile Layout */}
                    <div className="sm:hidden">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="text-gray-600 font-bold text-lg">
                              {appointment.requested_time || appointment.time}
                            </div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color} flex items-center gap-1`}
                            >
                              <span>{statusConfig.icon}</span>
                              {statusConfig.label}
                            </span>
                          </div>
                          <div className="mb-2">
                            <span className="font-semibold text-gray-800 text-base">
                              Dr. {doctor?.name || "Unknown Doctor"}
                            </span>
                            {appointment.status === "confirmed" && (
                              <div className="text-xs text-green-600 mt-1">
                                {timeUntil}
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 pr-2">
                            {appointment.patient_notes || appointment.reason}
                          </div>
                          {appointment.status === "requested" && (
                            <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              Waiting for doctor confirmation
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => toggleExpanded(appointment.id)}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-2 flex-shrink-0"
                          aria-label={
                            isExpanded ? "Collapse details" : "Expand details"
                          }
                        >
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:block">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6 flex-1">
                          <div className="text-gray-600 font-bold text-lg min-w-[100px]">
                            {appointment.requested_time || appointment.time}
                          </div>
                          <div className="flex items-center gap-6 flex-1">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-800 text-lg">
                                Dr. {doctor?.name || "Unknown Doctor"}
                              </span>
                              {appointment.status === "confirmed" && (
                                <span className="text-xs text-green-600">
                                  {timeUntil}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col flex-1">
                              <span className="text-sm text-gray-500 line-clamp-1">
                                {appointment.patient_notes ||
                                  appointment.reason}
                              </span>
                              {appointment.status === "requested" && (
                                <span className="text-xs text-blue-600 mt-1">
                                  Awaiting confirmation
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Status Badge */}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color} flex items-center gap-1`}
                            title={statusConfig.description}
                          >
                            <span>{statusConfig.icon}</span>
                            {statusConfig.label}
                          </span>

                          {/* Expand/Collapse Button */}
                          <button
                            onClick={() => toggleExpanded(appointment.id)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            aria-label={
                              isExpanded ? "Collapse details" : "Expand details"
                            }
                          >
                            <svg
                              className={`w-5 h-5 text-gray-400 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Status-specific Information */}
                    {appointment.status === "requested" && (
                      <div className="mt-4 p-3 sm:p-4 bg-blue-100 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="text-blue-600 mt-0.5 flex-shrink-0">
                            <svg
                              className="w-5 h-5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-blue-800 text-sm sm:text-base">
                              Pending Doctor Confirmation
                            </h4>
                            <p className="text-xs sm:text-sm text-blue-700 mt-1">
                              Your appointment request has been sent to Dr.{" "}
                              {doctor?.name || "the doctor"}. They will review
                              and confirm your appointment soon. You can cancel
                              or reschedule this request anytime before
                              confirmation.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rescheduled Appointment Information */}
                    {appointment.status === "rescheduled" &&
                      appointment.rescheduled_reason && (
                        <div className="mt-4 p-3 sm:p-4 bg-purple-100 border border-purple-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="text-purple-600 mt-0.5 flex-shrink-0">
                              <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-purple-800 text-sm sm:text-base">
                                Appointment Rescheduled by Doctor
                              </h4>
                              <p className="text-xs sm:text-sm text-purple-700 mt-1 font-medium">
                                Reason: {appointment.rescheduled_reason}
                              </p>
                              <p className="text-xs sm:text-sm text-purple-700 mt-1">
                                Please request a new appointment time that works
                                for both you and the doctor.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Action Alert for Cancelled/Rescheduled */}
                    {needsAction && (
                      <div className="mt-4 p-3 sm:p-4 bg-red-100 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="text-red-600 mt-0.5 flex-shrink-0">
                            <svg
                              className="w-5 h-5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-red-800 text-sm sm:text-base">
                              {appointment.status === "cancelled"
                                ? "Appointment Cancelled"
                                : "Appointment Rescheduled"}
                            </h4>
                            <p className="text-xs sm:text-sm text-red-700 mt-1">
                              {appointment.status === "cancelled"
                                ? `This appointment has been cancelled${
                                    appointment.cancel_reason
                                      ? `: ${appointment.cancel_reason}`
                                      : "."
                                  }`
                                : `This appointment has been rescheduled${
                                    appointment.rescheduled_reason ||
                                    appointment.rescheduling?.reason
                                      ? `: ${
                                          appointment.rescheduled_reason ||
                                          appointment.rescheduling?.reason
                                        }`
                                      : "."
                                  }`}
                              <br />
                              {appointment.status === "cancelled"
                                ? "Would you like to request a new appointment or remove it from your schedule?"
                                : "Please request a new time slot or remove it from your schedule."}
                            </p>

                            <div className="mt-2 flex flex-col sm:flex-row gap-2">
                              <button
                                onClick={() =>
                                  onRescheduleRequest?.(appointment)
                                }
                                className="px-3 sm:px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                disabled={isBeingRemoved}
                              >
                                <svg
                                  className="w-4 h-4 flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                Request New Appointment
                              </button>
                              <button
                                onClick={() => handleRemoveClick(appointment)}
                                disabled={isBeingRemoved}
                                className={`px-3 sm:px-4 py-2 text-white text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                  isBeingRemoved
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-red-600 hover:bg-red-700"
                                }`}
                              >
                                {isBeingRemoved ? (
                                  <>
                                    <svg
                                      className="w-4 h-4 animate-spin flex-shrink-0"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      ></circle>
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      ></path>
                                    </svg>
                                    <span className="hidden sm:inline">
                                      Removing...
                                    </span>
                                    <span className="sm:hidden">...</span>
                                  </>
                                ) : (
                                  <>
                                    <svg
                                      className="w-4 h-4 flex-shrink-0"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                    <span className="hidden sm:inline">
                                      Remove from Schedule
                                    </span>
                                    <span className="sm:hidden">Remove</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">
                              Request ID:
                            </span>
                            <span className="ml-2 text-gray-600">
                              #{appointment.appointment_id || appointment.id}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Status:
                            </span>
                            <span className="ml-2 text-gray-600">
                              {statusConfig.description}
                            </span>
                          </div>
                          {appointment.duration_minutes && (
                            <div>
                              <span className="font-medium text-gray-700">
                                Duration:
                              </span>
                              <span className="ml-2 text-gray-600">
                                {appointment.duration_minutes} minutes
                              </span>
                            </div>
                          )}
                          {appointment.confirmed_at && (
                            <div>
                              <span className="font-medium text-gray-700">
                                Confirmed:
                              </span>
                              <span className="ml-2 text-gray-600">
                                {new Date(
                                  appointment.confirmed_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          <div className="md:col-span-2">
                            <span className="font-medium text-gray-700">
                              Reason for Visit:
                            </span>
                            <p className="mt-1 text-gray-600">
                              {appointment.patient_notes || appointment.reason}
                            </p>
                          </div>
                          {appointment.doctor_notes && (
                            <div className="md:col-span-2">
                              <span className="font-medium text-gray-700">
                                Doctor's Notes:
                              </span>
                              <p className="mt-1 text-gray-600 bg-blue-50 p-3 rounded-lg">
                                {appointment.doctor_notes}
                              </p>
                            </div>
                          )}

                          {(appointment.cancel_reason ||
                            appointment.rescheduled_reason) && (
                            <div className="md:col-span-2">
                              <span className="font-medium text-gray-700">
                                {appointment.status === "cancelled"
                                  ? "Cancellation"
                                  : "Reschedule"}{" "}
                                Reason:
                              </span>
                              <p
                                className={`mt-1 p-3 rounded-lg ${
                                  appointment.status === "cancelled"
                                    ? "text-red-700 bg-red-50"
                                    : "text-purple-700 bg-purple-50"
                                }`}
                              >
                                {appointment.cancel_reason ||
                                  appointment.rescheduled_reason}
                              </p>
                              {(appointment.cancelled_at ||
                                appointment.updated_at) && (
                                <p className="text-xs text-gray-500 mt-2">
                                  {appointment.status === "cancelled"
                                    ? "Cancelled"
                                    : "Rescheduled"}{" "}
                                  on{" "}
                                  {new Date(
                                    appointment.cancelled_at ||
                                      appointment.updated_at
                                  ).toLocaleDateString()}{" "}
                                  at{" "}
                                  {new Date(
                                    appointment.cancelled_at ||
                                      appointment.updated_at
                                  ).toLocaleTimeString()}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 flex flex-col sm:flex-row gap-3">
                          {canReschedule(appointment) && (
                            <button
                              onClick={() => onRescheduleRequest?.(appointment)}
                              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <svg
                                className="w-4 h-4 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              {appointment.status === "requested"
                                ? "Reschedule Request"
                                : "Reschedule"}
                            </button>
                          )}
                          {canCancel(appointment) && (
                            <button
                              onClick={() => onCancelRequest?.(appointment)}
                              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <svg
                                className="w-4 h-4 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                              {appointment.status === "requested"
                                ? "Cancel Request"
                                : "Cancel Appointment"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && appointmentToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-red-600 flex-shrink-0">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Removal
              </h3>
            </div>

            <p className="text-gray-600 mb-6 text-sm sm:text-base">
              Are you sure you want to remove this appointment from your
              schedule? This action cannot be undone.
            </p>

            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-6">
              <div className="text-sm">
                <div className="font-medium text-gray-900 mb-1">
                  {appointmentToRemove.requested_time ||
                    appointmentToRemove.time}{" "}
                  - Dr.{" "}
                  {doctors.find(
                    (d) =>
                      d.id ===
                      (appointmentToRemove.med_id ||
                        appointmentToRemove.doctor_id)
                  )?.name || "Unknown Doctor"}
                </div>
                <div className="text-gray-600 text-xs sm:text-sm">
                  {appointmentToRemove.requested_date ||
                    appointmentToRemove.date}{" "}
                  •{" "}
                  {appointmentToRemove.patient_notes ||
                    appointmentToRemove.reason}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={handleCancelRemove}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors order-1 sm:order-2"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppointmentList;
