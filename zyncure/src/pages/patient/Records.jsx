import { SquarePlus, FolderPlus, FilePlus, LayoutGrid, Rows3, MoreVertical, FileText, Share, Cross, ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { supabase } from "../../client";

export default function Records() {
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

  useEffect(() => {
    fetchFolders();
    fetchFiles();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      setFolderUploadTarget(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchFolders() {
    setLoading(true);
    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching folders:", error);
      setFolders([]);
    } else {
      setFolders(data);
    }
    setLoading(false);
  }

  async function fetchFiles() {
    setLoading(true);
    const { data, error } = await supabase
      .from("medical_files")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching files:", error);
      setFiles([]);
    } else {
      setFiles(data);
    }
    setLoading(false);
  }

  const handleFileChange = async (e, folder_id = null) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("medical-files")
      .upload(`files/${Date.now()}_${file.name}`, file);

    if (uploadError) {
      alert("Upload error: " + uploadError.message);
      return;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("medical-files")
      .getPublicUrl(uploadData.path);

    // Insert into 'medical_files' table
    const { error: insertError } = await supabase.from("medical_files").insert([
      {
        name: file.name,
        file_path: uploadData.path,
        file_url: publicUrlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        preview_url: publicUrlData.publicUrl,
        folder_id: folder_id,
      },
    ]);

    if (insertError) {
      alert("DB error: " + insertError.message);
    }
    setFileName("");
    await fetchFiles();
    e.target.value = ""; // Reset file input (important for same-file re-upload)
  };

  const handleFolderFileChange = (e) => {
    if (folderUploadTarget) {
      handleFileChange(e, folderUploadTarget);
      setFolderUploadTarget(null);
    }
    e.target.value = "";
  };

  const handleAddFolder = async () => {
    const folderName = prompt("Folder name?");
    if (!folderName) return;
    const { error } = await supabase.from("folders").insert([{ name: folderName }]);
    if (error) {
      alert("DB error: " + error.message);
    }
    await fetchFolders();
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleDropdownToggle = () => setDropdownOpen((v) => !v);

  const displayedFiles = activeFolderId
    ? files.filter((file) => file.folder_id === activeFolderId)
    : files;

  const activeFolder = folders.find((f) => f.id === activeFolderId);

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-myHeader text-left">
          {activeFolderId ? (
            <span className="flex items-center gap-2">
              <button
                title="Back"
                className="mr-1 text-indigo-400 hover:text-indigo-700"
                onClick={() => setActiveFolderId(null)}
              >
                <ArrowLeft size={22} />
              </button>
              {activeFolder?.name || "Folder"}
            </span>
          ) : (
            "Medical Records"
          )}
        </h1>
        {!activeFolderId && (
          <div className="relative flex items-center" ref={dropdownRef}>
            {/* Single Add Button */}
            <button
              onClick={handleDropdownToggle}
              className="flex items-center gap-2 px-2 py-2 text-mySidebar rounded-md hover:bg-indigo-200 transition-colors"
            >
              <SquarePlus size={20} />
              <ChevronDown size={16} />
            </button>
            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
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
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleAddFolder();
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-indigo-50 transition-colors"
                >
                  <FolderPlus size={18} className="text-emerald-500" />
                  Create Folder
                </button>
              </div>
            )}
            {/* Hidden file input for global upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            {/* Hidden file input for folder upload */}
            <input
              type="file"
              ref={folderFileInputRef}
              className="hidden"
              onChange={handleFolderFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            {/* View as List */}
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
            {/* View as Grid */}
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
        )}
      </div>
      {fileName && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md flex items-center">
          <span className="font-medium">Selected file:</span>
          <span className="ml-2">{fileName}</span>
        </div>
      )}
      {!activeFolderId && (
        <>
          <div className="flex gap-1 mb-4">
            <button className="border border-[#e37859] rounded-md px-2 py-1 bg-transparent text-[#a95e4b] text-sm flex items-center justify-between min-w-[70px] hover:border-[#549294] transition-colors">
              Type
              <span className="ml-1 text-[#e37859] text-xs">▼</span>
            </button>
            <button className="border border-[#e37859] rounded-md px-2 py-1 bg-transparent text-[#a95e4b] text-sm flex items-center justify-between min-w-[70px] hover:border-[#549294] transition-colors">
              History
              <span className="ml-1 text-[#e37859] text-xs">▼</span>
            </button>
            <button className="border border-[#e37859] rounded-md px-2 py-1 bg-transparent text-[#a95e4b] text-sm flex items-center justify-between min-w-[70px] hover:border-[#549294] transition-colors">
              All
              <span className="ml-1 text-[#e37859] text-xs">▼</span>
            </button>
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
                onOpenFolder={() => setActiveFolderId(folder.id)}
                onUploadClick={() => {
                  setFolderUploadTarget(folder.id);
                  setTimeout(() => {
                    folderFileInputRef.current.click();
                  }, 0);
                }}
                uploadDropdownOpen={folderUploadTarget === folder.id}
                setUploadDropdownOpen={(open) =>
                  setFolderUploadTarget(open ? folder.id : null)
                }
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
              name={file.name}
              previewUrl={file.preview_url}
              createdAt={file.created_at}
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
              name={file.name}
              previewUrl={file.preview_url}
              createdAt={file.created_at}
            />
          ))}
        </div>
      )}
      <div className="fixed bottom-4 right-4">
        <button className="bg-red-50 text-red-400 p-4 rounded-lg shadow-md flex flex-col items-center">
          <Share className="w-6 h-6 mb-1" />
          <span className="text-xs">Share Report</span>
        </button>
      </div>
    </>
  );
}

