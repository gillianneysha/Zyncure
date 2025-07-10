import {
  SquarePlus, FolderPlus, FilePlus, LayoutGrid, Rows3, MoreVertical, FileText, Share,
  Cross, ChevronDown, ArrowLeft, Edit, Trash2, X
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { supabase } from "../../client";
import ShareModal from "../../components/ShareModal";
import RenameModal from "../../components/RenameModal";
import ActionModal from "../../components/ActionModal";
import SuccessModal from "../../components/SuccessModal";
import CreateFolderModal from "../../components/CreateFolderModal";

// --- Filter constants ---
const FILE_TYPE_FILTERS = [
  { label: "PDF", value: "pdf" },
  { label: "PNG", value: "png" },
  { label: "JPG", value: "jpg" },
  { label: "DOCX", value: "docx" },
];
const HISTORY_FILTERS = [
  { label: "Recently Added", value: "recent" },
  { label: "Last 3 Days", value: "3d" },
  { label: "Last Week", value: "1w" },
  { label: "Last Month", value: "1m" },
];
const ALL_FILTERS = [
  { label: "All", value: "all" },
  { label: "My Records", value: "mine" },
  { label: "Shared with Me", value: "shared_with_me" },
  { label: "Shared with Others", value: "shared_with_others" },
];

// --- Helper hooks & functions ---
function useMaxFileNameLength() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    function handleResize() { setWidth(window.innerWidth); }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  if (width < 640) return 18;
  if (width < 1024) return 24;
  return 32;
}

function truncateFileName(fileName, maxLength = 25) {
  if (!fileName || fileName.length <= maxLength) return fileName;
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) return fileName.slice(0, maxLength - 3) + "...";
  const extension = fileName.slice(lastDot + 1);
  const keep = maxLength - extension.length - 4;
  if (keep <= 0) return "..." + fileName.slice(lastDot);
  return fileName.slice(0, keep) + "..." + "." + extension;
}

function getFileExtension(name) {
  if (!name) return "";
  return name.split(".").pop().toLowerCase();
}

function fileMatchesHistoryFilter(file, historyFilter) {
  if (!historyFilter || !file.created_at) return true;
  const fileDate = new Date(file.created_at);
  const now = new Date();
  switch (historyFilter) {
    case "recent":
      return (now - fileDate) < 3 * 24 * 60 * 60 * 1000;
    case "3d": {
      const threeDaysAgo = new Date(now);
      const sevenDaysAgo = new Date(now);
      threeDaysAgo.setDate(now.getDate() - 3);
      sevenDaysAgo.setDate(now.getDate() - 7);
      return fileDate >= sevenDaysAgo && fileDate < threeDaysAgo;
    }
    case "1w": {
      const oneWeekAgo = new Date(now);
      const oneMonthAgo = new Date(now);
      oneWeekAgo.setDate(now.getDate() - 7);
      oneMonthAgo.setMonth(now.getMonth() - 1);
      return fileDate >= oneMonthAgo && fileDate < oneWeekAgo;
    }
    case "1m": {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      return fileDate < monthAgo;
    }
    default:
      return true;
  }
}

// --- Get doctor IDs for "shared_with_others" ---
function useDoctorIds() {
  const [doctorIds, setDoctorIds] = useState([]);
  useEffect(() => {
    async function fetchDoctorIds() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'doctor');
      if (!error && data) setDoctorIds(data.map(d => d.id));
    }
    fetchDoctorIds();
  }, []);
  return doctorIds;
}

// --- FILTER for ALL ---
function fileMatchesAllFilter(file, allFilter, currentUserId, doctorIds) {
  if (!allFilter || allFilter === "all") return true;
  switch (allFilter) {
    case "mine":
      return file.owner_id === currentUserId;
    case "shared_with_me":
      return file.shared_with_ids && file.shared_with_ids.includes(currentUserId);
    case "shared_with_others":
      return (
        file.owner_id === currentUserId &&
        file.shared_with_ids &&
        file.shared_with_ids.length > 0
      );
    default:
      return true;
  }
}

