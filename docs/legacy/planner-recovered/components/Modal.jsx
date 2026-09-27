import React from 'react';
import { FaTimes } from 'react-icons/fa';

const Modal = ({ isOpen, onClose, children, className }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div className="min-h-screen px-4 pt-24 pb-4">
        <div className={`relative mx-auto bg-white rounded-lg shadow-xl max-w-lg ${className || ''}`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Close"
          >
            <FaTimes className="w-5 h-5" />
          </button>
          <div className="pt-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
