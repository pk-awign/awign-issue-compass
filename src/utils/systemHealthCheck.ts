
// System health check utility
import { SystemDebugger } from './debugger';

export async function performSystemHealthCheck() {
  console.log('🏥 Starting comprehensive system health check...');
  
  try {
    // Run all diagnostics
    const diagnostics = await SystemDebugger.runDiagnostics();
    
    // Test cross-references
    const crossRefs = await SystemDebugger.testCrossReferences();
    
    // Evaluate overall system health
    const systemHealth = evaluateSystemHealth(diagnostics, crossRefs);
    
    console.log('🎯 System Health Summary:', systemHealth);
    
    return {
      status: systemHealth.status,
      diagnostics,
      crossReferences: crossRefs,
      summary: systemHealth
    };
    
  } catch (error) {
    console.error('❌ System health check failed:', error);
    return {
      status: 'critical_failure',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function evaluateSystemHealth(diagnostics: any, crossRefs: any) {
  let healthScore = 100;
  const issues: string[] = [];
  
  // Check database connectivity
  if (diagnostics.database?.status !== 'success') {
    healthScore -= 30;
    issues.push('Database connectivity issues');
  }
  
  // Check table integrity
  Object.entries(diagnostics.tables || {}).forEach(([table, result]: [string, any]) => {
    if (result.status === 'failed') {
      healthScore -= 15;
      issues.push(`Table ${table} has issues`);
    }
  });
  
  // Check service functions
  Object.entries(diagnostics.services || {}).forEach(([service, result]: [string, any]) => {
    if (result === 'missing' || (typeof result === 'object' && result.status === 'failed')) {
      healthScore -= 10;
      issues.push(`Service ${service} has issues`);
    }
  });
  
  // Check cross-references
  if (crossRefs?.status !== 'success') {
    healthScore -= 20;
    issues.push('Cross-reference integrity issues');
  }
  
  let status: 'healthy' | 'warning' | 'critical' | 'failure';
  
  if (healthScore >= 90) {
    status = 'healthy';
  } else if (healthScore >= 70) {
    status = 'warning';
  } else if (healthScore >= 50) {
    status = 'critical';
  } else {
    status = 'failure';
  }
  
  return {
    status,
    healthScore,
    issues,
    message: getHealthMessage(status, healthScore)
  };
}

function getHealthMessage(status: string, score: number): string {
  switch (status) {
    case 'healthy':
      return `🎉 HURRAY! System is in excellent health (${score}% score)`;
    case 'warning':
      return `⚠️ System is functional but has minor issues (${score}% score)`;
    case 'critical':
      return `🚨 System has significant issues that need attention (${score}% score)`;
    case 'failure':
      return `💥 System has critical failures (${score}% score)`;
    default:
      return `❓ System status unknown (${score}% score)`;
  }
}
