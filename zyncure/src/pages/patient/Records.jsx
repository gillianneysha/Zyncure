import { SquarePlus } from 'lucide-react';
import { useState, useRef } from 'react';

export default function Records() {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');

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
        
        <div className="relative">
          <button 
            onClick={handleUploadClick}
            className="flex items-center gap-2 px-4 py-2 text-mySidebar rounded-md hover:bg-indigo-200 transition-colors"
          >
            <SquarePlus size={20} />
            {/* <span>Upload Record</span> */}
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
    </>
  );
}