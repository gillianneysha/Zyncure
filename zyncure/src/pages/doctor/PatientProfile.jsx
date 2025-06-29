import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../client";
import { FileText, ArrowLeft, Calendar, Phone, Mail, Activity, Heart, Thermometer } from "lucide-react";

export default function PatientProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [records, setRecords] = useState([]);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Mock data for demonstration - replace with real data from your backend
    const mockSymptoms = [
        { name: "Headache", frequency: "3 times a week", severity: "moderate" },
        { name: "Blood Pressure", value: "130/85", note: "(average)" },
        { name: "Blood Sugar", value: "120 mg/dL", note: "(average)" }
    ];

    const mockRecords = [
        { id: 1, type: "Blood Test", date: "2023-09-21", status: "completed" },
        { id: 2, type: "X-Ray", date: "2023-09-15", status: "completed" },
        { id: 3, type: "X-Ray", date: "2023-09-15", status: "completed" }
    ];

    const mockNotes = [
        { id: 1, date: "2023-05-20", title: "Regular Checkup", summary: "Patient showed improvement in blood pressure levels" },
        { id: 2, date: "2023-04-25", title: "Follow-up Visit", summary: "Discussed medication adjustments and lifestyle changes" },
        { id: 3, date: "2023-03-28", title: "Initial Consultation", summary: "Comprehensive health assessment and treatment plan" }
    ];

    useEffect(() => {
        async function fetchPatient() {
            setLoading(true);
            try {
                // Fetch patient info
                const { data: patientData } = await supabase
                    .from("patients")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (patientData) {
                    setPatient(patientData);
                }

                // Fetch records (replace with your actual table/logic)
                const { data: recordData } = await supabase
                    .from("records")
                    .select("*")
                    .eq("patient_id", id);
                setRecords(recordData || mockRecords);

                // Fetch notes (replace with your actual table/logic)
                const { data: notesData } = await supabase
                    .from("consultation_notes")
                    .select("*")
                    .eq("patient_id", id);
                setNotes(notesData || mockNotes);

            } catch (error) {
                console.error('Error fetching patient data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchPatient();
    }, [id]);

    const handleViewRecord = (recordId) => {
        console.log(`View record ${recordId}`);
        // TODO: Navigate to record detail or open modal
    };

    const handleViewNote = (noteId) => {
        console.log(`View note ${noteId}`);
        // TODO: Navigate to note detail or open modal
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading patient profile...</p>
                </div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Patient Not Found</h2>
                    <p className="text-gray-600 mb-6">The patient you're looking for doesn't exist or you don't have access to view them.</p>
                    <button
                        onClick={() => navigate('/doctor/patients')}
                        className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                    >
                        Back to Patients
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/doctor/patients')}
                        className="p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {patient.first_name?.charAt(0)}{patient.last_name?.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-teal-600">Patient Profile</h1>
                            <p className="text-gray-600">{patient.first_name} {patient.last_name}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Basic Patient Info */}
                    <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border border-red-100">
                        <h2 className="text-xl font-semibold text-teal-600 border-b border-teal-300 pb-3 mb-6 flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            Basic Patient Info
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-red-600 min-w-[120px]">Name:</span>
                                <span className="text-gray-800">{patient.first_name} {patient.last_name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-red-600 min-w-[120px]">Age:</span>
                                <span className="text-gray-800">{patient.age || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="w-4 h-4 text-red-600" />
                                <span className="font-bold text-red-600 min-w-[120px]">Contact:</span>
                                <span className="text-gray-800">{patient.contact_number || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail className="w-4 h-4 text-red-600" />
                                <span className="font-bold text-red-600 min-w-[120px]">Email:</span>
                                <span className="text-gray-800">{patient.email || "N/A"}</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <Heart className="w-4 h-4 text-red-600 mt-1" />
                                <span className="font-bold text-red-600 min-w-[120px]">Conditions:</span>
                                <span className="text-gray-800">{patient.health_conditions || "None reported"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Symptoms and Health Trends */}
                    <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border border-red-100">
                        <h2 className="text-xl font-semibold text-teal-600 border-b border-teal-300 pb-3 mb-6 flex items-center gap-2">
                            <Thermometer className="w-5 h-5" />
                            Symptoms and Health Trends
                        </h2>
                        <div className="space-y-3">
                            {mockSymptoms.map((symptom, index) => (
                                <div key={index} className="bg-white rounded-lg px-4 py-3 border border-red-200">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-red-600">
                                            {symptom.name}:
                                        </span>
                                        <span className="text-red-600">
                                            {symptom.frequency || symptom.value} {symptom.note && <span className="text-gray-500">{symptom.note}</span>}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shared Patient Records */}
                    <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border border-red-100">
                        <div className="flex justify-between items-center border-b border-teal-300 pb-3 mb-6">
                            <h2 className="text-xl font-semibold text-teal-600 flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Shared Patient Records
                            </h2>
                            <button className="text-teal-600 hover:text-teal-700 underline text-sm font-medium">
                                View All
                            </button>
                        </div>
                        <div className="space-y-3">
                            {records.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>No records shared.</p>
                                </div>
                            ) : (
                                mockRecords.map((record) => (
                                    <div key={record.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-red-200 hover:shadow-sm transition-shadow">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-4 h-4 text-red-600" />
                                            <span className="text-red-600 font-semibold">
                                                Lab Result: {record.type} – {new Date(record.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleViewRecord(record.id)}
                                            className="bg-teal-500 text-white px-4 py-1 rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-1 text-sm"
                                        >
                                            <FileText className="w-4 h-4" />
                                            View
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Consultation Notes */}
                    <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border border-red-100">
                        <h2 className="text-xl font-semibold text-teal-600 border-b border-teal-300 pb-3 mb-6 flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            Consultation Notes
                        </h2>
                        <div className="space-y-3">
                            {notes.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>No consultation notes.</p>
                                </div>
                            ) : (
                                mockNotes.map((note) => (
                                    <div key={note.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-red-200 hover:shadow-sm transition-shadow">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-4 h-4 text-red-600" />
                                            <span className="text-red-600 font-semibold">
                                                Consultation on {new Date(note.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleViewNote(note.id)}
                                            className="bg-teal-500 text-white px-4 py-1 rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-1 text-sm"
                                        >
                                            <FileText className="w-4 h-4" />
                                            View
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}