   import React from 'react';

   const Modal = ({ isOpen, title, message, onClose, isError }) => {
     if (!isOpen) return null;

     return (
       <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
         <div className="bg-white rounded-xl p-6 shadow-2xl text-center max-w-sm w-full">
           <h2 className={`text-xl font-bold ${isError ? 'text-red-600' : 'text-[#3BA4A0]'}`}>{title}</h2>
           <p className="text-[#555] mb-4">{message}</p>
           <button
             onClick={onClose}
             className={`bg-${isError ? 'red-500' : '#F98679'} text-white font-semibold px-6 py-2 rounded-full hover:bg-${isError ? 'red-600' : '#d87364'} transition`}
           >
             {isError ? 'Close' : 'Got it'}
           </button>
         </div>
       </div>
     );
   };

   export default Modal;
   