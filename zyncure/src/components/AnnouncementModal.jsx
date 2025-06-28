import React from "react";

export default function AnnouncementModal({
  open,
  loading,
  announcement,
  setAnnouncement,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-xl p-8 shadow-lg w-full max-w-md"
      >
        <h2 className="text-xl font-bold mb-4">Add Announcement</h2>
        <input
          className="w-full mb-3 p-2 border rounded"
          placeholder="Title"
          value={announcement.title}
          onChange={e => setAnnouncement({ ...announcement, title: e.target.value })}
          required
        />
        <textarea
          className="w-full mb-3 p-2 border rounded"
          placeholder="Content"
          value={announcement.content}
          onChange={e => setAnnouncement({ ...announcement, content: e.target.value })}
          required
        />
        <input
          className="w-full mb-3 p-2 border rounded"
          placeholder="Type (optional, e.g. info, alert)"
          value={announcement.type}
          onChange={e => setAnnouncement({ ...announcement, type: e.target.value })}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 bg-gray-200 rounded"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[#55A1A4] text-white rounded"
            disabled={loading}
          >
            {loading ? "Saving..." : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}