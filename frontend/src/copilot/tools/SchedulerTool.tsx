import React, { useState } from 'react';
import { useCopilotAction } from '@copilotkit/react-core';
import SchedularConfirmCard from '@/components/SchedularConfirmCard';

export function SchedulerTool() {

  const handleAccept = () => {
    console.log(`Appointment accepted`);
  };

  const handleReject = () => {
    console.log(`Appointment rejected`);
  };

  useCopilotAction({
    name: 'scheduleAppointment',
    description: 'Schedule an appointment at a specific time',
    parameters: [
      {
        name: 'time',
        type: 'string',
        description: 'The time for the appointment (e.g., "4pm")',
        required: true,
      },
    ],

    renderAndWaitForResponse: ({ args, respond, status}) => {
      const { time } = args;
      return (
        <SchedularConfirmCard
          title="Confirm Appointment"
          description={`Do you want to schedule an appointment at ${time}?`}
          onAccept={() => {
            handleAccept();
            respond?.('appointment accepted');
          }}
          onReject={() => {
            handleReject();
            respond?.('appointment rejected');
          }}
        />
      )
    }
  });

  return null;
}