function FolderCard({
  name,
  id,
  onOpenFolder,
  onUploadClick,
  uploadDropdownOpen,
  setUploadDropdownOpen,
}) {
  const [dropdown, setDropdown] = useState(false);

  useEffect(() => {
    if (!uploadDropdownOpen) setDropdown(false);
  }, [uploadDropdownOpen]);

  const cardRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(event) {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        setDropdown(false);
        setUploadDropdownOpen(false);
      }
    }
    if (dropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdown, setUploadDropdownOpen]);

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
            setDropdown((d) => {
              setUploadDropdownOpen(!d);
              return !d;
            });
          }}
        >
          <MoreVertical className="w-5 h-5" />
        </button>
        {dropdown && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDropdown(false);
                setUploadDropdownOpen(false);
                onUploadClick();
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-indigo-50 transition-colors"
            >
              <FilePlus size={18} className="text-indigo-500" />
              Upload File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FileCard({ name, previewUrl, createdAt }) {
  const ext = name.split(".").pop().toLowerCase();
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString()
    : "";

  return (
    <div className="bg-[#55A1A4] rounded-lg shadow-md overflow-hidden">
      <div className="p-2 flex justify-between items-center">
        <div className="flex items-center">
          <FileText className="mr-2 text-white" />
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white text-sm font-medium hover:text-indigo-200 transition"
          >
            {name}
          </a>
        </div>
        <button>
          <MoreVertical className="w-5 h-5 text-white" />
        </button>
      </div>
      <div className="bg-white p-2">
        {previewUrl ? (
          ext === "pdf" ? (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              <iframe
                src={previewUrl}
                title={`Preview of ${name}`}
                className="w-full h-40 rounded cursor-pointer border"
                style={{ pointerEvents: "none" }}
              />
            </a>
          ) : (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={previewUrl}
                alt={`Preview of ${name}`}
                className="w-full h-40 object-cover rounded cursor-pointer"
              />
            </a>
          )
        ) : (
          <div className="w-full h-40 rounded bg-gray-100 flex items-center justify-center text-gray-300">
            No Preview
          </div>
        )}
      </div>
      <div className="p-2 text-white">
        <div className="flex justify-between items-center mt-1">
          <div className="text-xs">Type: Medical</div>
          <div className="text-xs">Date: {formattedDate}</div>
        </div>
      </div>
    </div>
  );
}

function FileListItem({ name, previewUrl, createdAt }) {
  const ext = name.split(".").pop().toLowerCase();
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString()
    : "";

  return (
    <div className="bg-[#55A1A4] rounded-lg shadow-md overflow-hidden">
      <div className="flex p-2">
        <div className="w-16 h-16 bg-white rounded mr-3 flex-shrink-0 flex items-center justify-center">
          {previewUrl ? (
            ext === "pdf" ? (
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <iframe
                  src={previewUrl}
                  title={`Preview of ${name}`}
                  className="w-full h-full rounded cursor-pointer border"
                  style={{ pointerEvents: "none" }}
                />
              </a>
            ) : (
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={previewUrl}
                  alt={`Preview of ${name}`}
                  className="w-full h-full object-cover rounded cursor-pointer"
                />
              </a>
            )
          ) : (
            <div className="w-full h-full rounded bg-gray-100 flex items-center justify-center text-gray-300">
              No Preview
            </div>
          )}
        </div>
        <div className="flex-grow">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <FileText className="mr-1 text-white" />
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white text-sm font-medium hover:text-indigo-200 transition"
              >
                {name}
              </a>
            </div>
            <button>
              <MoreVertical className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="text-white">
            <div className="flex justify-between items-center mt-1">
              <div className="text-xs">Type: Medical</div>
              <div className="text-xs">Date: {formattedDate}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}