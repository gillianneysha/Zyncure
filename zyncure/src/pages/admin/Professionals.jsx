import React, { useEffect, useState } from "react";
import { supabase } from "../../client";
import { Edit, Trash2, Search as SearchIcon, CheckCircle, XCircle, Eye, Clock, Image, X, FileText } from "lucide-react";

export default function AdminProfessionals() {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [processingVerification, setProcessingVerification] = useState(null);
  const [editingProfessional, setEditingProfessional] = useState(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    status: 'active'
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [professionalToDelete, setProfessionalToDelete] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [verificationModal, setVerificationModal] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("Logged-in user id:", user?.id);
    };
    getUser();
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      
      const { data, error } = await supabase
        .from("admin_professionals_view")
        .select("*");

      if (error) {
        console.error("Error fetching from view:", error);
        setProfessionals([]);
      } else {
        setProfessionals(data || []);
        console.log("Fetched professionals from view:", data);
      }
    } catch (error) {
      console.error("Error fetching professionals:", error);
      setProfessionals([]);
    }
    setLoading(false);
  };


  const getImageUrl = (filename) => {
    if (!filename) return null;


    if (filename.startsWith('http')) {
      return filename;
    }


    const { data } = supabase.storage
      .from('doctor-licenses')
      .getPublicUrl(filename);

    return data.publicUrl;
  };

  
  const handleVerificationAction = async (professionalId, action, adminNotes = "") => {
    setProcessingVerification(professionalId);

    try {
      console.log("Starting verification action:", { professionalId, action, adminNotes });

     
      const professional = professionals.find(p => p.med_id === professionalId);
      console.log("Professional data:", professional);

      if (!professional) {
        alert("Professional not found");
        return;
      }

     
      if (!professional.verification_id) {
        alert("No verification submission found for this professional");
        return;
      }

      
      const { data, error } = await supabase.rpc('admin_update_verification', {
        p_user_id: professionalId,
        p_status: action,
        p_admin_notes: adminNotes
      });

      console.log("RPC result:", { data, error });

      if (error) {
        console.error("Error calling RPC:", error);
        alert(`Error updating verification: ${error.message}`);
        return;
      }

      if (!data.success) {
        console.error("RPC returned error:", data.error);
        alert(`Error updating verification: ${data.error}`);
        return;
      }

    
      console.log("Refreshing professionals data...");
      await fetchProfessionals();

      alert(`Verification ${action} successfully!`);
      setVerificationModal(null);

    } catch (error) {
      console.error("Error processing verification:", error);
      alert(`Error processing verification: ${error.message}`);
    } finally {
      setProcessingVerification(null);
    }
  };

  const handleApprove = (professionalId) => {
    const notes = prompt("Add admin notes (optional):");
    handleVerificationAction(professionalId, "approved", notes || "");
  };

  const handleReject = (professionalId) => {
    const notes = prompt("Please provide rejection reason:");
    if (notes) {
      handleVerificationAction(professionalId, "rejected", notes);
    }
  };

  const openVerificationModal = (professional) => {
    setVerificationModal(professional);
  };

  const closeVerificationModal = () => {
    setVerificationModal(null);
  };

  const viewImage = (imageFilename, doctorName) => {
    if (!imageFilename) {
      alert("No image uploaded for this verification");
      return;
    }

    const imageUrl = getImageUrl(imageFilename);
    if (!imageUrl) {
      alert("Unable to generate image URL");
      return;
    }

    setSelectedImage({ url: imageUrl, doctorName });
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const filteredProfessionals = professionals.filter(
    (p) =>
      (p.first_name || "").trim().toLowerCase().includes(search.toLowerCase()) ||
      (p.last_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.user_type || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (professional) => {
    setEditingProfessional(professional);
    setEditForm({
      first_name: professional.first_name || '',
      last_name: professional.last_name || '',
      email: professional.email || '',
      status: professional.status || 'active'
    });
  };

  const handleSaveEdit = async () => {
    if (!editingProfessional) return;

 
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

      const { data, error } = await supabase
        .from('medicalprofessionals')
        .update({
          first_name: editForm.first_name.trim(),
          last_name: editForm.last_name.trim(),
          email: editForm.email.trim(),
          status: editForm.status
        })
        .eq('med_id', editingProfessional.med_id)
        .select();

      if (error) {
        console.error('Error updating professional:', error);
        setError(`Update error: ${error.message}`);
      } else {
        console.log('Update successful:', data);

      
        setProfessionals(professionals.map(p =>
          p.med_id === editingProfessional.med_id
            ? { ...p, ...editForm }
            : p
        ));

      
        setEditingProfessional(null);
        setEditForm({ first_name: '', last_name: '', email: '', status: 'active' });
      }
    } catch (err) {
      console.error('Unexpected error updating professional:', err);
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingProfessional(null);
    setEditForm({ first_name: '', last_name: '', email: '', status: 'active' });
    setError(null);
  };

  const handleDelete = (professional) => {
    setProfessionalToDelete(professional);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!professionalToDelete) return;

    try {
      setIsDeleting(true);
      setError(null);

      // Delete from medicalprofessionals table
      const { error } = await supabase
        .from('medicalprofessionals')
        .delete()
        .eq('med_id', professionalToDelete.med_id);

      if (error) {
        console.error('Error deleting professional:', error);
        setError(`Delete error: ${error.message}`);
      } else {
        // Also delete from Supabase Auth using Edge Function
        const { error: fnError } = await supabase.functions.invoke('delete-user', {
          body: { user_id: professionalToDelete.med_id }
        });
        if (fnError) {
          console.error('Error deleting user from Auth:', fnError);
          setError(`Auth delete error: ${fnError.message}`);
        }

        setProfessionals(professionals.filter(p => p.med_id !== professionalToDelete.med_id));
        setShowDeleteModal(false);
        setProfessionalToDelete(null);
      }
    } catch (err) {
      console.error('Unexpected error deleting professional:', err);
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setProfessionalToDelete(null);
    setError(null);
  };


  const totalPages = Math.ceil(filteredProfessionals.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentProfessionals = filteredProfessionals.slice(startIndex, endIndex);

  
  const handleEntriesChange = (newEntries) => {
    setEntriesPerPage(newEntries);
    setCurrentPage(1);
  };

  
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const getVerificationStatusBadge = (professional) => {
    const state = professional.verification_state;

    const statusConfig = {
      no_submission: { bg: "bg-gray-400", text: "No Submission", icon: Clock },
      pending: { bg: "bg-yellow-500", text: "Pending Review", icon: Clock },
      approved: { bg: "bg-green-500", text: "Verified", icon: CheckCircle },
      rejected: { bg: "bg-red-500", text: "Rejected", icon: XCircle }
    };

    const config = statusConfig[state] || statusConfig.no_submission;
    const Icon = config.icon;

    return (
      <span className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${config.bg} flex items-center gap-1`}>
        <Icon size={12} />
        {config.text}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#FFEDE7] pt-2 px-5 pb-5">
      {/* Error display */}
      {
        error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 bg-red-500 text-white px-3 py-1 rounded text-sm"
            >
              Dismiss
            </button>
          </div>
        )
      }

     
      <h1 className="text-[#3BA4A0] font-bold text-4xl mt-1 mb-2 ml-4 relative z-10">
        Medical Professionals
      </h1>

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
            {/* Search bar */}
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
                <th className="py-2">Name</th>
                <th className="py-2">Date Created</th>
                <th className="py-2">Email</th>
                <th className="py-2">Status</th>
                <th className="py-2">Verification</th>
                <th className="py-2">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    Loading...
                  </td>
                </tr>
              ) : currentProfessionals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    No medical professionals found.
                  </td>
                </tr>
              ) : (
                currentProfessionals.map((p, idx) => {
                  const isPending = p.verification_state === "pending";

                  return (
                    <tr key={p.med_id} className={`border-t border-[#FEDCD2] ${isPending ? 'bg-yellow-50 border-l-4 border-l-yellow-500' : ''}`}>
                      <td className="py-2 text-[#F15629]">{startIndex + idx + 1}</td>
                      <td className="py-2 text-[#F15629]">
                        <div className="flex items-center gap-2">
                          {p.first_name} {p.last_name}
                          {isPending && (
                            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                              PENDING
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 text-[#F15629]">
                        {p.createdate
                          ? new Date(p.createdate).toLocaleDateString("en-US")
                          : ""}
                      </td>
                      <td className="py-2 text-[#F15629]">{p.email}</td>
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
                      <td className="py-2">
                        {getVerificationStatusBadge(p)}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2 items-center">
                          {/* Verification Management */}
                          <button
                            className={`p-2 rounded-full transition-colors ${isPending
                              ? 'bg-yellow-500 hover:bg-yellow-600 animate-pulse'
                              : 'bg-purple-500 hover:bg-purple-600'
                              }`}
                            onClick={() => openVerificationModal(p)}
                            title={isPending ? "Pending verification - Click to review" : "Manage verification"}
                          >
                            <FileText size={16} color="#fff" />
                          </button>

                          {/* edit and delete buttons */}
                          <button
                            className="bg-[#55A1A4] p-2 rounded-full hover:bg-[#3BA4A0] transition-colors"
                            onClick={() => handleEdit(p)}
                            disabled={isUpdating}
                          >
                            <Edit size={16} color="#fff" />
                          </button>
                          <button
                            className="bg-[#F15629] p-2 rounded-full hover:bg-[#d87364] transition-colors"
                            onClick={() => handleDelete(p)}
                            disabled={isDeleting}
                          >
                            <Trash2 size={16} color="#fff" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination Info */}
          {!loading && filteredProfessionals.length > 0 && (
            <div className="flex justify-between items-center mt-4 text-[#F15629]">
              <span className="text-sm">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredProfessionals.length)} of {filteredProfessionals.length} entries
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

      {/* Verification Modal */}
      {verificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-2xl font-semibold text-[#3BA4A0]">
                Verification Management - {verificationModal.first_name} {verificationModal.last_name}
              </h3>
              <button
                onClick={closeVerificationModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Verification Status */}
              <div className="flex items-center gap-4">
                <span className="font-semibold text-[#F15629]">Current Status:</span>
                {getVerificationStatusBadge(verificationModal)}
              </div>

              {/* Verification Details */}
              {verificationModal.verification_id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#3BA4A0] mb-1">License Number</label>
                      <p className="text-[#F15629]">{verificationModal.license_number || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#3BA4A0] mb-1">Verification Status</label>
                      <p className="text-[#F15629]">{verificationModal.verification_status || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#3BA4A0] mb-1">Submitted</label>
                      <p className="text-[#F15629]">
                        {verificationModal.verification_created_at ? new Date(verificationModal.verification_created_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#3BA4A0] mb-1">Last Updated</label>
                      <p className="text-[#F15629]">
                        {verificationModal.verification_updated_at ? new Date(verificationModal.verification_updated_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#3BA4A0] mb-1">Admin Notes</label>
                    <p className="text-[#F15629] bg-gray-50 p-3 rounded border min-h-[60px]">
                      {verificationModal.admin_notes || "No admin notes"}
                    </p>
                  </div>

                  {/* License Image */}
                  <div>
                    <label className="block text-sm font-semibold text-[#3BA4A0] mb-2">License Image</label>
                    {verificationModal.license_file_url ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => viewImage(verificationModal.license_file_url, `${verificationModal.first_name} ${verificationModal.last_name}`)}
                          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors flex items-center gap-2"
                        >
                          <Image size={16} />
                          View License Image
                        </button>
                        <span className="text-green-600 text-sm">✓ Image uploaded</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">No image uploaded</span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {verificationModal.verification_state === "pending" && (
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                        onClick={() => handleApprove(verificationModal.med_id)}
                        disabled={processingVerification === verificationModal.med_id}
                      >
                        <CheckCircle size={16} />
                        Approve Verification
                      </button>
                      <button
                        className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                        onClick={() => handleReject(verificationModal.med_id)}
                        disabled={processingVerification === verificationModal.med_id}
                      >
                        <XCircle size={16} />
                        Reject Verification
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <FileText size={48} className="mx-auto mb-4" />
                    <p className="text-lg">No verification submitted yet</p>
                    <p className="text-sm mt-2">This doctor has not submitted verification documents.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-semibold text-[#3BA4A0]">
                License Image - {selectedImage.doctorName}
              </h3>
              <button
                onClick={closeImageModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4">
              <img
                src={selectedImage.url}
                alt={`License for ${selectedImage.doctorName}`}
                className="max-w-full h-auto rounded-lg"
                onError={(e) => {
                  console.error('Image failed to load:', selectedImage.url);
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="text-center text-red-500 mt-4 hidden">
                <p>Failed to load image.</p>
                <p className="text-sm mt-2">Image URL: {selectedImage.url}</p>
                <p className="text-sm">Please check if the image exists in the storage bucket and the bucket is publicly accessible.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingProfessional && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h2 className="text-xl font-bold text-[#3BA4A0] mb-4">Edit Professional</h2>
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
            <h2 className="text-xl font-bold text-[#F15629] mb-4">Delete Professional</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-[#F15629]">
                {professionalToDelete?.first_name} {professionalToDelete?.last_name}
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
    </div>
  );
}