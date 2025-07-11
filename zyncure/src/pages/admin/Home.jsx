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

  async function fetchMessages() {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);
    if (!error) setMessages(data || []);
  }

  useEffect(() => {
    async function fetchTotalUsers() {
      try {
        // Get count from patients table
        const { count: patientsCount, error: patientsError } = await supabase
          .from("patients")
          .select("*", { count: "exact", head: true });

        // Get count from medicalprofessionals table
        const { count: professionalsCount, error: professionalsError } = await supabase
          .from("medicalprofessionals")
          .select("*", { count: "exact", head: true });

        if (!patientsError && !professionalsError) {
          const totalCount = (patientsCount || 0) + (professionalsCount || 0);
          setTotalUsers(totalCount);
        } else {
          console.error('Error fetching users:', patientsError || professionalsError);
          setTotalUsers(0);
        }
      } catch (error) {
        console.error('Error fetching total users:', error);
        setTotalUsers(0);
      }
    }
    async function fetchPendingVerification() {
      const { count, error } = await supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "Open");
      if (!error) setPendingVerification(count || 0);
    }
    async function fetchReportsForReview() {
      const { count, error } = await supabase
        .from("bug_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "In Progress");
      if (!error) setReportsForReview(count || 0);
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

    if (!error) {
      // Notify all users about the new announcement
      const { error: notifyError } = await supabase.rpc('notify_all_users_announcement', {
        announcement_title: newAnnouncement.title,
        announcement_content: newAnnouncement.content,
        announcement_type: newAnnouncement.type || 'info'
      });

      if (notifyError) {
        console.error('Failed to send notifications:', notifyError);
        // You might want to show a warning that the announcement was created but notifications failed
      }

      setShowModal(false);
      setNewAnnouncement({ title: "", content: "", type: "" });
      fetchMessages();
    } else {
      alert("Failed to add announcement: " + error.message);
    }

    setLoading(false);
  }

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-6 text-[#55A1A4]">Key Stats Overview</h1>
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
          <span className="text-xl font-semibold mb-2">Reports for Review</span>
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