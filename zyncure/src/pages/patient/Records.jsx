import { SquarePlus, LayoutGrid, Rows3, MoreVertical, FileText, Share, Cross } from 'lucide-react';
import { useState, useRef } from 'react';

export default function Records() {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Sample data for folders
  const folders = [
    { id: 1, name: "Hi-Precision" },
    { id: 2, name: "St. Lukes" },
    { id: 3, name: "Makati Med" },
    { id: 4, name: "Doc Alvin" },
  ];

  // Sample data for files
  const files = [
    { id: 1, name: "09/29/24 - PCOS", preview: "/api/placeholder/400/320" },
    { id: 2, name: "Doc Glinda - Uri...", preview: "/api/placeholder/400/320" },
    { id: 3, name: "Untitled", preview: "/api/placeholder/400/320" },
    { id: 4, name: "Copy - Updated...", preview: "/api/placeholder/400/320" },
    { id: 5, name: "10/10/24 - San L...", preview: "/api/placeholder/400/320" },
    { id: 6, name: "Copy - Doc Glin...", preview: "/api/placeholder/400/320" },
    { id: 7, name: "Counseling - PC...", preview: "/api/placeholder/400/320" },
    { id: 8, name: "Scanned - Platel...", preview: "/api/placeholder/400/320" },
  ];

  const handleUploadClick = () => {
    // Trigger the hidden file input click
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      // Here you would handle the file upload to your server
      console.log('File selected:', file);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-myHeader text-left">Medical Records</h1>
        
        <div className="relative flex">
          <button 
            onClick={handleUploadClick}
            className="flex items-center gap-2 px-2 py-2 text-mySidebar rounded-md hover:bg-indigo-200 transition-colors"
          >
            <SquarePlus size={20} />
          </button>

          {/* View as List */}
          <button
            title="List View"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-2 py-2 rounded-md hover:bg-indigo-200 transition-colors ${
              viewMode === 'list' ? 'bg-indigo-200 text-mySidebar' : 'text-mySidebar'
            }`}
          >
            <Rows3 size={20} />
          </button>

          {/* View as Grid */}
          <button
            title="Grid View"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-2 py-2 rounded-md hover:bg-indigo-200 transition-colors ${
              viewMode === 'grid' ? 'bg-indigo-200 text-mySidebar' : 'text-mySidebar'
            }`}
          >
            <LayoutGrid size={20} />
          </button>
          
          {/* Hidden file input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
        </div>
      </div>
      
      {/* Display selected file name if available */}
      {fileName && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md flex items-center">
          <span className="font-medium">Selected file:</span>
          <span className="ml-2">{fileName}</span>
        </div>
      )}

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

      {/* Folders Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {folders.map((folder) => (
          <FolderCard key={folder.id} name={folder.name} />
        ))}
      </div>

      {/* Files Grid or List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {files.map((file) => (
            <FileCard key={file.id} name={file.name} previewUrl={file.preview} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {files.map((file) => (
            <FileListItem key={file.id} name={file.name} previewUrl={file.preview} />
          ))}
        </div>
      )}

      {/* Share Report Button */}
      <div className="fixed bottom-4 right-4">
        <button className="bg-red-50 text-red-400 p-4 rounded-lg shadow-md flex flex-col items-center">
          <Share className="w-6 h-6 mb-1" />
          <span className="text-xs">Share Report</span>
        </button>
      </div>
    </>
  );
}

// Folder Card Component
function FolderCard({ name }) {
  return (
    <div className="bg-[#55A1A4] text-white p-4 rounded-lg shadow-md flex justify-between items-center">
      <div className="flex items-center">
        <div className="mr-2 text-white">
          <Cross className="mr-2 text-white" />
        </div>
        <span className="font-medium">{name}</span>
      </div>
      <button>
        <MoreVertical className="w-5 h-5" />
      </button>
    </div>
  );
}

// File Card Component (Grid View)
function FileCard({ name, previewUrl }) {
  return (
    <div className="bg-[#55A1A4] rounded-lg shadow-md overflow-hidden">
      <div className="p-2 flex justify-between items-center">
        <div className="flex items-center">
          <FileText className="mr-2 text-white" />
          <span className="text-white text-sm font-medium">{name}</span>
        </div>
        <button>
          <MoreVertical className="w-5 h-5 text-white" />
        </button>
      </div>
      <div className="bg-white p-2">
        <img 
          src={previewUrl} 
          alt={`Preview of ${name}`} 
          className="w-full h-40 object-cover rounded"
        />
      </div>
      <div className="p-2 text-white">
        <div className="text-xs">Records</div>
        <div className="flex justify-between items-center mt-1">
          <div className="text-xs">Type: Medical</div>
          <div className="text-xs">Date: 2024</div>
        </div>
      </div>
    </div>
  );
}

// File List Item Component (List View)
function FileListItem({ name, previewUrl }) {
  return (
    <div className="bg-[#55A1A4] rounded-lg shadow-md overflow-hidden">
      <div className="flex p-2">
        <div className="w-16 h-16 bg-white rounded mr-3 flex-shrink-0">
          <img 
            src={previewUrl} 
            alt={`Preview of ${name}`} 
            className="w-full h-full object-cover rounded"
          />
        </div>
        <div className="flex-grow">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <FileText className="mr-1 text-white" />
              <span className="text-white text-sm font-medium">{name}</span>
            </div>
            <button>
              <MoreVertical className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="text-white">
            <div className="text-xs">Records</div>
            <div className="flex justify-between items-center mt-1">
              <div className="text-xs">Type: Medical</div>
              <div className="text-xs">Date: 2024</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}