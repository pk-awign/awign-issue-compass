import React, { useState } from 'react';
import { PublicIssueForm } from '@/components/PublicIssueForm';
import { BrandPoweredByFooter } from '@/components/BrandPoweredByFooter';
import { useIssues } from '@/contexts/IssueContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const WorkforcePage: React.FC = () => {
  const { addIssue } = useIssues();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // Overlay state
  const [step, setStep] = useState(1); // 1: Welcome, 2: Choose mode (HIDDEN), 3: Show form
  const [reportAnonymously, setReportAnonymously] = useState(false); // Always false - anonymous disabled

  const handleSubmitIssue = async (issueData: any) => {
    // Pass user ID if logged in, otherwise undefined for anonymous
    const ticketNumber = await addIssue(issueData, user?.id);
    return ticketNumber;
  };

  const handleAdminLogin = () => {
    setShowAdminLogin(true);
    navigate('/login');
  };

  // Overlay Step 1: Welcome
  if (step === 1) {
    return (
      <div className="fixed inset-0 z-50 flex min-w-0 flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-white bg-opacity-95 p-2 sm:p-6">
        <div className="mx-auto w-full min-w-0 max-w-lg rounded-lg bg-white p-4 text-center shadow-lg sm:p-8">
          <h1 className="text-2xl font-bold mb-2">Awign Escalation Portal</h1>
          <h2 className="text-base sm:text-lg font-semibold mb-4 text-gray-700">For Exam Invigilators only</h2>
          <div className="mb-4 text-left text-sm sm:text-base">
            <div className="font-semibold text-red-600 flex items-center mb-2">⚠️ Important:</div>
            <p className="mb-2">This portal is only for issues already reported to your Team Leader or Support but not solved yet.<br/>If it's your first time reporting, please use the usual channels.</p>
            <p className="mb-2">Use this portal to:</p>
            <ul className="ml-1 space-y-2 mb-2">
              <li className="flex gap-2"><span aria-hidden="true">✅</span><span>Raise an issue that hasn't been resolved</span></li>
              <li className="flex gap-2"><span aria-hidden="true">✅</span><span>Get faster attention from the leadership team</span></li>
            </ul>
            <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
              <span className="font-semibold text-yellow-800 block mb-1">Saw something wrong at the exam centre?</span>
              <span className="text-yellow-700">Report any malpractice here.<br/>Your name will stay confidential, and if your report is correct, you may get a reward.</span>
            </div>
          </div>
          <button
            className="mt-4 w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-base sm:text-lg"
            onClick={() => setStep(3)}
          >
            I Understand, Report Now
          </button>
          <BrandPoweredByFooter className="mt-8 border-gray-100" />
        </div>
      </div>
    );
  }

  // Step 3: Show the form (Step 2 is hidden - anonymous feature disabled)
  return (
    <PublicIssueForm 
      onSubmit={handleSubmitIssue}
      onAdminLogin={handleAdminLogin}
      defaultAnonymous={false} // Always false - anonymous disabled
      hideHeader={true}
    />
  );
};
