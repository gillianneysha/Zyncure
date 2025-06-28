import { useState, useEffect } from "react";
import { supabase } from "../../client";
import AnnouncementModal from "../../components/AnnouncementModal";

export default function AdminHome() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [pendingVerification, setPendingVerification] = useState(0);
  const [reportsForReview, setReportsForReview] = useState(0);
  const [messages, setMessages] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "", type: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchTotalUsers() {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      if (!error) setTotalUsers(count || 0);
    }
    async function fetchPendingVerification() {
      const { count, error } = await supabase
        .from("doctor_verifications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (!error) setPendingVerification(count || 0);
    }
    async function fetchReportsForReview() {
      const { count, error } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (!error) setReportsForReview(count || 0);
    }
    async function fetchMessages() {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);
      if (!error) setMessages(data || []);
    }
    fetchTotalUsers();
    fetchPendingVerification();
    fetchReportsForReview();
    fetchMessages();
  }, []);

  async function handleAddAnnouncement(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("announcements").insert([{
      title: newAnnouncement.title,
      content: newAnnouncement.content,
      type: newAnnouncement.type
    }]);
    setLoading(false);
    if (!error) {
      setShowModal(false);
      setNewAnnouncement({ title: "", content: "", type: "" });
      fetchMessages();
    } else {
      alert("Failed to add announcement: " + error.message);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Key Stats Overview</h1>
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow flex flex-col items-center">
          <span className="text-xl font-semibold mb-2">Total Users</span>
          <span className="text-4xl font-bold text-[#F46B5D]">{totalUsers}</span>
        </div>
        <div className="bg-white rounded-xl p-6 shadow flex flex-col items-center">
          <span className="text-xl font-semibold mb-2">Pending Verification</span>
          <span className="text-4xl font-bold text-[#F46B5D]">{pendingVerification}</span>
        </div>
        <div className="bg-white rounded-xl p-6 shadow flex flex-col items-center">
          <span className="text-xl font-semibold mb-2">Reports For Review</span>
          <span className="text-4xl font-bold text-[#F46B5D]">{reportsForReview}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl p-6 shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Message Board</h2>
            <button
              className="bg-[#55A1A4] text-white px-4 py-2 rounded hover:bg-[#368487] transition"
              onClick={() => setShowModal(true)}
            >
              Add New Announcement
            </button>
          </div>
          <ul>
            {messages.length === 0 && <li className="text-gray-400">No announcements.</li>}
            {messages.map((msg) => (
              <li key={msg.id} className="mb-3">
                <div className="font-semibold">{msg.title}</div>
                <div className="text-xs text-gray-500">{new Date(msg.created_at).toLocaleString()}</div>
                <div className="text-sm">{msg.content}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <AnnouncementModal
        open={showModal}
        loading={loading}
        announcement={newAnnouncement}
        setAnnouncement={setNewAnnouncement}
        onClose={() => setShowModal(false)}
        onSubmit={handleAddAnnouncement}
      />
    </div>
  );
}