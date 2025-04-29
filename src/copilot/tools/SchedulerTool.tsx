import React, { useState } from 'react';
import { useCopilotAction } from '@copilotkit/react-core';
import SchedularConfirmModal from '@/components/SchedulerConfirmModal';

export function SchedulerTool() {
  const [modalTime, setModalTime] = useState<string | null>(null);

  const handleAccept = () => {
    console.log(`Appointment accepted at ${modalTime}`);
    setModalTime(null);
  };

  const handleReject = () => {
    console.log(`Appointment rejected at ${modalTime}`);
    setModalTime(null);
  };

  useCopilotAction({
    name: 'scheduleAppointment',
    description: 'Schedule an appointment at a specific time',
    parameters: [
      {
        name: 'time',
        type: 'string',
        description: 'The time for the appointment (e.g., "4pm")',
      },
    ],
    handler: async ({ time }) => {
      setModalTime(time);
    },
  });

  return (
    <>
      {modalTime && (
        <SchedularConfirmModal
          isOpen={true}
          title="Confirm Appointment"
          description={`Do you want to schedule an appointment at ${modalTime}?`}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
    </>
  );
}