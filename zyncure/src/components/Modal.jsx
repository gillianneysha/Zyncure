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
          className={`${
            isError
              ? "bg-red-500 hover:bg-red-600"
              : "bg-orange-400 hover:bg-orange-500"
          } text-white font-semibold px-6 py-2 rounded-full transition`}
        >
          {isError ? 'Close' : 'Got it'}
        </button>
      </div>
    </div>
  );
};

export default Modal;
