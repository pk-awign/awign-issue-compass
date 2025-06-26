
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { WorkforcePage } from './WorkforcePage';
import { performSystemHealthCheck } from '@/utils/systemHealthCheck';
import { initializeSampleData } from '@/utils/initializeSampleData';

const Index = () => {
  const { user, isSuperAdmin, isResolver, isApprover } = useAuth();
  const navigate = useNavigate();

  console.log('Index component rendered');
  console.log('User:', user);
  console.log('isSuperAdmin:', isSuperAdmin);
  console.log('isResolver:', isResolver);
  console.log('isApprover:', isApprover);

  useEffect(() => {
    console.log('Index useEffect running');
    
    // Run system health check
    performSystemHealthCheck().then(result => {
      console.log('🏥 System Health Check Result:', result);
      
      if (result.status === 'healthy') {
        console.log('🎉 HURRAY! All systems are functioning properly!');
      } else {
        console.warn('⚠️ System health issues detected:', result.summary);
      }
    }).catch(error => {
      console.error('❌ Health check failed:', error);
    });
    
    // Initialize sample data if needed
    initializeSampleData().catch(error => {
      console.error('❌ Sample data initialization failed:', error);
    });
    
    if (user) {
      console.log('User found, checking roles...');
      if (isSuperAdmin) {
        console.log('Redirecting to admin');
        navigate('/admin');
      } else if (isResolver) {
        console.log('Redirecting to ticket-resolver');
        navigate('/ticket-resolver');
      } else if (isApprover) {
        console.log('Redirecting to resolution-approver');
        navigate('/resolution-approver');
      }
      // Invigilator users stay on the main page
    } else {
      console.log('No user found, staying on workforce page');
    }
  }, [user, isSuperAdmin, isResolver, isApprover, navigate]);

  console.log('Rendering WorkforcePage');
  return <WorkforcePage />;
};

export default Index;
