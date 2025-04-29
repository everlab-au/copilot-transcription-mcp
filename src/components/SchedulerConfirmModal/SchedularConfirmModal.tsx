import React from 'react';
import './index.css';

interface ModalProps {
  title: string;
  description: string;
  onAccept: () => void;
  onReject: () => void;
  isOpen: boolean;
}

const SchedularConfirmModal: React.FC<ModalProps> = ({ title, description, onAccept, onReject, isOpen }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2 className="modal-title">{title}</h2>
        <p className="modal-description">{description}</p>
        <div className="modal-actions">
          <button className="modal-button reject" onClick={onReject}>Reject</button>
          <button className="modal-button accept" onClick={onAccept}>Accept</button>
        </div>
      </div>
    </div>
  );
};

export default SchedularConfirmModal;
