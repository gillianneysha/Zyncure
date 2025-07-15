import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../client';
import {
  X, Folder, FileText, Download, ArrowLeft, User, Clock,
  SquarePlus, ChevronDown, MoreVertical, Trash2
} from 'lucide-react';
import ActionModal from "../../components/ActionModal";
import SuccessModal from "../../components/SuccessModal";
import { generateConsultationNotesPDF } from '../../utils/generateConsultationNotes';

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

function formatExpiresAt(expires_at) {
  if (!expires_at) return "Permanent";
  const expiresDate = new Date(expires_at);
  const now = new Date();
  if (expiresDate < now) return "Expired";
  const diffMs = expiresDate - now;
  const diffMins = Math.round(diffMs / (1000 * 60));
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 0) return `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  if (diffHrs > 0) return `Expires in ${diffHrs} hour${diffHrs > 1 ? 's' : ''}`;
  if (diffMins > 0) return `Expires in ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  return "Expires soon";
}

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

function FileCard({ file, onPreview, onAddNote, onDelete, currentUser }) {
  const ext = file.name?.split(".").pop().toLowerCase() || 'file';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  // Lone doctor note PDF: owned by doctor, mime_type PDF, and new filename format
  const isLoneDoctorNote = file.owner_id === currentUser?.id
    && file.mime_type === "application/pdf"
    && file.name && file.name.startsWith('Consultation Notes - DR.');

  const showAddNoteOption = !isLoneDoctorNote && file.owner_id !== currentUser?.id;

  return (
    <div className="bg-[#55A1A4] rounded-lg shadow-md overflow-hidden relative group">
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
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className="ml-1 text-white hover:text-indigo-200"
          >
            <MoreVertical size={20} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {showAddNoteOption && (
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onAddNote(file);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-emerald-50 transition-colors"
                >
                  <FileText size={18} className="text-emerald-500" />
                  Add Consultation Notes
                </button>
              )}
              <a
                href={file.file_url}
                download={file.name}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-indigo-50 transition-colors"
              >
                <Download size={18} className="text-indigo-500" />
                Download
              </a>
              {currentUser?.id === file.owner_id && (
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onDelete(file);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-red-700 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={18} className="text-red-500" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div
        className="bg-white p-2 cursor-pointer"
        onClick={() => onPreview(file)}
        title="Click to preview"
      >
        {file.file_url ? (
          ext === "pdf" ? (
            <iframe
              src={file.file_url}
              title={`Preview of ${file.name}`}
              className="w-full h-32 rounded border"
              style={{ border: 'none' }}
            />
          ) : (
            <img
              src={file.file_url}
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
        {file.symptom_file
          ? (file.expires_at ? formatExpiresAt(file.expires_at) : "Permanent")
          : formatExpiresAt(file.expires_at)}
      </div>
    </div>
  );
}

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
    map[doc.med_id] = name || doc.med_id;
  }
  return map;
}

function NotesModal({ open, onClose, onSave, file, folder }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  if (!open) return null;

  let label = "Add Consultation Note";
  if (file) label += ` to "${file.name}"`;
  else if (folder) label += ` to folder "${folder.name || 'Shared Records'}"`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full relative shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          title="Close"
        >
          <X size={22} />
        </button>
        <h3 className="font-bold text-lg mb-3">{label}</h3>
        <textarea
          className="w-full border border-gray-300 rounded p-2 mb-4 min-h-[120px] resize-y"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Type consultation notes here..."
          disabled={saving}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setSaving(true);
              await onSave(note);
              setSaving(false);
              onClose();
            }}
            className="px-4 py-2 bg-[#55A1A4] text-white rounded hover:bg-[#478384]"
            disabled={saving || !note.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

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

  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesFileTarget, setNotesFileTarget] = useState(null);
  const [notesFolderTarget, setNotesFolderTarget] = useState(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [doctorMap, setDoctorMap] = useState({});

  // PATCH: states for any file deletion and note deletion
  const [deleteFileTarget, setDeleteFileTarget] = useState(null);
  const [showDeleteFileModal, setShowDeleteFileModal] = useState(false);

  const [deleteNoteTarget, setDeleteNoteTarget] = useState(null);
  const [showDeleteNoteModal, setShowDeleteNoteModal] = useState(false);

  // Success Modal State
  const [successModal, setSuccessModal] = useState({
    open: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data?.user || null);
    });
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    loadPatientsWithInfo();
    // eslint-disable-next-line
  }, [currentUser]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

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
  }, [previewFile]);

  async function loadSharedSymptomReports(doctorId, patientId) {
    const nowISOString = new Date().toISOString();
    const { data, error } = await supabase
      .from('shared_symptoms')
      .select('*')
      .eq('shared_with', doctorId)
      .eq('shared_by', patientId)
      .or(`expires_at.is.null,expires_at.gt.${nowISOString}`);
    if (error) return [];
    return (data || []).map(report => ({
      id: `sharedsymptom_${report.id}`,
      name: report.pdf_filename || 'symptom-report.pdf',
      file_url: report.report_url || null,
      preview_url: report.report_url || null,
      expires_at: report.expires_at,
      symptom_file: true,
      patient_id: patientId
    }));
  }

  async function loadPatientsWithInfo() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: connections, error: connError } = await supabase
      .from('doctor_connection_details')
      .select('*')
      .eq('med_id', user.id)
      .eq('status', 'accepted');
    if (connError || !connections) {
      setPatients([]);
      setLoading(false);
      return;
    }
    const enrichedPatients = await Promise.all(connections.map(async conn => {
      const { data: patientToDoctorShares } = await supabase
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
        .eq('owner_id', conn.patient_id)
        .eq('shared_with_id', currentUser.id)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      const { data: doctorToPatientShares } = await supabase
        .from('file_shares')
        .select(`
          *,
          medical_files!file_shares_file_id_fkey (
            id, name, file_url, preview_url, folder_id, owner_id
          )
        `)
        .eq('owner_id', currentUser.id)
        .eq('shared_with_id', conn.patient_id)
        .eq('is_active', true);

      let folders = [];
      if (patientToDoctorShares && patientToDoctorShares.length) {
        for (const share of patientToDoctorShares) {
          if (
            share.folders &&
            share.folders.owner_id === conn.patient_id &&
            !folders.find(f => f.id === share.folders.id)
          ) {
            folders.push(share.folders);
          }
        }
      }

      let filesFromPatient = [];
      if (patientToDoctorShares && patientToDoctorShares.length) {
        for (const share of patientToDoctorShares) {
          if (share.medical_files && share.file_id) {
            filesFromPatient.push({
              ...share.medical_files,
              expires_at: share.expires_at,
              share_id: share.id
            });
          }
        }
      }

      let filesFromDoctor = [];
      if (doctorToPatientShares && doctorToPatientShares.length) {
        for (const share of doctorToPatientShares) {
          if (share.medical_files && share.file_id) {
            filesFromDoctor.push({
              ...share.medical_files,
              expires_at: share.expires_at,
              share_id: share.id
            });
          }
        }
      }

      const sharedSymptomFiles = await loadSharedSymptomReports(currentUser.id, conn.patient_id);

      const allFiles = [...filesFromPatient, ...filesFromDoctor, ...sharedSymptomFiles];
      const uniqueFiles = allFiles.filter(
        (file, idx, arr) => arr.findIndex(f2 => f2.id === file.id) === idx
      );
      // Only get consultation notes for medical_files UUIDs
      const fileIds = uniqueFiles
        .filter(f => typeof f.id === 'string' && !f.id.startsWith('sharedsymptom_'))
        .map(f => f.id)
        .filter(Boolean);

      const notesByFileId = await fetchConsultationNotes(fileIds);
      const filesWithNotes = uniqueFiles.map(file => ({
        ...file,
        consultation_notes: (notesByFileId[file.id] || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
      }));

      return {
        id: conn.patient_id,
        name: `${conn.patient_first_name || ''} ${conn.patient_last_name || ''}`.trim() || conn.patient_email || 'Unknown',
        email: conn.patient_email,
        folders,
        files: filesWithNotes,
      }
    }));
    setPatients(enrichedPatients);
    setLoading(false);
  }

  async function fetchFolderFilesWithNotes(folderId, patientId) {
    const { data: filesInFolder, error } = await supabase
      .from('medical_files')
      .select('*')
      .eq('folder_id', folderId)
      .eq('owner_id', patientId);
    if (error || !filesInFolder) return [];
    const fileIds = filesInFolder.map(f => f.id);
    const notesByFileId = await fetchConsultationNotes(fileIds);
    return filesInFolder.map(file => ({
      ...file,
      consultation_notes: (notesByFileId[file.id] || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    }));
  }

  async function handleOpenSharedFolder(folder) {
    setOpenedFolder(folder);
    setPreviewFile(null);
    let folderFiles = [];
    if (sharedFiles && folder) {
      folderFiles = sharedFiles.filter(f => f.folder_id === folder.id);
    }
    if (folder && selectedPatient?.id) {
      const filesFromPatientWithNotes = await fetchFolderFilesWithNotes(folder.id, selectedPatient.id);
      const existingFileIds = new Set(folderFiles.map(f => f.id));
      filesFromPatientWithNotes.forEach(f => {
        if (!existingFileIds.has(f.id)) {
          folderFiles.push(f);
        }
      });
    }
    setFolderFiles(folderFiles);
  }

  function handlePreviewFile(file) {
    setPreviewFile({
      ...file,
      preview_url: file.file_url
    });
  }

  const handlePatientClick = (patient) => {
    setSelectedPatient(patient);
    setSharedFolders(patient.folders);
    setSharedFiles(patient.files);
    setOpenedFolder(null);
    setFolderFiles([]);
    setPreviewFile(null);
  };

  // PATCH: handleDelete triggers modal for ALL deletions, now with success modal
  async function handleDelete(file) {
    if (!currentUser || currentUser.id !== file.owner_id) return;
    setDeleteFileTarget(file);
    setShowDeleteFileModal(true);
  }

  async function confirmDeleteFile(file) {
    const { error } = await supabase.from('medical_files').delete().eq('id', file.id);
    if (error) {
      setSuccessModal({
        open: true,
        title: "Delete Failed",
        message: error.message,
      });
    } else {
      setSuccessModal({
        open: true,
        title: "Deleted!",
        message: `"${file.name}" has been deleted successfully.`,
      });
    }
    setDeleteFileTarget(null);
    setShowDeleteFileModal(false);
    await loadPatientsWithInfo();
    if (openedFolder) {
      await handleOpenSharedFolder(openedFolder);
    }
    if (previewFile && previewFile.id === file.id) {
      setPreviewFile(null);
    }
  }

  function handleDropdownToggle() {
    setDropdownOpen(v => !v);
  }

  // PATCH: handleSaveNote now uses generateConsultationNotesPDF for PDF format and filename
  async function handleSaveNote(noteText) {
    if (!currentUser || !selectedPatient) return;
    let now = new Date();

    // Gather doctor info for the PDF
    const doctorInfo = {
      first_name: currentUser.user_metadata?.first_name,
      last_name: currentUser.user_metadata?.last_name,
      name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name,
      email: currentUser.email
    };

    // Gather patient info for the PDF
    const patientInfo = {
      name: selectedPatient.name,
      email: selectedPatient.email
    };

    // File note
    if (notesFileTarget && notesFileTarget.id) {
      const { error } = await supabase.from('consultation_notes').insert([
        {
          file_id: notesFileTarget.id,
          folder_id: notesFileTarget.folder_id || null,
          patient_id: selectedPatient.id,
          doctor_id: currentUser.id,
          note: noteText,
          created_at: now.toISOString()
        }
      ]);
      if (error) {
        setSuccessModal({
          open: true,
          title: "Attach Note Failed",
          message: "Failed to insert consultation note: " + error.message,
        });
        return;
      } else {
        setSuccessModal({
          open: true,
          title: "Note Attached",
          message: "Consultation note has been attached successfully.",
        });
      }
    }
    // Folder PDF note (and general PDF note)
    else {
      let pdfResult;
      try {
        pdfResult = await generateConsultationNotesPDF(
          noteText,
          doctorInfo,
          patientInfo,
          { returnBlob: true }
        );
      } catch (err) {
        setSuccessModal({
          open: true,
          title: "PDF Generation Failed",
          message: "Failed to create PDF. jsPDF error: " + err.message,
        });
        return;
      }
      const pdfBlob = pdfResult.blob;
      const filename = pdfResult.filename;

      const storagePath = `doctor-notes/${selectedPatient.id}/${filename}`;
      let uploadResponse = await supabase.storage
        .from("medical-files")
        .upload(storagePath, pdfBlob, { contentType: "application/pdf", upsert: true });
      if (uploadResponse.error) {
        setSuccessModal({
          open: true,
          title: "PDF Generation Failed",
          message: "Upload failed: " + uploadResponse.error.message,
        });
        return;
      }
      const { data: publicUrlData } = supabase.storage
        .from("medical-files")
        .getPublicUrl(storagePath);
      if (!publicUrlData?.publicUrl) {
        setSuccessModal({
          open: true,
          title: "PDF Generation Failed",
          message: "Failed to get public URL for uploaded PDF.",
        });
        return;
      }
      const { data: insertedFiles, error: fileInsertError } = await supabase
        .from("medical_files")
        .insert([{
          name: filename,
          file_path: storagePath,
          file_url: publicUrlData.publicUrl,
          preview_url: publicUrlData.publicUrl,
          owner_id: currentUser.id,
          folder_id: notesFolderTarget?.id,
          mime_type: "application/pdf"
        }])
        .select();
      if (fileInsertError || !insertedFiles || !insertedFiles[0]) {
        setSuccessModal({
          open: true,
          title: "PDF Generation Failed",
          message: "Failed to insert file: " + (fileInsertError?.message || "Unknown error"),
        });
        return;
      }
      let file_id = insertedFiles[0].id;
      const { error: shareErr } = await supabase.from("file_shares").insert([{
        file_id,
        owner_id: currentUser.id,
        shared_with_id: selectedPatient.id,
        share_type: "file",
        is_active: true
      }]);
      if (shareErr) {
        setSuccessModal({
          open: true,
          title: "PDF Generation Failed",
          message: "Failed to share file: " + shareErr.message,
        });
        return;
      }
      const { error: noteInsertErr } = await supabase.from("consultation_notes").insert([{
        file_id,
        folder_id: notesFolderTarget?.id,
        patient_id: selectedPatient.id,
        doctor_id: currentUser.id,
        note: noteText,
        created_at: now.toISOString()
      }]);
      if (noteInsertErr) {
        setSuccessModal({
          open: true,
          title: "Attach Note Failed",
          message: "Failed to insert consultation note: " + noteInsertErr.message,
        });
        return;
      }
      setSuccessModal({
        open: true,
        title: "PDF Created",
        message: "Consultation notes PDF has been generated and shared.",
      });
    }

    setNotesFileTarget(null);
    setNotesFolderTarget(null);
    await loadPatientsWithInfo();

    if (openedFolder) {
      await handleOpenSharedFolder(openedFolder);
    }
  }

  // PATCH: Delete Note Handler with success modal
  async function handleDeleteNote(note) {
    if (!note?.id) return;
    const { error } = await supabase.from('consultation_notes').delete().eq('id', note.id);
    if (error) {
      setSuccessModal({
        open: true,
        title: "Delete Note Failed",
        message: error.message,
      });
    } else {
      setSuccessModal({
        open: true,
        title: "Note Deleted",
        message: "Consultation note deleted successfully.",
      });
    }
    await loadPatientsWithInfo();
    if (openedFolder) {
      await handleOpenSharedFolder(openedFolder);
    }
    if (previewFile) {
      const updatedNotes = (previewFile.consultation_notes || []).filter(n => n.id !== note.id);
      if (updatedNotes.length === 0) {
        setPreviewFile(null);
      } else {
        setPreviewFile(prev => ({
          ...prev,
          consultation_notes: updatedNotes
        }));
      }
    }
  }

  const renderPreviewModal = (file) => {
    if (!file) return null;
    // Lone doctor note PDF: owned by doctor, mime_type PDF, and new filename format
    const isLoneDoctorNote = file.owner_id === currentUser?.id
      && file.mime_type === "application/pdf"
      && file.name && file.name.startsWith('Consultation Notes - DR.');

    // Only show sidebar for files owned by patient (not by doctor)
    const showNotesSidebar = file.owner_id !== currentUser?.id
      && file.consultation_notes
      && file.consultation_notes.length > 0;
    const sortedNotes = (file.consultation_notes || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const uniqueNotes = sortedNotes.filter(
      (note, idx, arr) => note.id && arr.findIndex(n2 => n2.id === note.id) === idx
    );
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div
          className={`bg-white rounded-lg p-4 w-full relative shadow-2xl border flex flex-col ${
            showNotesSidebar ? "max-w-4xl md:flex-row" : "max-w-md"
          }`}
        >
          <button
            onClick={() => setPreviewFile(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
            title="Close preview"
          >
            <X size={22} />
          </button>
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="mb-2 font-semibold truncate">{file.name}</div>
            <div className="flex-1 flex items-center justify-center overflow-auto my-4">
              {file.preview_url ? (
                file.name.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={file.preview_url}
                    title={`Preview of ${file.name}`}
                    className="w-full h-[60vh] rounded border"
                    style={{ border: "none" }}
                  />
                ) : (
                  <img
                    src={file.preview_url}
                    alt={`Preview of ${file.name}`}
                    className="max-h-[60vh] w-auto rounded"
                  />
                )
              ) : (
                <div className="text-gray-400">No Preview Available</div>
              )}
            </div>
            <div className="mt-4 text-right">
              {file.file_url && (
                <a
                  href={file.file_url}
                  download={file.name}
                  className="inline-block px-4 py-2 bg-[#55A1A4] text-white rounded hover:bg-[#478384]"
                >
                  Download
                </a>
              )}
              {/* PATCH: Lone doctor note PDF delete button */}
              {isLoneDoctorNote && currentUser && currentUser.id === file.owner_id && (
                <button
                  className="inline-block ml-2 px-4 py-2 bg-[#E36464] text-white rounded hover:bg-[#c64a4a]"
                  onClick={() => {
                    setDeleteFileTarget(file);
                    setShowDeleteFileModal(true);
                  }}
                >
                  <Trash2 size={18} className="inline-block mr-1" />
                  Delete
                </button>
              )}
            </div>
          </div>
          {showNotesSidebar && (
            <div className="w-full md:w-80 border-l bg-gray-50 p-4 flex-shrink-0 overflow-y-auto">
              <div className="font-semibold text-[#55A1A4] mb-2">Consultation Notes</div>
              {uniqueNotes.map(note => (
                <div key={note.id} className="mb-4 group relative">
                  <div className="text-xs text-gray-500 mb-1 flex items-center justify-between">
                    <span>
                      {note.doctor_id && doctorMap[note.doctor_id]
                        ? <>Doctor {doctorMap[note.doctor_id]}</>
                        : note.doctor_id
                        ? `Doctor ${note.doctor_id}`
                        : ""}
                      {note.created_at ? ` on ${new Date(note.created_at).toLocaleString()}` : ""}
                    </span>
                    <div className="relative flex items-center">
                      {/* PATCH: Only doctors can delete notes */}
                      {currentUser && currentUser.id === note.doctor_id && (
                        <button
                          className="ml-2 p-1 rounded hover:bg-gray-200"
                          title="Note options"
                          onClick={e => {
                            e.stopPropagation();
                            setDeleteNoteTarget(note);
                            setShowDeleteNoteModal(true);
                          }}
                        >
                          <MoreVertical size={18} className="text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm whitespace-pre-line">{note.note}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Use your ActionModal for delete confirmation */}
        <ActionModal
          open={showDeleteNoteModal && !!deleteNoteTarget}
          title="Delete Consultation Note"
          message="Are you sure you want to delete this consultation note? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={async () => {
            await handleDeleteNote(deleteNoteTarget);
            setShowDeleteNoteModal(false);
            setDeleteNoteTarget(null);
          }}
          onCancel={() => {
            setShowDeleteNoteModal(false);
            setDeleteNoteTarget(null);
          }}
        />
        <ActionModal
          open={showDeleteFileModal && !!deleteFileTarget}
          title={`Delete File${deleteFileTarget?.name ? `: ${deleteFileTarget.name}` : ""}`}
          message="Are you sure you want to delete this file? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={async () => {
            await confirmDeleteFile(deleteFileTarget);
          }}
          onCancel={() => {
            setShowDeleteFileModal(false);
            setDeleteFileTarget(null);
          }}
        />
      </div>
    );
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
          {selectedPatient && (
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
                      setNotesFileTarget(null);
                      setNotesFolderTarget(openedFolder || { id: null, name: `${selectedPatient.name} - Shared Records` });
                      setShowNotesModal(true);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-emerald-50 transition-colors"
                  >
                    <FileText size={18} className="text-emerald-500" />
                    Add Consultation Notes
                  </button>
                </div>
              )}
            </div>
          )}
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
              {sharedFiles
                .filter(file => !file.folder_id)
                .map(file => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onPreview={handlePreviewFile}
                    onAddNote={fileObj => {
                      setNotesFileTarget(fileObj);
                      setNotesFolderTarget(null);
                      setShowNotesModal(true);
                    }}
                    onDelete={handleDelete}
                    currentUser={currentUser}
                  />
                ))}
            </div>
            {previewFile && renderPreviewModal(previewFile)}
            <ActionModal
              open={showDeleteFileModal && !!deleteFileTarget}
              title={`Delete File${deleteFileTarget?.name ? `: ${deleteFileTarget.name}` : ""}`}
              message="Are you sure you want to delete this file? This action cannot be undone."
              confirmLabel="Delete"
              cancelLabel="Cancel"
              onConfirm={async () => {
                await confirmDeleteFile(deleteFileTarget);
              }}
              onCancel={() => {
                setShowDeleteFileModal(false);
                setDeleteFileTarget(null);
              }}
            />
          </div>
        )}

        {selectedPatient && openedFolder && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {folderFiles.length === 0 ? (
                <div className="col-span-4 text-gray-400">No files in this folder.</div>
              ) : (
                folderFiles.map(file => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onPreview={handlePreviewFile}
                    onAddNote={fileObj => {
                      setNotesFileTarget(fileObj);
                      setNotesFolderTarget(null);
                      setShowNotesModal(true);
                    }}
                    onDelete={handleDelete}
                    currentUser={currentUser}
                  />
                ))
              )}
            </div>
            {previewFile && renderPreviewModal(previewFile)}
            <ActionModal
              open={showDeleteFileModal && !!deleteFileTarget}
              title={`Delete File${deleteFileTarget?.name ? `: ${deleteFileTarget.name}` : ""}`}
              message="Are you sure you want to delete this file? This action cannot be undone."
              confirmLabel="Delete"
              cancelLabel="Cancel"
              onConfirm={async () => {
                await confirmDeleteFile(deleteFileTarget);
              }}
              onCancel={() => {
                setShowDeleteFileModal(false);
                setDeleteFileTarget(null);
              }}
            />
          </div>
        )}

        <NotesModal
          open={showNotesModal}
          onClose={() => {
            setShowNotesModal(false);
            setNotesFileTarget(null);
            setNotesFolderTarget(null);
          }}
          onSave={handleSaveNote}
          file={notesFileTarget}
          folder={notesFolderTarget}
        />
      </div>
      <SuccessModal
        open={successModal.open}
        title={successModal.title}
        message={successModal.message}
        onClose={() => setSuccessModal({ open: false, title: "", message: "" })}
      />
    </div>
  );
}