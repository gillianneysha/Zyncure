import {
 SquarePlus, FolderPlus, FilePlus, LayoutGrid, Rows3, MoreVertical,
 FileText, Share, Cross, ChevronDown, ArrowLeft, Edit, Trash2,
 X,
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
 const [width, setWidth] = useState(
   typeof window !== "undefined" ? window.innerWidth : 1200
 );
 useEffect(() => {
   function handleResize() {
     setWidth(window.innerWidth);
   }
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
 if (lastDot === -1 || lastDot === 0)
   return fileName.slice(0, maxLength - 3) + "...";
 const extension = fileName.slice(lastDot + 1);
 const keep = maxLength - extension.length - 4;
 if (keep <= 0) return "..." + fileName.slice(lastDot);
 return fileName.slice(0, keep) + "..." + "." + extension;
}


function fileMatchesHistoryFilter(file, historyFilter) {
 if (!historyFilter || !file.created_at) return true;
 const fileDate = new Date(file.created_at);
 const now = new Date();
 switch (historyFilter) {
   case "recent":
     return now - fileDate < 3 * 24 * 60 * 60 * 1000;
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


// --- FILTER for ALL (for files) ---
function fileMatchesAllFilter(file, allFilter, currentUserId) {
 if (!allFilter || allFilter === "all") return true;
 switch (allFilter) {
   case "mine":
     return file.owner_id === currentUserId;
   case "shared_with_me":
     return Array.isArray(file.shared_with_ids) && file.shared_with_ids.includes(currentUserId);
   case "shared_with_others":
     return (
       file.owner_id === currentUserId &&
       Array.isArray(file.shared_with_ids) &&
       file.shared_with_ids.length > 0 &&
       file.shared_with_ids.some(uid => uid && uid !== currentUserId)
     );
   default:
     return true;
 }
}


// --- FILTER for ALL (for folders) ---
function folderMatchesAllFilter(folder, allFilter, currentUserId, files) {
 if (!folder || !allFilter || allFilter === "all") return true;
 switch (allFilter) {
   case "mine":
     return folder.owner_id === currentUserId;
   case "shared_with_others":
     return (
       folder.owner_id === currentUserId &&
       files.some(
         file =>
           file.folder_id === folder.id &&
           file.owner_id === currentUserId &&
           Array.isArray(file.shared_with_ids) &&
           file.shared_with_ids.length > 0 &&
           file.shared_with_ids.some(uid => uid && uid !== currentUserId)
       )
     );
   case "shared_with_me":
     return (
       files.some(
         file =>
           file.folder_id === folder.id &&
           Array.isArray(file.shared_with_ids) &&
           file.shared_with_ids.includes(currentUserId)
       )
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
     <div
       className="flex items-center"
       onClick={onOpenFolder}
       title="Open Folder"
     >
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
function FileCard({
 file,
 onRename,
 onDelete,
 maxFileNameLength,
 onPreview,
 onShare,
 isPatient,
}) {
 // HOOKS FIRST!
 const [dropdown, setDropdown] = useState(false);
 const dropdownRef = useRef(null);


 if (!file) return null;


 const {
   name,
   preview_url: previewUrl,
   created_at: createdAt,
   id,
   file_path: filePath,
   consultation_notes = [],
 } = file;


 const ext = name.split(".").pop().toLowerCase();
 const formattedDate = createdAt
   ? new Date(createdAt).toLocaleDateString()
   : "";


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


 // --- hide consultation notes for doctor-note PDFs
 const hideNotes = name && name.startsWith('doctor-note-');


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
           style={{
             background: "none",
             border: "none",
             padding: 0,
             margin: 0,
           }}
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
                 if (onShare)
                   onShare({ id: file.id, name: file.name, type: "file" });
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
             style={{ border: "none" }}
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
         <div className="text-xs">Date: {formattedDate}</div>
       </div>
     </div>
     {/* REMOVE notes rendering from here */}
   </div>
 );
}


// --- FileListItem ---
function FileListItem({
 file,
 onRename,
 onDelete,
 maxFileNameLength,
 onPreview,
 onShare,
 isPatient,
}) {
 if (!file) return null;
 const {
   name,
   preview_url: previewUrl,
   created_at: createdAt,
   id,
   file_path: filePath,
   consultation_notes = [],
 } = file;


 const ext = name.split(".").pop().toLowerCase();
 const formattedDate = createdAt
   ? new Date(createdAt).toLocaleDateString()
   : "";


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


 const [dropdown, setDropdown] = useState(false);
 const dropdownRef = useRef(null);


 // --- hide consultation notes for doctor-note PDFs
 const hideNotes = name && name.startsWith('doctor-note-');


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
               style={{ border: "none" }}
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
               style={{
                 background: "none",
                 border: "none",
                 padding: 0,
                 margin: 0,
               }}
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
                     if (onShare)
                       onShare({ id: file.id, name: file.name, type: "file" });
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
             <div className="text-xs">Date: {formattedDate}</div>
           </div>
         </div>
       </div>
     </div>
     {/* --- Hide notes for doctor-note- PDFs and for patients ---
     {consultation_notes.length > 0 && !hideNotes && !isPatient && (
       <div className="bg-white p-2 mt-1 rounded">
         <div className="font-semibold text-[#55A1A4] mb-1">Consultation Notes:</div>
         {consultation_notes.map((note, idx) => (
           <div key={note.id || idx} className="mb-2">
             <div className="text-xs text-gray-500">
               By {note.doctor_id} on {new Date(note.created_at).toLocaleString()}
             </div>
             <div className="text-sm">{note.note}</div>
           </div>
         ))}
       </div>
     )}*/}
   </div>
 );
}


// --- Fetch doctor names by IDs for consultation notes ---
async function fetchDoctorsMap(doctorIds) {
 if (!doctorIds.length) return {};
 const { data, error } = await supabase
   .from("medicalprofessionals")
   .select("med_id, first_name, last_name")
   .in("med_id", doctorIds);
 if (error || !data) return {};
 const map = {};
 for (const doc of data) {
   let name = "";
   if (doc.first_name || doc.last_name) {
     name = [doc.first_name, doc.last_name].filter(Boolean).join(" ");
   }
   map[doc.med_id] = name || doc.med_id; // fallback to med_id for debug
 }
 return map;
}


// --- Fetch consultation notes for all files ---
async function fetchConsultationNotes(fileIds) {
 if (!fileIds.length) return {};
 const { data, error } = await supabase
   .from('consultation_notes')
   .select('*')
   .in('file_id', fileIds);
 if (error) {
   console.error('Error fetching notes:', error);
   return {};
 }
 return (data || []).reduce((acc, note) => {
   (acc[note.file_id] = acc[note.file_id] || []).push(note);
   return acc;
 }, {});
}


// --- Main Records Component ---
export default function Records({ currentUserId: propUserId, isPatient: propIsPatient }) {
 const [doctorMap, setDoctorMap] = useState({});
 const isPatient = typeof propIsPatient !== "undefined" ? propIsPatient : true;
 const [currentUserId, setCurrentUserId] = useState(propUserId || null);
 const [storageInfo, setStorageInfo] = useState(null);
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
 const [folderHeaderDropdown, setFolderHeaderDropdown] = useState(false);
 const folderHeaderDropdownRef = useRef(null);
 const [previewFile, setPreviewFile] = useState(null);
 const [fileTypeFilter, setFileTypeFilter] = useState(null);
 const [historyFilter, setHistoryFilter] = useState(null);
 const [allFilter, setAllFilter] = useState("all");
 const [openFilterDropdown, setOpenFilterDropdown] = useState(null);
 const typeDropdownRef = useRef(null);
 const historyDropdownRef = useRef(null);
 const allDropdownRef = useRef(null);
 const [shareModal, setShareModal] = useState({ open: false, file: null });
 const [renameModal, setRenameModal] = useState({
   open: false,
   type: null,
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
 const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);


 useEffect(() => {
   if (!propUserId) {
     supabase.auth.getUser().then(({ data }) => {
       if (data?.user?.id) setCurrentUserId(data.user.id);
       else setCurrentUserId(null);
     });
   }
 }, [propUserId]);


 useEffect(() => {
   if (currentUserId) {
     fetchStorageInfo();
   }
 }, [currentUserId]);


 useEffect(() => {
   fetchFolders();
   fetchFiles();
   // eslint-disable-next-line
 }, [currentUserId]);


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


 useEffect(() => {
   function handleClickOutside(event) {
     if (folderHeaderDropdownRef.current && !folderHeaderDropdownRef.current.contains(event.target)) {
       setFolderHeaderDropdown(false);
     }
   }
   if (folderHeaderDropdown) {
     document.addEventListener("mousedown", handleClickOutside);
   }
   return () => {
     document.removeEventListener("mousedown", handleClickOutside);
   };
 }, [folderHeaderDropdown]);


 useEffect(() => {
   async function getDoctorNames() {
     if (!previewFile || !previewFile.consultation_notes) {
       setDoctorMap({});
       return;
     }
     const doctorIds = [
       ...new Set(previewFile.consultation_notes.map(n => n.doctor_id).filter(Boolean))
     ];
     if (doctorIds.length) {
       const docMap = await fetchDoctorsMap(doctorIds);
       setDoctorMap(docMap);
     } else {
       setDoctorMap({});
     }
   }
   getDoctorNames();
   // eslint-disable-next-line
 }, [previewFile]);


 const fetchStorageInfo = async () => {
   const { data, error } = await supabase
     .from('user_tier_status')
     .select('current_tier, storage_limit_mb, storage_used_mb, can_upload_files')
     .eq('user_id', currentUserId)
     .single();
   if (!error && data) {
     setStorageInfo(data);
   }
 };


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


 // 1. Files the patient owns
 const { data: ownedFiles = [] } = await supabase
   .from("medical_files")
   .select("*")
   .eq("owner_id", currentUserId);


 // 2. Files shared with the patient (doctor notes, etc)
 const { data: sharedFileShares = [] } = await supabase
   .from("file_shares")
   .select("file_id")
   .eq("shared_with_id", currentUserId)
   .eq("is_active", true);


 const sharedFileIds = sharedFileShares.map(row => row.file_id);


 let sharedFiles = [];
 if (sharedFileIds.length > 0) {
   const { data: filesFromShares = [] } = await supabase
     .from("medical_files")
     .select("*")
     .in("id", sharedFileIds);
   sharedFiles = filesFromShares;
 }


 // Merge/deduplicate
 const allFiles = [...ownedFiles, ...sharedFiles];
 const dedupedFiles = allFiles.filter(
   (file, idx, arr) => arr.findIndex(f => f.id === file.id) === idx
 );


 // Attach consultation notes
 const fileIds = dedupedFiles.map(f => f.id).filter(Boolean);
 const notesByFileId = await fetchConsultationNotes(fileIds);
 const filesWithNotes = dedupedFiles.map(file => ({
   ...file,
   consultation_notes: notesByFileId[file.id] || [],
 }));


 setFiles(filesWithNotes);
 setLoading(false);
}


 const checkTierLimits = async (newFileSize) => {
   try {
     const { data: tierStatus, error } = await supabase
       .from("user_tier_status")
       .select("*")
       .eq("user_id", currentUserId)
       .single();
     if (error) {
       console.error("Error fetching tier status:", error);
       return { allowed: false, message: "Unable to verify storage limits." };
     }
     if (!tierStatus.can_upload_files) {
       return {
         allowed: false,
         message: `Storage limit reached! You've used ${tierStatus.storage_used_mb.toFixed(
           1
         )}MB of your ${
           tierStatus.storage_limit_mb
         }MB limit. Please upgrade your plan or delete some files.`,
       };
     }
     const newFileSizeMB = newFileSize / (1024 * 1024);
     const totalAfterUpload = tierStatus.storage_used_mb + newFileSizeMB;
     if (
       tierStatus.storage_limit_mb !== -1 &&
       totalAfterUpload > tierStatus.storage_limit_mb
     ) {
       const remainingMB =
         tierStatus.storage_limit_mb - tierStatus.storage_used_mb;
       return {
         allowed: false,
         message: `File too large! You have ${remainingMB.toFixed(
           1
         )}MB remaining. This file is ${newFileSizeMB.toFixed(
           1
         )}MB. Please upgrade your plan or delete some files.`,
       };
     }
     return { allowed: true };
   } catch (error) {
     console.error("Error checking tier limits:", error);
     return { allowed: false, message: "Unable to verify storage limits." };
   }
 };


 const handleFileChange = async (e, folder_id = null) => {
   const file = e.target.files[0];
   if (!file) return;
   if (!currentUserId) {
     alert("User not authenticated");
     return;
   }
   const canUpload = await checkTierLimits(file.size);
   if (!canUpload.allowed) {
     alert(canUpload.message);
     e.target.value = "";
     return;
   }
   setFileName(file.name);
   const { data: uploadData, error: uploadError } = await supabase.storage
     .from("medical-files")
     .upload(`files/${currentUserId}/${Date.now()}_${file.name}`, file);
   if (uploadError) {
     alert("Upload error: " + uploadError.message);
     return;
   }
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
   if (insertError) {
     alert("DB error: " + insertError.message);
   }
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
   if (renameModal.type === "file") {
     const file = files.find((f) => f.id === renameModal.id);
     if (!file || file.owner_id !== currentUserId) {
       setRenameModal({ open: false, type: null, id: null, currentName: "" });
       setSuccessModal({
         open: true,
         title: "Rename Failed",
         message: "You can only rename files you own.",
       });
       return;
     }
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
   } else if (renameModal.type === "folder") {
     const folder = folders.find((f) => f.id === renameModal.id);
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
   try {
     if (deleteModal.type === "file") {
       const file = files.find((f) => f.id === deleteModal.id);
       if (!file || file.owner_id !== currentUserId) {
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
         await fetchStorageInfo();
         setSuccessModal({
           open: true,
           title: "Deleted!",
           message: `Deleted "${deleteModal.name}".`,
         });
       }
       setPreviewFile((pf) => (pf && pf.id === deleteModal.id ? null : pf));
     } else if (deleteModal.type === "folder") {
       const folder = folders.find((f) => f.id === deleteModal.id);
       if (!folder || folder.owner_id !== currentUserId) {
         setSuccessModal({
           open: true,
           title: "Delete Failed",
           message: "You can only delete folders you own.",
         });
         return;
       }
       const filesInFolder = files.filter(
         (file) => file.folder_id === deleteModal.id && file.owner_id === currentUserId
       );
       for (const file of filesInFolder) {
         await supabase.storage.from("medical-files").remove([file.file_path]);
         await supabase
           .from("medical_files")
           .delete()
           .eq("id", file.id)
           .eq("owner_id", currentUserId);
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
         setActiveFolderId((af) => (af === deleteModal.id ? null : af));
         setSuccessModal({
           open: true,
           title: "Deleted!",
           message: `Deleted folder "${deleteModal.name}".`,
         });
       }
     }
   } finally {
     setDeleteModal({ open: false, type: null, id: null, name: "", filePath: null });
   }
 };


 function handleShare({ id, name, type }) {
   setShareModal({ open: true, file: { id, name, type } });
 }


 // --- Folders only show those owned by current user
 const displayedFolders = folders.filter(folder =>
   folderMatchesAllFilter(folder, allFilter, currentUserId, files)
 );


 // --- Files: Only show files in selected folder if folder is owned by current user.
 let displayedFiles = [];

if (activeFolderId) {
  displayedFiles = files.filter(
    (file) => file.folder_id === activeFolderId
  );
} else {
  displayedFiles = files.filter(
    (file) => !file.folder_id
  );
}



 displayedFiles = displayedFiles.filter((file) => {
   if (fileTypeFilter) {
     const ext = getFileExtension(file.name);
     if (fileTypeFilter === "jpg") {
       if (!(ext === "jpg" || ext === "jpeg")) return false;
     } else if (ext !== fileTypeFilter) {
       return false;
     }
   }
   if (!fileMatchesHistoryFilter(file, historyFilter)) return false;
   if (!fileMatchesAllFilter(file, allFilter, currentUserId)) return false;
   return true;
 });


 const activeFolder = folders.find((f) => f.id === activeFolderId);
 const maxFileNameLength = useMaxFileNameLength();


 if (!currentUserId) {
   return (
     <div className="flex items-center justify-center h-full">
       <div className="text-gray-500">
         Please log in to view your medical records.
       </div>
     </div>
   );
 }


 return (
   <div className="flex flex-col h-full">
     <div className="flex justify-between items-center mb-4">
       {activeFolderId ? (
           <div className="flex justify-between items-center mb-4">
             <div className="flex items-center">
               <button
                 title="Back"
                 className="mr-2 text-indigo-400 hover:text-indigo-700"
                 onClick={() => {
                   setActiveFolderId(null);
                   setPreviewFile(null);
                 }}
               >
                 <ArrowLeft size={22} />
               </button>
               <h1 className="text-3xl font-bold text-myHeader">
                 {activeFolder?.name || "Folder"}
               </h1>
             </div>
             <div className="relative" ref={folderHeaderDropdownRef}>
               <button
                 onClick={(e) => {
                   e.stopPropagation();
                   setFolderHeaderDropdown(!folderHeaderDropdown);
                 }}
                 className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
               >
                 <MoreVertical className="w-5 h-5" />
               </button>
               {folderHeaderDropdown && (
                 <div className="absolute right-0 top-full w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       setFolderHeaderDropdown(false);
                       setFolderUploadTarget(activeFolderId);
                       setTimeout(() => {
                         folderFileInputRef.current.click();
                       }, 0);
                     }}
                     className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-indigo-50 transition-colors"
                   >
                     <FilePlus size={18} className="text-indigo-500" />
                     Upload File
                   </button>
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       setFolderHeaderDropdown(false);
                       handleRenameFolder(activeFolderId, activeFolder?.name || "");
                     }}
                     className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-indigo-50 transition-colors"
                   >
                     <Edit size={18} className="text-blue-500" />
                     Rename Folder
                   </button>
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       setFolderHeaderDropdown(false);
                       handleDeleteFolder(activeFolderId, activeFolder?.name || "");
                     }}
                     className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-red-50 transition-colors"
                   >
                     <Trash2 size={18} className="text-red-500" />
                     Delete Folder
                   </button>
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       setFolderHeaderDropdown(false);
                       if (activeFolder) {
                         handleShare({ id: activeFolder.id, name: activeFolder.name, type: "folder" });
                       }
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
         ) : (
           <h1 className="text-3xl font-bold text-myHeader text-left">
             Medical Records
           </h1>
         )}
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
               onChange={(e) => handleFileChange(e, activeFolderId || null)}
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


             {storageInfo && (
             <div className="inline-flex items-center gap-2 text-xs text-gray-500">
               <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                 <div
                   className="h-full bg-blue-500 transition-all duration-300"
                   style={{ width: `${storageInfo.storage_limit_mb === -1 ? 0 : Math.min((storageInfo.storage_used_mb / storageInfo.storage_limit_mb) * 100, 100)}%` }}
                 />
               </div>
               <span>
                 {(storageInfo.storage_used_mb / 1024).toFixed(1)}GB
                 {storageInfo.storage_limit_mb !== -1 &&
                   ` of ${(storageInfo.storage_limit_mb / 1024).toFixed(1)}GB used`
                 }
               </span>
             </div>
           )}


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
                     setOpenFilterDropdown(
                       openFilterDropdown === "type" ? null : "type"
                     )
                   }
                 >
                   <span>
                     {(FILE_TYPE_FILTERS.find((f) => f.value === fileTypeFilter)?.label) ?? "Type"}
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
                     >
                       All
                     </button>
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
                     setOpenFilterDropdown(
                       openFilterDropdown === "history" ? null : "history"
                     )
                   }
                 >
                   <span>
                     {(HISTORY_FILTERS.find((f) => f.value === historyFilter)?.label) ?? "History"}
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
                     >
                       All
                     </button>
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
                     setOpenFilterDropdown(
                       openFilterDropdown === "all" ? null : "all"
                     )
                   }
                 >
                   <span>
                     {(ALL_FILTERS.find((f) => f.value === allFilter)?.label) ?? "All"}
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
               {displayedFolders.map((folder) => (
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
                 isPatient={isPatient}
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
                 isPatient={isPatient}
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
     {previewFile && (() => {
   const isLoneNotePdf = previewFile?.name?.startsWith('doctor-note-');
   const showNotesSidebar = !isLoneNotePdf && previewFile.consultation_notes && previewFile.consultation_notes.length > 0;
   return (
     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
       <div className={`bg-white rounded-lg w-full relative shadow-2xl border flex flex-col ${showNotesSidebar ? "max-w-4xl md:flex-row" : "max-w-md"}`}>
         <div className="flex-1 min-w-0 p-4 flex flex-col">
           <button
             onClick={() => setPreviewFile(null)}
             className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
             title="Close preview"
           >
             <X size={22} />
           </button>
           <div className="mb-2 font-semibold truncate">
             {previewFile.name}
           </div>
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
         {showNotesSidebar && (
           <div className="w-full md:w-96 border-l bg-gray-50 p-4 flex-shrink-0 overflow-y-auto">
             <div className="font-semibold text-[#55A1A4] mb-2">Consultation Notes</div>
             {previewFile.consultation_notes.map((note, idx) => (
               <div key={note.id || idx} className="mb-4">
                 <div className="text-xs text-gray-500 mb-1">
                   {note.doctor_id ? (
                     <>
                       Doctor {doctorMap[note.doctor_id] ? doctorMap[note.doctor_id] : `Unknown (${note.doctor_id})`}
                     </>
                   ) : ""}
                   {note.created_at ? ` on ${new Date(note.created_at).toLocaleString()}` : ""}
                 </div>
                 <div className="text-sm whitespace-pre-line">{note.note}</div>
               </div>
             ))}
           </div>
         )}
       </div>
     </div>
   );
 })()}


     {/* --- Rename Modal --- */}
     <RenameModal
       open={renameModal.open}
       currentName={renameModal.currentName}
       onRename={doRename}
       onClose={() =>
         setRenameModal({ open: false, type: null, id: null, currentName: "" })
       }
       label={renameModal.type === "file" ? "Rename File" : "Rename Folder"}
       placeholder={
         renameModal.type === "file" ? "New file name" : "New folder name"
       }
     />


     {/* --- Delete Confirmation Modal --- */}
     <ActionModal
       open={deleteModal.open}
       title={`Delete ${deleteModal.type === "file" ? "File" : "Folder"}?`}
       message={`Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`}
       confirmLabel="Delete"
       cancelLabel="Cancel"
       onConfirm={doDelete}
       onCancel={() =>
         setDeleteModal({
           open: false,
           type: null,
           id: null,
           name: "",
           filePath: null,
         })
       }
       onClose={() => setDeleteModal(false)}
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
         const { error } = await supabase
           .from("folders")
           .insert([{ name: folderName, owner_id: currentUserId }]);
         if (error) {
           alert("DB error: " + error.message);
         } else {
           await fetchFolders();
         }
       }}
       onClose={() => setCreateFolderModalOpen(false)}
     />


     {/* --- Success Modal ---
     <SuccessModal
       open={successModal.open}
       title={successModal.title}
       message={successModal.message}
       onClose={() => setSuccessModal({ open: false, title: "", message: "" })}
     />*/}
   </div>
 );
}