// --- FolderCard ---
function FolderCard({
  name,
  id,
  onOpenFolder,
  onUploadClick,
  onRename,
  onDelete,
  onShare,
}) {
  const [dropdown, setDropdown] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        setDropdown(false);
      }
    }
    if (dropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdown]);

  return (
    <div
      className="bg-[#55A1A4] text-white p-4 rounded-lg shadow-md flex justify-between items-center relative cursor-pointer"
      ref={cardRef}
    >
      <div className="flex items-center" onClick={onOpenFolder} title="Open Folder">
        <div className="mr-2 text-white">
          <Cross className="mr-2 text-white" />
        </div>
        <span className="font-medium">{name}</span>
      </div>
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDropdown((d) => !d);
          }}
        >
          <MoreVertical className="w-5 h-5" />
        </button>
        {dropdown && (
          <div className="absolute right-0 top-full w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDropdown(false);
                onUploadClick();
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-indigo-50 transition-colors"
            >
              <FilePlus size={18} className="text-indigo-500" />
              Upload File
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDropdown(false);
                onRename(id, name);
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-indigo-50 transition-colors"
            >
              <Edit size={18} className="text-blue-500" />
              Rename Folder
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDropdown(false);
                onDelete(id, name);
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={18} className="text-red-500" />
              Delete Folder
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDropdown(false);
                if (onShare) onShare({ id, name, type: "folder" });
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-teal-50 transition-colors"
            >
              <Share size={18} className="text-teal-500" />
              Share Folder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- FileCard ---
function FileCard({ file, onRename, onDelete, maxFileNameLength, onPreview, onShare }) {
  const [dropdown, setDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const { name, preview_url: previewUrl, created_at: createdAt, id, file_path: filePath } = file;

  const ext = name.split(".").pop().toLowerCase();
  const formattedDate = createdAt ? new Date(createdAt).toLocaleDateString() : "";

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdown(false);
      }
    }
    if (dropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdown]);

  return (
    <div className="bg-[#55A1A4] rounded-lg shadow-md overflow-hidden">
      <div className="p-2 flex justify-between items-center">
        <div className="flex items-center min-w-0 flex-1">
          <FileText className="mr-2 text-white flex-shrink-0" />
          <button
            type="button"
            className="text-white text-sm font-medium hover:text-indigo-200 transition truncate text-left"
            title={name}
            onClick={() => onPreview(file)}
            style={{ background: "none", border: "none", padding: 0, margin: 0 }}
          >
            {truncateFileName(name, maxFileNameLength)}
          </button>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setDropdown(!dropdown)}>
            <MoreVertical className="w-5 h-5 text-white" />
          </button>
          {dropdown && (
            <div className="absolute right-0 top-full w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
              <button
                onClick={() => {
                  setDropdown(false);
                  onRename(id, name);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-indigo-50 transition-colors"
              >
                <Edit size={16} className="text-blue-500" />
                Rename
              </button>
              <button
                onClick={() => {
                  setDropdown(false);
                  onDelete(id, name, filePath);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={16} className="text-red-500" />
                Delete
              </button>
              <button
                onClick={() => {
                  setDropdown(false);
                  if (onShare) onShare({ id: file.id, name: file.name, type: "file" });
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-teal-50 transition-colors"
              >
                <Share size={16} className="text-teal-500" />
                Share File
              </button>
            </div>
          )}
        </div>
      </div>
      <div
        className="bg-white p-2 cursor-pointer"
        onClick={() => onPreview(file)}
        title="Click to preview"
      >
        {previewUrl ? (
          ext === "pdf" ? (
            <iframe
              src={previewUrl}
              title={`Preview of ${name}`}
              className="w-full h-40 rounded border"
              style={{ border: 'none' }}
            />
          ) : (
            <img
              src={previewUrl}
              alt={`Preview of ${name}`}
              className="w-full h-40 object-cover rounded"
            />
          )
        ) : (
          <div className="w-full h-40 rounded bg-gray-100 flex items-center justify-center text-gray-300">
            No Preview
          </div>
        )}
      </div>
      <div className="p-2 text-white">
        <div className="flex justify-between items-center mt-1">
          {/*<div className="text-xs">Type: Medical</div>*/}
          <div className="text-xs">Date: {formattedDate}</div>
        </div>
      </div>
    </div>
  );
}

// --- FileListItem ---
function FileListItem({ file, onRename, onDelete, maxFileNameLength, onPreview, onShare }) {
  const [dropdown, setDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const { name, preview_url: previewUrl, created_at: createdAt, id, file_path: filePath } = file;

  const ext = name.split(".").pop().toLowerCase();
  const formattedDate = createdAt ? new Date(createdAt).toLocaleDateString() : "";

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdown(false);
      }
    }
    if (dropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdown]);

  return (
    <div className="bg-[#55A1A4] rounded-lg shadow-md">
      <div className="flex p-2">
        <div
          className="w-16 h-16 bg-white rounded mr-3 flex-shrink-0 flex items-center justify-center cursor-pointer overflow-hidden"
          onClick={() => onPreview(file)}
        >
          {previewUrl ? (
            ext === "pdf" ? (
              <iframe
                src={previewUrl}
                title={`Preview of ${name}`}
                className="w-full h-full rounded border"
                style={{ border: 'none' }}
              />
            ) : (
              <img
                src={previewUrl}
                alt={`Preview of ${name}`}
                className="w-full h-full object-cover rounded cursor-pointer"
              />
            )
          ) : (
            <div className="w-full h-full rounded bg-gray-100 flex items-center justify-center text-gray-300">
              No Preview
            </div>
          )}
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center min-w-0 flex-1">
              <FileText className="mr-1 text-white flex-shrink-0" />
              <button
                type="button"
                className="text-white text-sm font-medium hover:text-indigo-200 transition truncate text-left"
                title={name}
                onClick={() => onPreview(file)}
                style={{ background: "none", border: "none", padding: 0, margin: 0 }}
              >
                {truncateFileName(name, maxFileNameLength)}
              </button>
            </div>
            <div className="relative" ref={dropdownRef} style={{ zIndex: 50 }}>
              <button onClick={() => setDropdown(!dropdown)}>
                <MoreVertical className="w-5 h-5 text-white" />
              </button>
              {dropdown && (
                <div className="absolute right-0 top-full w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => {
                      setDropdown(false);
                      onRename(id, name);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-indigo-50 transition-colors"
                  >
                    <Edit size={16} className="text-blue-500" />
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      setDropdown(false);
                      onDelete(id, name, filePath);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} className="text-red-500" />
                    Delete
                  </button>
                  <button
                    onClick={() => {
                      setDropdown(false);
                      if (onShare) onShare({ id: file.id, name: file.name, type: "file" });
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-teal-50 transition-colors"
                  >
                    <Share size={16} className="text-teal-500" />
                    Share File
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="text-white">
            <div className="flex justify-between items-center mt-1">
              {/*<div className="text-xs">Type: Medical</div>*/}
              <div className="text-xs">Date: {formattedDate}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Records Component ---
export default function Records({ currentUserId: propUserId }) {
  const [currentUserId, setCurrentUserId] = useState(propUserId || null);
  const doctorIds = useDoctorIds();

  useEffect(() => {
    if (!propUserId) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.id) setCurrentUserId(data.user.id);
        else setCurrentUserId(null);
      });
    }
  }, [propUserId]);

  const fileInputRef = useRef(null);
  const folderFileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [folderUploadTarget, setFolderUploadTarget] = useState(null);

  const [previewFile, setPreviewFile] = useState(null);

  // Filters
  const [fileTypeFilter, setFileTypeFilter] = useState(null);
  const [historyFilter, setHistoryFilter] = useState(null);
  const [allFilter, setAllFilter] = useState("all");

  // Single filter dropdown state
  const [openFilterDropdown, setOpenFilterDropdown] = useState(null);

  // Filter dropdown refs
  const typeDropdownRef = useRef(null);
  const historyDropdownRef = useRef(null);
  const allDropdownRef = useRef(null);

  // Close filter dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        !typeDropdownRef.current?.contains(event.target) &&
        !historyDropdownRef.current?.contains(event.target) &&
        !allDropdownRef.current?.contains(event.target)
      ) {
        setOpenFilterDropdown(null);
      }
    }
    if (openFilterDropdown) {
      document.addEventListener("mousedown", handleClickOutside, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [openFilterDropdown]);

  // Share modal state
  const [shareModal, setShareModal] = useState({ open: false, file: null });

  // --- Modal state ---
  const [renameModal, setRenameModal] = useState({
    open: false,
    type: null, // 'file' or 'folder'
    id: null,
    currentName: "",
  });
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    type: null,
    id: null,
    name: "",
    filePath: null,
  });
  const [successModal, setSuccessModal] = useState({
    open: false,
    title: "",
    message: "",
  });

  // --- Create Folder Modal state ---
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);

  // --- Data fetching ---
  useEffect(() => {
    fetchFolders();
    fetchFiles();
    // eslint-disable-next-line
  }, [currentUserId]);

  async function fetchFolders() {
    if (!currentUserId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("owner_id", currentUserId)
      .order("created_at", { ascending: true });
    if (error) setFolders([]);
    else setFolders(data || []);
    setLoading(false);
  }

  async function fetchFiles() {
    if (!currentUserId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("medical_files")
      .select("*")
      .or(`owner_id.eq.${currentUserId},shared_with_ids.cs.{${currentUserId}}`)
      .order("created_at", { ascending: true });
    if (error) setFiles([]);
    else setFiles(data || []);
    setLoading(false);
  }

  // --- File/folder CRUD handlers ---
  const handleFileChange = async (e, folder_id = null) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!currentUserId) { alert("User not authenticated"); return; }
    setFileName(file.name);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("medical-files")
      .upload(`files/${currentUserId}/${Date.now()}_${file.name}`, file);
    if (uploadError) { alert("Upload error: " + uploadError.message); return; }
    const { data: publicUrlData } = supabase.storage
      .from("medical-files")
      .getPublicUrl(uploadData.path);
    const { error: insertError } = await supabase.from("medical_files").insert([
      {
        name: file.name,
        file_path: uploadData.path,
        file_url: publicUrlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        preview_url: publicUrlData.publicUrl,
        folder_id: folder_id,
        owner_id: currentUserId,
        shared_with_ids: [],
      },
    ]);
    if (insertError) { alert("DB error: " + insertError.message); }
    setFileName("");
    await fetchFiles();
    e.target.value = "";
  };

  const handleFolderFileChange = (e) => {
    if (folderUploadTarget) {
      handleFileChange(e, folderUploadTarget);
      setFolderUploadTarget(null);
    }
    e.target.value = "";
  };

  const handleDropdownToggle = () => setDropdownOpen((v) => !v);

  // --- Modal-based Rename/Delete handlers ---
  const handleRenameFile = (fileId, currentName) => {
    setRenameModal({ open: true, type: "file", id: fileId, currentName });
  };
  const handleRenameFolder = (folderId, currentName) => {
    setRenameModal({ open: true, type: "folder", id: folderId, currentName });
  };

  const handleDeleteFile = (fileId, fileName, filePath) => {
    setDeleteModal({
      open: true,
      type: "file",
      id: fileId,
      name: fileName,
      filePath,
    });
  };
  const handleDeleteFolder = (folderId, folderName) => {
    setDeleteModal({
      open: true,
      type: "folder",
      id: folderId,
      name: folderName,
      filePath: null,
    });
  };

  const getFileExtension = (name) => {
    if (!name) return "";
    const lastDot = name.lastIndexOf(".");
    if (lastDot === -1) return "";
    return name.slice(lastDot + 1).toLowerCase();
  };

  const doRename = async (newName) => {
    if (!renameModal.open) return;

    // ---------- FILE RENAME ----------
    if (renameModal.type === "file") {
      const file = files.find(f => f.id === renameModal.id);
      if (!file || file.owner_id !== currentUserId) {
        setRenameModal({ open: false, type: null, id: null, currentName: "" });
        setSuccessModal({
          open: true,
          title: "Rename Failed",
          message: "You can only rename files you own.",
        });
        return;
      }

      // Prevent extension rename
      const oldExt = getFileExtension(file.name);
      const newExt = getFileExtension(newName);
      if (oldExt !== newExt) {
        setRenameModal({ open: false, type: null, id: null, currentName: "" });
        setSuccessModal({
          open: true,
          title: "Rename Failed",
          message: `You cannot change the file extension. Please keep the extension as ".${oldExt}".`,
        });
        return;
      }

      const { error } = await supabase
        .from("medical_files")
        .update({ name: newName })
        .eq("id", renameModal.id)
        .eq("owner_id", currentUserId);
      if (error) {
        setSuccessModal({
          open: true,
          title: "Rename Failed",
          message: error.message,
        });
      } else {
        await fetchFiles();
        setSuccessModal({
          open: true,
          title: "Success!",
          message: `Renamed "${renameModal.currentName}" to "${newName}".`,
        });
      }
    }

    // ---------- FOLDER RENAME ----------
    else if (renameModal.type === "folder") {
      const folder = folders.find(f => f.id === renameModal.id);
      if (!folder || folder.owner_id !== currentUserId) {
        setRenameModal({ open: false, type: null, id: null, currentName: "" });
        setSuccessModal({
          open: true,
          title: "Rename Failed",
          message: "You can only rename folders you own.",
        });
        return;
      }
      const { error } = await supabase
        .from("folders")
        .update({ name: newName })
        .eq("id", renameModal.id)
        .eq("owner_id", currentUserId);
      if (error) {
        setSuccessModal({
          open: true,
          title: "Rename Failed",
          message: error.message,
        });
      } else {
        await fetchFolders();
        setSuccessModal({
          open: true,
          title: "Success!",
          message: `Renamed "${renameModal.currentName}" to "${newName}".`,
        });
      }
    }

    setRenameModal({ open: false, type: null, id: null, currentName: "" });
  };

  const doDelete = async () => {
    if (!deleteModal.open) return;
    if (deleteModal.type === "file") {
      const file = files.find(f => f.id === deleteModal.id);
      if (!file || file.owner_id !== currentUserId) {
        setDeleteModal({ open: false, type: null, id: null, name: "", filePath: null });
        setSuccessModal({
          open: true,
          title: "Delete Failed",
          message: "You can only delete files you own.",
        });
        return;
      }
      if (deleteModal.filePath) {
        await supabase.storage.from("medical-files").remove([deleteModal.filePath]);
      }
      const { error: dbError } = await supabase
        .from("medical_files")
        .delete()
        .eq("id", deleteModal.id)
        .eq("owner_id", currentUserId);
      if (dbError) {
        setSuccessModal({
          open: true,
          title: "Delete Failed",
          message: dbError.message,
        });
      } else {
        await fetchFiles();
        setSuccessModal({
          open: true,
          title: "Deleted!",
          message: `Deleted "${deleteModal.name}".`,
        });
      }
      setPreviewFile(pf => (pf && pf.id === deleteModal.id ? null : pf));
    } else if (deleteModal.type === "folder") {
      const folder = folders.find(f => f.id === deleteModal.id);
      if (!folder || folder.owner_id !== currentUserId) {
        setDeleteModal({ open: false, type: null, id: null, name: "", filePath: null });
        setSuccessModal({
          open: true,
          title: "Delete Failed",
          message: "You can only delete folders you own.",
        });
        return;
      }
      const filesInFolder = files.filter(file => file.folder_id === deleteModal.id && file.owner_id === currentUserId);
      for (const file of filesInFolder) {
        await supabase.storage.from("medical-files").remove([file.file_path]);
        await supabase.from("medical_files").delete().eq("id", file.id).eq("owner_id", currentUserId);
      }
      const { error } = await supabase
        .from("folders")
        .delete()
        .eq("id", deleteModal.id)
        .eq("owner_id", currentUserId);
      if (error) {
        setSuccessModal({
          open: true,
          title: "Delete Failed",
          message: error.message,
        });
      } else {
        await fetchFolders();
        await fetchFiles();
        setActiveFolderId(af => (af === deleteModal.id ? null : af));
        setSuccessModal({
          open: true,
          title: "Deleted!",
          message: `Deleted folder "${deleteModal.name}".`,
        });
      }
    }
    setDeleteModal({ open: false, type: null, id: null, name: "", filePath: null });
  };

  // --- Share handler for both files and folders ---
  function handleShare({ id, name, type }) {
    setShareModal({ open: true, file: { id, name, type } });
  }

  // --- Render logic ---
  const displayedFiles = (activeFolderId
    ? files.filter((file) => file.folder_id === activeFolderId)
    : files.filter((file) => !file.folder_id)
  ).filter(file => {
    const canSeeFile = file.owner_id === currentUserId ||
      (file.shared_with_ids && file.shared_with_ids.includes(currentUserId));
    if (!canSeeFile) return false;
    if (fileTypeFilter) {
      const ext = getFileExtension(file.name);
      if (fileTypeFilter === "jpg") {
        if (!(ext === "jpg" || ext === "jpeg")) return false;
      } else if (ext !== fileTypeFilter) {
        return false;
      }
    }
    if (!fileMatchesHistoryFilter(file, historyFilter)) return false;
    if (!fileMatchesAllFilter(file, allFilter, currentUserId, doctorIds)) return false;
    return true;
  });

  const activeFolder = folders.find((f) => f.id === activeFolderId);
  const maxFileNameLength = useMaxFileNameLength();

  if (!currentUserId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Please log in to view your medical records.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-myHeader text-left flex items-center">
          {activeFolderId ? (
            <>
              <button
                title="Back"
                className="mr-1 text-indigo-400 hover:text-indigo-700"
                onClick={() => {
                  setActiveFolderId(null);
                  setPreviewFile(null);
                }}
              >
                <ArrowLeft size={22} />
              </button>
              {activeFolder?.name || "Folder"}
            </>
          ) : (
            "Medical Records"
          )}
        </h1>
        <div className="relative flex items-center" ref={dropdownRef}>
          <button
            onClick={handleDropdownToggle}
            className="flex items-center gap-2 px-2 py-2 text-mySidebar rounded-md hover:bg-indigo-200 transition-colors"
          >
            <SquarePlus size={20} />
            <ChevronDown size={16} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  fileInputRef.current.click();
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-indigo-50 transition-colors"
              >
                <FilePlus size={18} className="text-indigo-500" />
                File Upload
              </button>
              {!activeFolderId && (
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    setCreateFolderModalOpen(true);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-indigo-50 transition-colors"
                >
                  <FolderPlus size={18} className="text-emerald-500" />
                  Create Folder
                </button>
              )}
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={e => handleFileChange(e, activeFolderId || null)}
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
          <input
            type="file"
            ref={folderFileInputRef}
            className="hidden"
            onChange={handleFolderFileChange}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
          <button
            title="List View"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-2 px-2 py-2 rounded-md hover:bg-indigo-200 transition-colors ${
              viewMode === "list"
                ? "bg-indigo-200 text-mySidebar"
                : "text-mySidebar"
            }`}
          >
            <Rows3 size={20} />
          </button>
          <button
            title="Grid View"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-2 px-2 py-2 rounded-md hover:bg-indigo-200 transition-colors ${
              viewMode === "grid"
                ? "bg-indigo-200 text-mySidebar"
                : "text-mySidebar"
            }`}
          >
            <LayoutGrid size={20} />
          </button>
        </div>
      </div>
      {fileName && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md flex items-center">
          <span className="font-medium">Selected file:</span>
          <span className="ml-2">{fileName}</span>
        </div>
      )}

      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {!activeFolderId && (
            <>
              {/* Filter Row */}
              <div className="flex flex-row flex-wrap gap-1 mb-4 items-stretch">
                {/* --- Type Filter Dropdown --- */}
                <div className="relative flex" ref={typeDropdownRef}>
                  <button
                    className="border border-[#e37859] rounded-md px-2 py-1 bg-transparent text-[#a95e4b] text-sm flex items-center hover:border-[#549294] transition-colors"
                    onClick={() =>
                      setOpenFilterDropdown(openFilterDropdown === "type" ? null : "type")
                    }
                  >
                    <span>
                      {fileTypeFilter
                        ? (FILE_TYPE_FILTERS.find(f => f.value === fileTypeFilter)?.label ?? "Type")
                        : "Type"}
                    </span>
                    <ChevronDown size={15} className="ml-1 text-[#e37859]" />
                  </button>
                  {openFilterDropdown === "type" && (
                    <div className="absolute left-0 mt-9 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-0">
                      <button
                        className="w-full text-left px-4 py-2 text-[#a95e4b] hover:bg-indigo-50"
                        onClick={() => {
                          setFileTypeFilter(null);
                          setOpenFilterDropdown(null);
                        }}
                      >All</button>
                      {FILE_TYPE_FILTERS.map(({ label, value }) => (
                        <button
                          key={value}
                          className="w-full text-left px-4 py-2 text-[#a95e4b] hover:bg-indigo-50"
                          onClick={() => {
                            setFileTypeFilter(value);
                            setOpenFilterDropdown(null);
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* --- History Filter Dropdown --- */}
                <div className="relative flex" ref={historyDropdownRef}>
                  <button
                    className="border border-[#e37859] rounded-md px-2 py-1 bg-transparent text-[#a95e4b] text-sm flex items-center hover:border-[#549294] transition-colors"
                    onClick={() =>
                      setOpenFilterDropdown(openFilterDropdown === "history" ? null : "history")
                    }
                  >
                    <span>
                      {historyFilter
                        ? (HISTORY_FILTERS.find(f => f.value === historyFilter)?.label ?? "History")
                        : "History"}
                    </span>
                    <ChevronDown size={15} className="ml-1 text-[#e37859]" />
                  </button>
                  {openFilterDropdown === "history" && (
                    <div className="absolute left-0 mt-9 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-0">
                      <button
                        className="w-full text-left px-4 py-2 text-[#a95e4b] hover:bg-indigo-50"
                        onClick={() => {
                          setHistoryFilter(null);
                          setOpenFilterDropdown(null);
                        }}
                      >All</button>
                      {HISTORY_FILTERS.map(({ label, value }) => (
                        <button
                          key={value}
                          className="w-full text-left px-4 py-2 text-[#a95e4b] hover:bg-indigo-50"
                          onClick={() => {
                            setHistoryFilter(value);
                            setOpenFilterDropdown(null);
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* --- All Filter Dropdown --- */}
                <div className="relative flex" ref={allDropdownRef}>
                  <button
                    className="border border-[#e37859] rounded-md px-2 py-1 bg-transparent text-[#a95e4b] text-sm flex items-center hover:border-[#549294] transition-colors"
                    onClick={() =>
                      setOpenFilterDropdown(openFilterDropdown === "all" ? null : "all")
                    }
                  >
                    <span>
                      {allFilter
                        ? (ALL_FILTERS.find(f => f.value === allFilter)?.label ?? "All")
                        : "All"}
                    </span>
                    <ChevronDown size={15} className="ml-1 text-[#e37859]" />
                  </button>
                  {openFilterDropdown === "all" && (
                    <div className="absolute left-0 mt-9 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-0">
                      {ALL_FILTERS.map(({ label, value }) => (
                        <button
                          key={value}
                          className="w-full text-left px-4 py-2 text-[#a95e4b] hover:bg-indigo-50"
                          onClick={() => {
                            setAllFilter(value);
                            setOpenFilterDropdown(null);
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {folders.length === 0 && !loading && (
                  <div className="col-span-4 text-center text-gray-400">
                    No folders yet.
                  </div>
                )}
                {folders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    name={folder.name}
                    id={folder.id}
                    onOpenFolder={() => {
                      setActiveFolderId(folder.id);
                      setPreviewFile(null);
                    }}
                    onUploadClick={() => {
                      setFolderUploadTarget(folder.id);
                      setTimeout(() => {
                        folderFileInputRef.current.click();
                      }, 0);
                    }}
                    onRename={handleRenameFolder}
                    onDelete={handleDeleteFolder}
                    onShare={handleShare}
                  />
                ))}
              </div>
            </>
          )}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {displayedFiles.length === 0 && !loading && (
                <div className="col-span-4 text-center text-gray-400">
                  No files yet.
                </div>
              )}
              {displayedFiles.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onRename={handleRenameFile}
                  onDelete={handleDeleteFile}
                  maxFileNameLength={maxFileNameLength}
                  onPreview={setPreviewFile}
                  onShare={handleShare}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {displayedFiles.length === 0 && !loading && (
                <div className="text-center text-gray-400">No files yet.</div>
              )}
              {displayedFiles.map((file) => (
                <FileListItem
                  key={file.id}
                  file={file}
                  onRename={handleRenameFile}
                  onDelete={handleDeleteFile}
                  maxFileNameLength={maxFileNameLength}
                  onPreview={setPreviewFile}
                  onShare={handleShare}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="fixed bottom-4 right-4">
        <button className="bg-red-50 text-red-400 p-4 rounded-lg shadow-md flex flex-col items-center">
          <Share className="w-6 h-6 mb-1" />
          <span className="text-xs">Share Report</span>
        </button>
      </div>
      {/* Share Modal */}
      <ShareModal
        isOpen={shareModal.open}
        onClose={() => setShareModal({ open: false, file: null })}
        item={shareModal.file}
        currentUserId={currentUserId}
        supabase={supabase}
      />

      {/* --- FILE PREVIEW MODAL --- */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg p-4 max-w-lg w-full relative shadow-2xl border">
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              title="Close preview"
            >
              <X size={22} />
            </button>
            <div className="mb-2 font-semibold truncate">{previewFile.name}</div>
            <div className="flex-1 flex items-center justify-center overflow-auto my-4">
              {previewFile.preview_url ? (
                previewFile.name.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={previewFile.preview_url}
                    title={`Preview of ${previewFile.name}`}
                    className="w-full h-[60vh] rounded border"
                  />
                ) : (
                  <img
                    src={previewFile.preview_url}
                    alt={`Preview of ${previewFile.name}`}
                    className="max-h-[60vh] w-auto rounded"
                  />
                )
              ) : (
                <div className="text-gray-400">No Preview Available</div>
              )}
            </div>
            <div className="mt-4 text-right">
              <a
                href={previewFile.preview_url}
                download={previewFile.name}
                className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Download
              </a>
            </div>
          </div>
        </div>
      )}

      {/* --- Rename Modal --- */}
      <RenameModal
        open={renameModal.open}
        currentName={renameModal.currentName}
        onRename={doRename}
        onClose={() => setRenameModal({ open: false, type: null, id: null, currentName: "" })}
        label={renameModal.type === "file" ? "Rename File" : "Rename Folder"}
        placeholder={renameModal.type === "file" ? "New file name" : "New folder name"}
      />

      {/* --- Delete Confirmation Modal --- */}
      <ActionModal
        open={deleteModal.open}
        title={`Delete ${deleteModal.type === "file" ? "File" : "Folder"}?`}
        message={`Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={doDelete}
        onCancel={() => setDeleteModal({ open: false, type: null, id: null, name: "", filePath: null })}
      />

      {/* --- Create Folder Modal --- */}
      <CreateFolderModal
        open={createFolderModalOpen}
        onCreate={async (folderName) => {
          setCreateFolderModalOpen(false);
          if (!currentUserId) {
            alert("User not authenticated");
            return;
          }
          const { error } = await supabase.from("folders").insert([{ name: folderName, owner_id: currentUserId }]);
          if (error) {
            alert("DB error: " + error.message);
          } else {
            await fetchFolders();
          }
        }}
        onClose={() => setCreateFolderModalOpen(false)}
      />

      {/* --- Success Modal (optional) ---
      <SuccessModal
        open={successModal.open}
        title={successModal.title}
        message={successModal.message}
        onClose={() => setSuccessModal({ open: false, title: "", message: "" })}
      />*/}
    </div>
  );
}