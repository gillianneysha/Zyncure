import React, { useState, useEffect } from 'react';
import { supabase } from '../../client';
import { X, Folder, FileText, Download, ArrowLeft, User, Clock } from 'lucide-react';

// Utility for truncating file names
function truncateFileName(fileName, maxLength = 25) {
  if (!fileName || fileName.length <= maxLength) return fileName;
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) return fileName.slice(0, maxLength - 3) + "...";
  const extension = fileName.slice(lastDot + 1);
  const keep = maxLength - extension.length - 4;
  if (keep <= 0) return "..." + fileName.slice(lastDot);
  return fileName.slice(0, keep) + "..." + "." + extension;
}

// Helper: format expires_at
function formatExpiresAt(expires_at) {
  if (!expires_at) return "Permanent";
  const expiresDate = new Date(expires_at);
  const now = new Date();
  if (expiresDate < now) return "Expired";
  const diffMs = expiresDate - now;
  const diffMins = Math.round(diffMs / (1000 * 60));
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffDays > 0) return `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  if (diffHrs > 0) return `Expires in ${diffHrs} hour${diffHrs > 1 ? 's' : ''}`;
  if (diffMins > 0) return `Expires in ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  return "Expires soon";
}

// Folder Card
function FolderCard({ folder, onClick }) {
  return (
    <div
      className="bg-[#55A1A4] text-white p-4 rounded-lg shadow-md flex items-center justify-between cursor-pointer hover:bg-[#478384] transition"
      onClick={() => onClick(folder)}
    >
      <div className="flex items-center">
        <Folder className="mr-2" />
        <span className="font-medium">{truncateFileName(folder.name, 20)}</span>
      </div>
    </div>
  );
}

// File Card with duration indicator
function FileCard({ file, onPreview }) {
  const ext = file.name?.split(".").pop().toLowerCase() || 'file';
  return (
    <div className="bg-[#55A1A4] rounded-lg shadow-md overflow-hidden">
      <div className="p-2 flex justify-between items-center">
        <div className="flex items-center min-w-0 flex-1">
          <FileText className="mr-2 text-white flex-shrink-0" />
          <button
            type="button"
            className="text-white text-sm font-medium hover:text-indigo-200 transition truncate text-left"
            title={file.name}
            onClick={() => onPreview(file)}
            style={{ background: "none", border: "none", padding: 0, margin: 0 }}
          >
            {truncateFileName(file.name, 24)}
          </button>
        </div>
        <a
          href={file.file_url}
          download={file.name}
          className="ml-2 text-white hover:text-indigo-200 transition"
          title="Download"
        >
          <Download size={18} />
        </a>
      </div>
      <div
        className="bg-white p-2 cursor-pointer"
        onClick={() => onPreview(file)}
        title="Click to preview"
      >
        {file.preview_url ? (
          ext === "pdf" ? (
            <div className="w-full h-32 rounded bg-gray-50 flex items-center justify-center">
              <span className="text-gray-500">PDF Preview</span>
            </div>
          ) : (
            <img
              src={file.preview_url}
              alt={`Preview of ${file.name}`}
              className="w-full h-32 object-cover rounded"
            />
          )
        ) : (
          <div className="w-full h-32 rounded bg-gray-100 flex items-center justify-center text-gray-300">
            No Preview
          </div>
        )}
      </div>
      <div className="p-2 flex items-center gap-1 text-xs text-white">
        <Clock size={14} className="inline-block mr-1" />
        {formatExpiresAt(file.expires_at)}
      </div>
    </div>
  );
}

