import React, { useEffect, useState } from "react";
import { supabase } from "../../client";
import { Edit, Trash2, Search as SearchIcon } from "lucide-react";

export default function AdminProfessionals() {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

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
    const { data, error } = await supabase.from("medicalprofessionals").select("*");
    setProfessionals(data || []);
    setLoading(false);
    if (error) console.error("Supabase error:", error);
    console.log("Fetched professionals:", data);
  };

  const filteredProfessionals = professionals.filter(
    (p) =>
      (p.first_name || "").trim().toLowerCase().includes(search.toLowerCase()) ||
      (p.last_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.user_type || "").toLowerCase().includes(search.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredProfessionals.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentProfessionals = filteredProfessionals.slice(startIndex, endIndex);

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
      {/* Medical Professionals heading OUTSIDE the outer box */}
      <h1 className="text-[#3BA4A0] font-bold text-4xl mt-1 mb-2 ml-4 relative z-10">
        Medical Professionals
      </h1>
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
              ) : currentProfessionals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    No medical professionals found.
                  </td>
                </tr>
              ) : (
                currentProfessionals.map((p, idx) => (
                  <tr key={p.med_id} className="border-t border-[#FEDCD2]">
                    <td className="py-2 text-[#F15629]">{startIndex + idx + 1}</td>
                    <td className="py-2 text-[#F15629]">
                      {p.first_name} {p.last_name}
                    </td>
                    <td className="py-2 text-[#F15629]">
                      {p.createdate
                        ? new Date(p.createdate).toLocaleDateString("en-US")
                        : ""}
                    </td>
                    <td className="py-2 text-[#F15629]">{p.email}</td>
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
    </div>
  );
}