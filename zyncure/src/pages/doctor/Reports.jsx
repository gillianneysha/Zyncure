import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../client';
import { generateConsultationNotesPDF } from '../../utils/generateConsultationNotes';
import {
  X, Folder, FileText, Download, ArrowLeft, User, Clock,
  SquarePlus, ChevronDown, MoreVertical, Trash2
} from 'lucide-react';

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

  const [modalContent, setModalContent] = useState({
    title: '',
    message: '',
    isError: false
  });
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);

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
    const { data: connections, error: connError } = await supabase
      .from('doctor_connection_details')
      .select('*')
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

      const fileIds = uniqueFiles.map(f => f.id).filter(Boolean);
      const notesByFileId = await fetchConsultationNotes(fileIds);
      const filesWithNotes = uniqueFiles.map(file => ({
        ...file,
        consultation_notes: notesByFileId[file.id] || [],
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

  // --- PATCH: fetch consultation notes for folder files ---
  async function fetchFolderFilesWithNotes(folderId, patientId) {
    // Get all files in folder owned by patient
    const { data: filesInFolder, error } = await supabase
      .from('medical_files')
      .select('*')
      .eq('folder_id', folderId)
      .eq('owner_id', patientId);

    if (error || !filesInFolder) return [];

    // Get consultation notes for these files
    const fileIds = filesInFolder.map(f => f.id);
    const notesByFileId = await fetchConsultationNotes(fileIds);

    return filesInFolder.map(file => ({
      ...file,
      consultation_notes: notesByFileId[file.id] || [],
    }));
  }

  async function handleOpenSharedFolder(folder) {
    setOpenedFolder(folder);
    setPreviewFile(null);

    // 1. Files in this folder that are already in sharedFiles (from shares)
    let folderFiles = [];
    if (sharedFiles && folder) {
      folderFiles = sharedFiles.filter(f => f.folder_id === folder.id);
    }

    // 2. PLUS: Fetch all files in this folder owned by the patient, with notes
    if (folder && selectedPatient?.id) {
      const filesFromPatientWithNotes = await fetchFolderFilesWithNotes(folder.id, selectedPatient.id);
      // Avoid duplicates (by id)
      const existingFileIds = new Set(folderFiles.map(f => f.id));
      filesFromPatientWithNotes.forEach(f => {
        if (!existingFileIds.has(f.id)) {
          folderFiles.push(f);
        }
      });
    }

    // Update the selected patient's files in the patients state to include folder files
    setPatients(prev => prev.map(patient => {
      if (patient.id === selectedPatient?.id) {
        // Merge folder files with existing files, avoiding duplicates
        const existingFileIds = new Set(patient.files.map(f => f.id));
        const newFiles = folderFiles.filter(f => !existingFileIds.has(f.id));
        return {
          ...patient,
          files: [...patient.files, ...newFiles]
        };
      }
      return patient;
    }));

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

  async function handleDelete(file) {
    if (!currentUser || currentUser.id !== file.owner_id) return;

    setFileToDelete(file);
    setShowDeleteModal(true);
  } // Add this missing closing brace

  function handleDropdownToggle() {
    setDropdownOpen(v => !v);
  }

  async function handleSaveNote(noteText) {
    if (!currentUser || !selectedPatient) return;

    try {
      setModalContent({
        title: 'Saving Consultation Note...',
        message: 'Please wait while we save your consultation note.',
        isError: false
      });
      setShowModal(true);

      let now = new Date();

      if (notesFileTarget && notesFileTarget.id) {
        const { data: insertedNote, error } = await supabase.from('consultation_notes').insert([
          {
            file_id: notesFileTarget.id,
            folder_id: notesFileTarget.folder_id || null,
            patient_id: selectedPatient.id,
            doctor_id: currentUser.id,
            note: noteText,
            created_at: now.toISOString()
          }
        ]).select().single();

        if (error) {
          throw new Error(error.message);
        }

        // Update the file with the new note immediately
        const updateFileWithNote = (file) => {
          if (file.id === notesFileTarget.id) {
            return {
              ...file,
              consultation_notes: [...(file.consultation_notes || []), insertedNote]
            };
          }
          return file;
        };

        // Update states immediately
        setPatients(prev => prev.map(patient =>
          patient.id === selectedPatient.id
            ? { ...patient, files: patient.files.map(updateFileWithNote) }
            : patient
        ));

        setSharedFiles(prev => prev.map(updateFileWithNote));
        setFolderFiles(prev => prev.map(updateFileWithNote));

        // Update preview file if it's the same file
        if (previewFile && previewFile.id === notesFileTarget.id) {
          setPreviewFile(prev => ({
            ...prev,
            consultation_notes: [...(prev.consultation_notes || []), insertedNote]
          }));
        }

        setModalContent({
          title: 'Success!',
          message: 'Consultation note has been saved successfully.',
          isError: false
        });

      } else if (notesFolderTarget && notesFolderTarget.id) {
        // Generate professional PDF using the utility function
        let pdfBlob;
        let filename;

        const { data: doctorProfile } = await supabase
          .from('medicalprofessionals')
          .select('first_name, last_name, email')
          .eq('email', currentUser.email)
          .single();

        const doctorInfo = {
          first_name: doctorProfile?.first_name,
          last_name: doctorProfile?.last_name,
          email: doctorProfile?.email || currentUser.email
        };
        const patientInfo = {
          name: selectedPatient.name,
          email: selectedPatient.email
        };

        const result = await generateConsultationNotesPDF(noteText, doctorInfo, patientInfo, { returnBlob: true });
        pdfBlob = result.blob;
        filename = result.filename;

        const storagePath = `doctor-notes/${selectedPatient.id}/${filename}`;
        let uploadResponse = await supabase.storage
          .from("medical-files")
          .upload(storagePath, pdfBlob, { contentType: "application/pdf", upsert: true });

        if (uploadResponse.error) {
          throw new Error(uploadResponse.error.message);
        }

        const { data: publicUrlData } = supabase.storage
          .from("medical-files")
          .getPublicUrl(storagePath);

        if (!publicUrlData?.publicUrl) {
          throw new Error("Failed to get public URL for uploaded PDF.");
        }

        const { data: insertedFiles, error: fileInsertError } = await supabase
          .from("medical_files")
          .insert([{
            name: filename,
            file_path: storagePath,
            file_url: publicUrlData.publicUrl,
            preview_url: publicUrlData.publicUrl,
            owner_id: currentUser.id,
            folder_id: notesFolderTarget.id,
            mime_type: "application/pdf"
          }])
          .select();

        if (fileInsertError || !insertedFiles || !insertedFiles[0]) {
          throw new Error(fileInsertError?.message || "Failed to insert file");
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
          throw new Error(shareErr.message);
        }

        const { data: insertedNote, error: noteInsertErr } = await supabase.from("consultation_notes").insert([{
          file_id,
          folder_id: notesFolderTarget.id,
          patient_id: selectedPatient.id,
          doctor_id: currentUser.id,
          note: noteText,
          created_at: now.toISOString()
        }]).select().single();

        if (noteInsertErr) {
          throw new Error(noteInsertErr.message);
        }

        // Create the new file object with the note
        const newFile = {
          ...insertedFiles[0],
          consultation_notes: [insertedNote]
        };

        // Update states immediately
        setPatients(prev => prev.map(patient =>
          patient.id === selectedPatient.id
            ? { ...patient, files: [...patient.files, newFile] }
            : patient
        ));

        // If we're in a folder, add to folder files
        if (openedFolder && openedFolder.id === notesFolderTarget.id) {
          setFolderFiles(prev => [...prev, newFile]);
        } else {
          setSharedFiles(prev => [...prev, newFile]);
        }

        setModalContent({
          title: 'Success!',
          message: `Consultation note PDF "${filename}" has been created and shared successfully.`,
          isError: false
        });

      } else {
        // Similar logic for general notes (without folder)
        const { data: doctorProfile } = await supabase
          .from('medicalprofessionals')
          .select('first_name, last_name, email')
          .eq('email', currentUser.email)
          .single();

        const doctorInfo = {
          first_name: doctorProfile?.first_name,
          last_name: doctorProfile?.last_name,
          email: doctorProfile?.email || currentUser.email
        };
        const patientInfo = {
          name: selectedPatient.name,
          email: selectedPatient.email
        };

        const result = await generateConsultationNotesPDF(noteText, doctorInfo, patientInfo, { returnBlob: true });
        const pdfBlob = result.blob;
        const filename = result.filename;

        const storagePath = `doctor-notes/${selectedPatient.id}/${filename}`;
        let uploadResponse = await supabase.storage
          .from("medical-files")
          .upload(storagePath, pdfBlob, { contentType: "application/pdf", upsert: true });

        if (uploadResponse.error) {
          throw new Error(uploadResponse.error.message);
        }

        const { data: publicUrlData } = supabase.storage
          .from("medical-files")
          .getPublicUrl(storagePath);

        if (!publicUrlData?.publicUrl) {
          throw new Error("Failed to get public URL for uploaded PDF.");
        }

        const { data: insertedFiles, error: fileInsertError } = await supabase
          .from("medical_files")
          .insert([{
            name: filename,
            file_path: storagePath,
            file_url: publicUrlData.publicUrl,
            preview_url: publicUrlData.publicUrl,
            owner_id: currentUser.id,
            mime_type: "application/pdf"
          }])
          .select();

        if (fileInsertError || !insertedFiles || !insertedFiles[0]) {
          throw new Error(fileInsertError?.message || "Failed to insert file");
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
          throw new Error(shareErr.message);
        }

        const { data: insertedNote, error: noteInsertErr } = await supabase.from("consultation_notes").insert([{
          file_id,
          patient_id: selectedPatient.id,
          doctor_id: currentUser.id,
          note: noteText,
          created_at: now.toISOString()
        }]).select().single();

        if (noteInsertErr) {
          throw new Error(noteInsertErr.message);
        }

        // Create the new file object with the note
        const newFile = {
          ...insertedFiles[0],
          consultation_notes: [insertedNote]
        };

        // Update states immediately
        setPatients(prev => prev.map(patient =>
          patient.id === selectedPatient.id
            ? { ...patient, files: [...patient.files, newFile] }
            : patient
        ));

        setSharedFiles(prev => [...prev, newFile]);

        setModalContent({
          title: 'Success!',
          message: `Consultation note PDF "${filename}" has been created and shared successfully.`,
          isError: false
        });
      }

      // Auto-close success modal after 2 seconds
      setTimeout(() => {
        setShowModal(false);
      }, 2000);

    } catch (error) {
      console.error('Error saving consultation note:', error);
      setModalContent({
        title: 'Error',
        message: `Failed to save consultation note: ${error.message}`,
        isError: true
      });
    }


    setNotesFileTarget(null);
    setNotesFolderTarget(null);
    await loadPatientsWithInfo();

    // If previewing a folder, reload its files (with notes)
    if (openedFolder) {
      await handleOpenSharedFolder(openedFolder);
    }
  }

  async function confirmDelete() {
    if (!fileToDelete) return;

    try {
      setShowDeleteModal(false);

      setModalContent({
        title: 'Deleting File...',
        message: 'Please wait while we delete the file.',
        isError: false
      });
      setShowModal(true);

      // Delete from database
      const { error } = await supabase.from('medical_files').delete().eq('id', fileToDelete.id);
      if (error) {
        throw new Error(error.message);
      }

      // Update states immediately
      const removeFileFromList = (files) => files.filter(f => f.id !== fileToDelete.id);

      setPatients(prev => prev.map(patient =>
        patient.id === selectedPatient?.id
          ? { ...patient, files: removeFileFromList(patient.files) }
          : patient
      ));

      setSharedFiles(prev => removeFileFromList(prev));
      setFolderFiles(prev => removeFileFromList(prev));

      // Close preview if the deleted file was being previewed
      if (previewFile && previewFile.id === fileToDelete.id) {
        setPreviewFile(null);
      }

      setModalContent({
        title: 'Success!',
        message: 'File has been deleted successfully.',
        isError: false
      });

      // Auto-close success modal after 2 seconds
      setTimeout(() => {
        setShowModal(false);
      }, 2000);

    } catch (error) {
      console.error('Error deleting file:', error);
      setModalContent({
        title: 'Error',
        message: `Failed to delete file: ${error.message}`,
        isError: true
      });
    }

    setFileToDelete(null);
  }

  // --- PATCH: Preview modal always shows sidebar for files with notes inside/outside folders ---
  const renderPreviewModal = (file) => {
    if (!file) return null;
    // Hide sidebar for doctor-note PDFs only
    const showNotesSidebar = !(file.name && file.name.startsWith('consultation-notes-'))
      && file.consultation_notes && file.consultation_notes.length > 0;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div
          className={`bg-white rounded-lg p-4 w-full relative shadow-2xl border flex flex-col ${showNotesSidebar ? "max-w-4xl md:flex-row" : "max-w-md"
            }`}
        >
          <button
            onClick={() => setPreviewFile(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
            title="Close preview"
          >
            <X size={22} />
          </button>
          {/* File Preview */}
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
            </div>
          </div>
          {/* Notes Sidebar */}
          {showNotesSidebar && (
            <div className="w-full md:w-80 border-l bg-gray-50 p-4 flex-shrink-0 overflow-y-auto">
              <div className="mb-3">
                <h3 className="font-semibold text-gray-800 mb-2">Consultation Notes</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {file.consultation_notes.map((note, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={16} className="text-blue-500" />
                        <span className="font-medium text-sm text-gray-700">
                          {doctorMap[note.doctor_id] || note.doctor_id}
                        </span>
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {new Date(note.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{note.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
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
          </div>
        )}

        {/* Notes Modal for both file and folder */}
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
        {/* Status Modal */}
        <StatusModal
          show={showModal}
          onClose={() => setShowModal(false)}
          title={modalContent.title}
          message={modalContent.message}
          isError={modalContent.isError}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          show={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setFileToDelete(null);
          }}
          onConfirm={confirmDelete}
          fileName={fileToDelete?.name || ''}
        />
      </div>
    </div>
  );

  // Status Modal Component (for saving process)
  function StatusModal({ show, onClose, title, message, isError }) {
    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <div className="text-center">
            <div className={`mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center ${isError ? 'bg-red-100' : 'bg-green-100'
              }`}>
              {isError ? (
                <X className={`w-6 h-6 text-red-600`} />
              ) : (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              )}
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${isError ? 'text-red-900' : 'text-gray-900'
              }`}>
              {title}
            </h3>
            <p className="text-gray-600 mb-4">{message}</p>
            {isError && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Delete Confirmation Modal Component
  function DeleteConfirmationModal({ show, onClose, onConfirm, fileName }) {
    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <div className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              Delete File
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{fileName}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}