export default function DoctorsPatientsFolders() {
  const [currentUser, setCurrentUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [sharedFolders, setSharedFolders] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [openedFolder, setOpenedFolder] = useState(null);
  const [folderFiles, setFolderFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data?.user || null);
    });
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    loadPatientsWithInfo();
  }, [currentUser]);

  async function loadPatientsWithInfo() {
    setLoading(true);
    const { data: connections, error: connError } = await supabase
      .from('doctor_connection_details')
      .select('*')
      .eq('status', 'accepted');
    if (connError) {
      setPatients([]);
      setLoading(false);
      return;
    }

    const enrichedPatients = await Promise.all(connections.map(async conn => {
      const { data: shares } = await supabase
        .from('file_shares')
        .select(`
          *,
          medical_files!file_shares_file_id_fkey (
            id, name, file_url, preview_url, folder_id, owner_id
          ),
          folders!file_shares_folder_id_fkey (
            id, name, created_at, owner_id
          )
        `)
        .eq('shared_with_id', currentUser.id)
        .eq('owner_id', conn.patient_id)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      let folders = [];
      let files = [];
      if (shares && shares.length) {
        for (const share of shares) {
          if (share.folders && !folders.find(f => f.id === share.folders.id)) {
            folders.push(share.folders);
          }
          if (share.medical_files && !share.medical_files.folder_id) {
            files.push({
              ...share.medical_files,
              expires_at: share.expires_at,
              share_id: share.id,
              share_info: share
            });
          }
        }
      }
      return {
        id: conn.patient_id,
        name: `${conn.patient_first_name || ''} ${conn.patient_last_name || ''}`.trim() || conn.patient_email || 'Unknown',
        email: conn.patient_email,
        folders,
        files
      }
    }));
    setPatients(enrichedPatients);
    setLoading(false);
  }

  const handlePatientClick = (patient) => {
    setSelectedPatient(patient);
    setSharedFolders(patient.folders);
    setSharedFiles(patient.files);
    setOpenedFolder(null);
    setFolderFiles([]);
    setPreviewFile(null);
  };

  const handleOpenSharedFolder = async (folder) => {
    setOpenedFolder(folder);
    setPreviewFile(null);
    const { data: files } = await supabase
      .from('medical_files')
      .select('*')
      .eq('folder_id', folder.id)
      .eq('owner_id', selectedPatient.id);
    setFolderFiles(files || []);
  };

  return (
    <div className="p-6 min-h-screen" style={{ background: "none", border: "none", padding: 0, margin: 0 }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#55A1A4] text-left flex items-center">
            {selectedPatient
              ? <>
                  <button
                    title="Back"
                    className="mr-1 text-[#55A1A4] hover:text-[#478384]"
                    onClick={() => {
                      if (openedFolder) {
                        setOpenedFolder(null);
                        setPreviewFile(null);
                      } else {
                        setSelectedPatient(null);
                        setOpenedFolder(null);
                        setPreviewFile(null);
                      }
                    }}
                  >
                    <ArrowLeft size={22} />
                  </button>
                  {openedFolder
                    ? `${openedFolder.name} (from ${selectedPatient.name})`
                    : `${selectedPatient.name}'s Shared Records`
                  }
                </>
              : "Patients who shared with you"
            }
          </h1>
        </div>

        {!selectedPatient && (
          loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#55A1A4]"></div>
              <p className="text-gray-500 mt-2">Loading patients...</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
              <p className="text-gray-500 mb-6">No patients have shared folders or files with you.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="bg-[#E3F2F3] p-6 rounded-lg shadow hover:bg-[#c7eaea] cursor-pointer transition"
                  onClick={() => handlePatientClick(patient)}
                >
                  <div className="font-bold text-lg mb-2 text-[#55A1A4]">{patient.name}</div>
                  <div className="text-xs text-gray-500">{patient.email}</div>
                  <div className="text-sm text-gray-700 mt-2">
                    {patient.folders.length} folder(s), {patient.files.length} file(s)
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {selectedPatient && !openedFolder && (
          <div>
            <h2 className="text-xl font-bold mb-3 text-[#55A1A4]">{selectedPatient.name}'s Shared Folders</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {sharedFolders.length === 0 && (
                <div className="col-span-4 text-gray-400">No folders shared.</div>
              )}
              {sharedFolders.map(folder => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  onClick={() => handleOpenSharedFolder(folder)}
                />
              ))}
            </div>
            <h2 className="text-xl font-bold mb-3 text-[#55A1A4]">{selectedPatient.name}'s Shared Files</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {sharedFiles.length === 0 && (
                <div className="col-span-4 text-gray-400">No files shared.</div>
              )}
              {sharedFiles.map(file => (
                <FileCard key={file.id} file={file} onPreview={setPreviewFile} />
              ))}
            </div>
            {previewFile && (
              <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-4 max-w-md w-full relative">
                  <button
                    onClick={() => setPreviewFile(null)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                  >
                    <X size={22} />
                  </button>
                  <div className="mb-2 font-semibold truncate">{previewFile.name}</div>
                  <div className="flex-1 flex items-center justify-center overflow-auto">
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
                      href={previewFile.file_url}
                      download={previewFile.name}
                      className="inline-block px-4 py-2 bg-[#55A1A4] text-white rounded hover:bg-[#478384]"
                    >
                      Download
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedPatient && openedFolder && (
          <div>
            <h2 className="text-xl font-bold mb-3 text-[#55A1A4]">
              {openedFolder.name} (from {selectedPatient.name})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {folderFiles.length === 0 ? (
                <div className="col-span-4 text-gray-400">No files in this folder.</div>
              ) : (
                folderFiles.map(file => (
                  <FileCard key={file.id} file={file} onPreview={setPreviewFile} />
                ))
              )}
            </div>
            {previewFile && (
              <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-4 max-w-md w-full relative">
                  <button
                    onClick={() => setPreviewFile(null)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                  >
                    <X size={22} />
                  </button>
                  <div className="mb-2 font-semibold truncate">{previewFile.name}</div>
                  <div className="flex-1 flex items-center justify-center overflow-auto">
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
                      href={previewFile.file_url}
                      download={previewFile.name}
                      className="inline-block px-4 py-2 bg-[#55A1A4] text-white rounded hover:bg-[#478384]"
                    >
                      Download
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}