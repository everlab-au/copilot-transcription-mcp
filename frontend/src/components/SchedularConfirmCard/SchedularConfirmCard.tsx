import { useState } from 'react';
import './index.css';

interface ConfirmationCardProps {
  title: string;
  description: string;
  onAccept: () => void;
  onReject: () => void;
}

export default function ConfirmationCard({ title, description, onAccept, onReject }: ConfirmationCardProps) {
  const [decisionMade, setDecisionMade] = useState<null | 'accepted' | 'rejected'>(null);

  const handleAccept = () => {
    setDecisionMade('accepted');
    onAccept();
  };

  const handleReject = () => {
    setDecisionMade('rejected');
    onReject();
  };

  return (
    <div className={`confirmation-card ${decisionMade ? 'disabled' : ''}`}>
      <h3 className="confirmation-title">{title}</h3>
      <p className="confirmation-description">{description}</p>

      {decisionMade ? (
        <div className={`confirmation-result ${decisionMade}`}>
          {decisionMade === 'accepted' ? '✅ Accepted' : '❌ Rejected'}
        </div>
      ) : (
        <div className="confirmation-buttons">
          <button className="accept-button" onClick={handleAccept}>Accept</button>
          <button className="reject-button" onClick={handleReject}>Reject</button>
        </div>
      )}
    </div>
  );
}
