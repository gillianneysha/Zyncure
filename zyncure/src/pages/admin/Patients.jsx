import React, { useEffect, useState } from "react";
import { supabase } from "../../client";
import { Edit, Trash2, Search as SearchIcon } from "lucide-react";

export default function AdminPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);

  const [editingPatient, setEditingPatient] = useState(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    status: 'active'
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);


  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
          error: userError
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Auth error:", userError);
          setError(`Authentication error: ${userError.message}`);
          return;
        }

        console.log("Logged-in user id:", user?.id);
        console.log("Full user object:", user);

        if (!user) {
          setError("No authenticated user found");
          return;
        }
      } catch (err) {
        console.error("Error getting user:", err);
        setError(`Error getting user: ${err.message}`);
      }
    };

    getUser();
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Attempting to fetch patients...");

    
      const { error: testError } = await supabase
        .from("patients")
        .select("count")
        .limit(1);

      if (testError) {
        console.error("Connection test failed:", testError);
        setError(`Database connection error: ${testError.message}`);
        setLoading(false);
        return;
      }

      console.log("Connection test successful");

     
      const { data, error, count } = await supabase
        .from("patients")
        .select("*", { count: 'exact' });

      console.log("Query result:", { data, error, count });
      console.log("Raw data length:", data?.length);
      console.log("First patient:", data?.[0]);

      if (error) {
        console.error("Supabase fetch error:", error);
        setError(`Fetch error: ${error.message}`);
      } else {
        setPatients(data || []);
        console.log("Successfully set patients:", data?.length || 0);
      }

      setLoading(false);
    } catch (err) {
      console.error("Unexpected error in fetchPatients:", err);
      setError(`Unexpected error: ${err.message}`);
      setLoading(false);
    }
  };

  const handleEdit = (patient) => {
    setEditingPatient(patient);
    setEditForm({
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      email: patient.email || '',
      status: patient.status || 'active'
    });
  };

  const handleSaveEdit = async () => {
    if (!editingPatient) return;

  
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
      setError('First name and last name are required');
      return;
    }

    if (!editForm.email.trim() || !editForm.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);

      console.log('Updating patient:', editingPatient.patient_id, 'with data:', editForm);

      const { data, error } = await supabase
        .from('patients')
        .update({
          first_name: editForm.first_name.trim(),
          last_name: editForm.last_name.trim(),
          email: editForm.email.trim(),
          status: editForm.status
        })
        .eq('patient_id', editingPatient.patient_id)
        .select(); 

      if (error) {
        console.error('Error updating patient:', error);
        setError(`Update error: ${error.message}`);
      } else {
        console.log('Update successful:', data);

     
        setPatients(patients.map(p =>
          p.patient_id === editingPatient.patient_id
            ? { ...p, ...editForm }
            : p
        ));

      
        setEditingPatient(null);
        setEditForm({ first_name: '', last_name: '', email: '', status: 'active' });

       
        const successMessage = `Patient ${editForm.first_name} ${editForm.last_name} updated successfully!`;
        console.log(successMessage);
      }
    } catch (err) {
      console.error('Unexpected error updating patient:', err);
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingPatient(null);
    setEditForm({ first_name: '', last_name: '', email: '', status: 'active' });
    setError(null);
  };

  const handleDelete = (patient) => {
    setPatientToDelete(patient);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!patientToDelete) return;

    try {
      setIsDeleting(true);
      setError(null);

      console.log('Deleting patient:', patientToDelete.patient_id);

      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('patient_id', patientToDelete.patient_id);

      if (error) {
        console.error('Error deleting patient:', error);
        setError(`Delete error: ${error.message}`);
      } else {
        console.log('Delete successful');

        
        setPatients(patients.filter(p => p.patient_id !== patientToDelete.patient_id));

      
        setShowDeleteModal(false);
        setPatientToDelete(null);

        
        console.log(`Patient ${patientToDelete.first_name} ${patientToDelete.last_name} deleted successfully!`);
      }
    } catch (err) {
      console.error('Unexpected error deleting patient:', err);
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPatientToDelete(null);
    setError(null);
  };

  console.log("Current component state:", {
    patientsLength: patients.length,
    loading,
    error,
    search,
    currentPage,
    entriesPerPage
  });

  const filteredPatients = patients.filter(
    (p) => {
      const searchLower = search.toLowerCase();
      const firstName = (p.first_name || "").trim().toLowerCase();
      const lastName = (p.last_name || "").toLowerCase();
      const email = (p.email || "").toLowerCase();

      console.log("Filtering patient:", { firstName, lastName, email, searchLower });

      return firstName.includes(searchLower) ||
        lastName.includes(searchLower) ||
        email.includes(searchLower);
    }
  );

  console.log("Filtered patients:", filteredPatients.length);


  const totalPages = Math.ceil(filteredPatients.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentPatients = filteredPatients.slice(startIndex, endIndex);

  console.log("Pagination:", { totalPages, startIndex, endIndex, currentPatientsLength: currentPatients.length });


  const handleEntriesChange = (newEntries) => {
    setEntriesPerPage(newEntries);
    setCurrentPage(1);
  };


  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <div className="min-h-screen bg-[#FFEDE7] pt-2 px-5 pb-5">
      <h1 className="text-[#3BA4A0] font-bold text-4xl mt-1 mb-2 ml-4 relative z-10">
        Patients
      </h1>

   
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 bg-red-500 text-white px-3 py-1 rounded text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

    
      <div className="bg-[#FEDCD2] rounded-[24px] p-6 mb-6 mt-2">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <span className="font-semibold mr-2 text-[#F15629]">Show</span>
            <select
              className="rounded px-2 py-1 border text-[#F15629] bg-white"
              value={entriesPerPage}
              onChange={(e) => handleEntriesChange(Number(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="ml-2 text-[#F15629] font-semibold">entries</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#F15629]">Search:</span>
         
            <div className="relative bg-[#FFEDE7] rounded-md px-4 py-2 flex items-center min-w-[250px]">
              <input
                type="text"
                className="bg-transparent outline-none w-full pr-8 text-[#F15629] placeholder-[#F15629]"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <SearchIcon
                className="absolute right-4 text-[#F15629] pointer-events-none top-1/2 transform -translate-y-1/2"
                size={20}
              />
            </div>
          </div>
        </div>
        <div className="bg-[#FFEDE7] rounded-xl p-4">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[#3BA4A0] font-semibold border-b border-[#F15629]">
                <th className="py-2">No.</th>
                <th className="py-2">Patient Name</th>
                <th className="py-2">Date Created</th>
                <th className="py-2">Email</th>
                <th className="py-2">Status</th>
                <th className="py-2">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-red-600">
                    Error loading patients: {error}
                  </td>
                </tr>
              ) : currentPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    {patients.length === 0 ?
                      "No patients found in database." :
                      `No patients match search "${search}".`
                    }
                  </td>
                </tr>
              ) : (
                currentPatients.map((p, idx) => (
                  <tr key={p.patient_id} className="border-t border-[#FEDCD2]">
                    <td className="py-2 text-[#F15629]">{startIndex + idx + 1}</td>
                    <td className="py-2 text-[#F15629]">
                      {p.first_name} {p.last_name}
                    </td>
                    <td className="py-2 text-[#F15629]">
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString("en-US")
                        : "N/A"}
                    </td>
                    <td className="py-2 text-[#F15629]">{p.email || "N/A"}</td>
                    <td className="py-2">
                      <span
                        className={`px-4 py-1 rounded-full text-white text-sm font-semibold ${p.status === "active"
                          ? "bg-[#55A1A4]"
                          : "bg-[#F15629]"
                          }`}
                      >
                        {p.status === "active" ? "Active" : "Not Active"}
                      </span>
                    </td>
                    <td className="py-2 flex gap-2">
                      <button
                        onClick={() => handleEdit(p)}
                        className="bg-[#55A1A4] p-2 rounded-full hover:bg-[#3BA4A0] transition-colors"
                        disabled={isUpdating}
                      >
                        <Edit size={18} color="#fff" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="bg-[#F15629] p-2 rounded-full hover:bg-[#d87364] transition-colors"
                        disabled={isDeleting}
                      >
                        <Trash2 size={18} color="#fff" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Edit Modal */}
          {editingPatient && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
                <h2 className="text-xl font-bold text-[#3BA4A0] mb-4">Edit Patient</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#F15629] mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3BA4A0]"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F15629] mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3BA4A0]"
                      placeholder="Enter last name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F15629] mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3BA4A0]"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F15629] mb-1">
                      Status
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3BA4A0]"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-[#F15629] border border-[#F15629] rounded-md hover:bg-[#F15629] hover:text-white transition-colors"
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-[#3BA4A0] text-white rounded-md hover:bg-[#55A1A4] transition-colors disabled:opacity-50"
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
                <h2 className="text-xl font-bold text-[#F15629] mb-4">Delete Patient</h2>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete{' '}
                  <span className="font-semibold text-[#F15629]">
                    {patientToDelete?.first_name} {patientToDelete?.last_name}
                  </span>
                  ? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelDelete}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 bg-[#F15629] text-white rounded-md hover:bg-[#d87364] transition-colors disabled:opacity-50"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pagination Info */}
          {!loading && filteredPatients.length > 0 && (
            <div className="flex justify-between items-center mt-4 text-[#F15629]">
              <span className="text-sm">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredPatients.length)} of {filteredPatients.length} entries
              </span>
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded bg-[#3BA4A0] text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded bg-[#3BA4A0] text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}