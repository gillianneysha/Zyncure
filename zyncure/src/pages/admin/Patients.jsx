import React, { useEffect, useState } from "react";
import { supabase } from "../../client";
import { Edit, Trash2, Search as SearchIcon } from "lucide-react";

export default function AdminPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null); // Add error state for debugging

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
      
      // Test basic connection
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
      
      // Fetch all patients
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

  // Debug: Log current state
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

  // Calculate pagination
  const totalPages = Math.ceil(filteredPatients.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentPatients = filteredPatients.slice(startIndex, endIndex);

  console.log("Pagination:", { totalPages, startIndex, endIndex, currentPatientsLength: currentPatients.length });

  // Reset to first page when entries per page changes
  const handleEntriesChange = (newEntries) => {
    setEntriesPerPage(newEntries);
    setCurrentPage(1);
  };

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <div className="min-h-screen bg-[#FFEDE7] pt-2 px-5 pb-5">
      {/* Patients heading OUTSIDE the outer box */}
      <h1 className="text-[#3BA4A0] font-bold text-4xl mt-1 mb-2 ml-4 relative z-10">
        Patients
      </h1>
      
      {/* Debug information - remove this in production */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
          <button 
            onClick={fetchPatients}
            className="ml-4 bg-red-500 text-white px-3 py-1 rounded text-sm"
          >
            Retry
          </button>
        </div>
      )}

      
      {/* Outer box with MORE rounded corners */}
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
            {/* Search bar with less rounded corners */}
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
                  <tr key={p.id || p.patient_id} className="border-t border-[#FEDCD2]">
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
                        className={`px-4 py-1 rounded-full text-white text-sm font-semibold ${
                          p.status === "active"
                            ? "bg-[#55A1A4]"
                            : "bg-[#F15629]"
                        }`}
                      >
                        {p.status === "active" ? "Active" : "Not Active"}
                      </span>
                    </td>
                    <td className="py-2 flex gap-2">
                      <button className="bg-[#55A1A4] p-2 rounded-full hover:bg-[#3BA4A0]">
                        <Edit size={18} color="#fff" />
                      </button>
                      <button className="bg-[#F15629] p-2 rounded-full hover:bg-[#d87364]">
                        <Trash2 size={18} color="#fff" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
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