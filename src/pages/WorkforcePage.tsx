import React, { useState } from 'react';
import { PublicIssueForm } from '@/components/PublicIssueForm';
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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white bg-opacity-95 p-2 sm:p-6 overflow-auto">
        <div className="w-full max-w-lg sm:max-w-lg bg-white rounded-lg shadow-lg p-4 sm:p-8 text-center mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">Welcome Invigilators to the Awign Escalation Portal</h1>
          <h2 className="text-base sm:text-lg font-semibold mb-4 text-gray-700">A direct channel to reach the Awign Leadership Team — exclusively for Exam Invigilators.</h2>
          <div className="mb-4 text-left text-sm sm:text-base">
            <div className="font-semibold text-red-600 flex items-center mb-2">⚠️ Important:</div>
            <p className="mb-2">This portal is meant only for <b>escalations</b> — that is, when your issue has already been reported through TLs or Support and has not been resolved in time.<br/>Please do not use this portal to report an issue for the first time. Use your regular reporting channels first.</p>
            <p>If you've already tried the proper channels and the issue is still unresolved, this portal allows you to:</p>
            <ul className="list-disc ml-6 mb-2">
              <li>✅ Escalate the matter to leadership</li>
              <li>✅ Be assured that your concern will be reviewed with priority</li>
            </ul>
          </div>
          <button
            className="mt-4 w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-base sm:text-lg"
            onClick={() => setStep(3)} // Skip step 2, go directly to form
          >
            I Understand, Proceed to Report Issue
          </button>
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
