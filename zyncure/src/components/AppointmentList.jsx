import { useState } from "react";
import { appointmentService } from "../services/AppointmentService"; // Adjust path as needed

const AppointmentList = ({
  selectedDate,
  appointments = [],
  doctors = [],
  emptyStateMessage = "No appointments scheduled for this date",
  emptyStateSubtext = 'Click "Book New Appointment" to schedule one',
  onRescheduleRequest,
  onCancelRequest,
  onPermanentRemove, // This will be called after successful deletion
  onRefresh, // Add this prop to refresh the appointments list
}) => {
  const [expandedAppointment, setExpandedAppointment] = useState(null);
  const [isRemoving, setIsRemoving] = useState(null); // Track which appointment is being removed
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [appointmentToRemove, setAppointmentToRemove] = useState(null);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getStatusConfig = (status) => {
    const configs = {
      confirmed: {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: "✓",
        label: "Confirmed",
      },
      pending: {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: "⏳",
        label: "Pending",
      },
      cancelled: {
        color: "bg-red-100 text-red-800 border-red-200",
        icon: "✕",
        label: "Cancelled",
      },
      rescheduled: {
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: "📅",
        label: "Rescheduled",
      },
      completed: {
        color: "bg-gray-100 text-gray-800 border-gray-200",
        icon: "✅",
        label: "Completed",
      },
    };
    return configs[status] || configs.pending;
  };

  const canReschedule = (appointment) => {
    return (
      ["cancelled", "rescheduled"].includes(appointment.status) ||
      (appointment.status === "confirmed" &&
        new Date(`${appointment.date}T${appointment.time}`) > new Date())
    );
  };

  const canCancel = (appointment) => {
    // Only allow cancellation for confirmed appointments
    if (appointment.status !== 'confirmed') return false;
    
    // Check if created_at exists and is valid
    if (!appointment.created_at) {
      console.warn('No created_at field found for appointment:', appointment.id);
      // If no created_at, allow cancellation (fallback behavior)
      return true;
    }
    
    try {
      const now = new Date();
      const appointmentCreatedAt = new Date(appointment.created_at);
      
      // Check if the date is valid
      if (isNaN(appointmentCreatedAt.getTime())) {
        console.warn('Invalid created_at date for appointment:', appointment.id);
        // If invalid date, allow cancellation (fallback behavior)
        return true;
      }
      
      const hoursFromCreation = (now.getTime() - appointmentCreatedAt.getTime()) / (1000 * 60 * 60);
      
      // Debug log
      console.log('Appointment:', appointment.id, 'Hours from creation:', hoursFromCreation);
      
      return hoursFromCreation <= 24;
    } catch (error) {
      console.error('Error checking cancellation eligibility:', error);
      // If error, allow cancellation (fallback behavior)
      return true;
    }
  };

  // Show confirmation modal
  const handleRemoveClick = (appointment) => {
    setAppointmentToRemove(appointment);
    setShowConfirmModal(true);
  };

  // Handle confirmed removal
  const handleConfirmRemove = async () => {
    if (!appointmentToRemove) return;

    try {
      setIsRemoving(appointmentToRemove.id);
      setShowConfirmModal(false);

      // Call the delete function from the service
      const { error } = await appointmentService.deleteAppointment(
        appointmentToRemove.id
      );

      if (error) {
        console.error("Error removing appointment:", error);
        alert("Failed to remove appointment. Please try again.");
        return;
      }

      // Call the parent component's handler if provided
      if (onPermanentRemove) {
        onPermanentRemove(appointmentToRemove);
      }

      // Refresh the appointments list if function is provided
      if (onRefresh) {
        onRefresh();
      }

      // Show success message
      console.log("Appointment removed successfully");
    } catch (error) {
      console.error("Error removing appointment:", error);
      alert("Failed to remove appointment. Please try again.");
    } finally {
      setIsRemoving(null);
      setAppointmentToRemove(null);
    }
  };

  // Handle cancel removal
  const handleCancelRemove = () => {
    setShowConfirmModal(false);
    setAppointmentToRemove(null);
  };

  const selectedDateAppointments = appointments.filter(
    (apt) => apt.date === formatDate(selectedDate)
  );

  const toggleExpanded = (appointmentId) => {
    setExpandedAppointment(
      expandedAppointment === appointmentId ? null : appointmentId
    );
  };

  return (
    <>
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border">
        <div className="bg-myHeader text-white p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">My Schedule</h2>
            <span className="text-lg font-medium">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <p className="text-teal-100 mt-1">
            {selectedDateAppointments.length} appointment
            {selectedDateAppointments.length !== 1 ? "s" : ""} scheduled
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {selectedDateAppointments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg">{emptyStateMessage}</p>
              <p className="text-sm mt-2">{emptyStateSubtext}</p>
            </div>
          ) : (
            selectedDateAppointments.map((appointment) => {
              const doctor = doctors.find(
                (d) => d.id === appointment.doctor_id
              );
              const statusConfig = getStatusConfig(appointment.status);
              const isExpanded = expandedAppointment === appointment.id;
              const needsAction = ["cancelled", "rescheduled"].includes(
                appointment.status
              );
              const isBeingRemoved = isRemoving === appointment.id;

              return (
                <div
                  key={appointment.id}
                  className={`transition-all duration-200 ${
                    needsAction
                      ? "bg-red-50 border-l-4 border-l-red-400"
                      : appointment.status === "confirmed"
                      ? "bg-teal-50 border-l-4 border-l-teal-500"
                      : "bg-gray-50 border-l-4 border-l-gray-400"
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 flex-1">
                        <div className="text-gray-600 font-bold text-lg min-w-[100px]">
                          {appointment.time}
                        </div>
                        <div className="flex items-center gap-6 flex-1">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-800 text-lg">
                              {doctor?.name || "Unknown Doctor"}
                            </span>

                          </div>
                          <div className="flex flex-col flex-1">
                            <span className="text-sm text-gray-500 line-clamp-1">
                              {appointment.reason}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Status Badge */}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color} flex items-center gap-1`}
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

                    {/* Action Alert for Cancelled/Rescheduled */}
                    {needsAction && (
                      <div className="mt-4 p-4 bg-red-100 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="text-red-600 mt-0.5">
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
                          <div className="flex-1">
                            <h4 className="font-medium text-red-800">
                              {appointment.status === "cancelled"
                                ? "Appointment Cancelled"
                                : "Appointment Rescheduled"}
                            </h4>
                            <p className="text-sm text-red-700 mt-1">
                              {appointment.status === "cancelled"
                                ? "This appointment has been cancelled. Would you like to reschedule or remove it from your schedule?"
                                : "This appointment has been rescheduled. Please book a new time slot or remove it from your schedule."}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() =>
                                  onRescheduleRequest?.(appointment)
                                }
                                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                disabled={isBeingRemoved}
                              >
                                <svg
                                  className="w-4 h-4"
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
                                Reschedule
                              </button>
                              <button
                                onClick={() => handleRemoveClick(appointment)}
                                disabled={isBeingRemoved}
                                className={`px-4 py-2 text-white text-sm rounded-lg transition-colors flex items-center gap-2 ${
                                  isBeingRemoved
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-red-600 hover:bg-red-700"
                                }`}
                              >
                                {isBeingRemoved ? (
                                  <>
                                    <svg
                                      className="w-4 h-4 animate-spin"
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
                                    Removing...
                                  </>
                                ) : (
                                  <>
                                    <svg
                                      className="w-4 h-4"
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
                                    Remove from Schedule
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
                              Appointment ID:
                            </span>
                            <span className="ml-2 text-gray-600">
                              #{appointment.id}
                            </span>
                          </div>
                          <div className="md:col-span-2">
                            <span className="font-medium text-gray-700">
                              Reason:
                            </span>
                            <p className="mt-1 text-gray-600">
                              {appointment.reason}
                            </p>
                          </div>

                        </div>

                        {/* Action Buttons */}
                        {appointment.status === "confirmed" && (
                          <div className="mt-4 flex gap-3">
                            {canReschedule(appointment) && (
                              <button
                                onClick={() =>
                                  onRescheduleRequest?.(appointment)
                                }
                                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                              >
                                <svg
                                  className="w-4 h-4"
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
                                Reschedule
                              </button>
                            )}
                            {canCancel(appointment) && (
                              <button
                                onClick={() => onCancelRequest?.(appointment)}
                                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                              >
                                <svg
                                  className="w-4 h-4"
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
                                Cancel Appointment
                              </button>
                            )}
                          </div>
                        )}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-red-600">
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

            <p className="text-gray-600 mb-6">
              Are you sure you want to remove this appointment from your
              schedule? This action cannot be undone.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="text-sm">
                <div className="font-medium text-gray-900 mb-1">
                  {appointmentToRemove.time} -{" "}
                  {doctors.find((d) => d.id === appointmentToRemove.doctor_id)
                    ?.name || "Unknown Doctor"}
                </div>
                <div className="text-gray-600">
                  {appointmentToRemove.date} • {appointmentToRemove.reason}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelRemove}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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