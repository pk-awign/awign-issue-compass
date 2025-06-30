import { generateTicketPDF } from './pdfGenerator';

export const generateTicketFile = async (ticketInfo: { ticketNumber: string; trackingLink: string }, issueData: any) => {
  try {
    // Try to generate PDF first
    await generateTicketPDF(ticketInfo, issueData);
  } catch (error) {
    console.error('Failed to generate PDF, falling back to text:', error);
    // Fallback to text file
    generateTextTicket(ticketInfo, issueData);
  }
};

const generateTextTicket = (ticketInfo: { ticketNumber: string; trackingLink: string }, issueData: any) => {
  const currentDate = new Date().toLocaleString();
  
  const ticketContent = `
═══════════════════════════════════════════════
               🏢 AWIGN 🏢
            ESCALATION MANAGEMENT SYSTEM
         TCS Examination Operations Portal
═══════════════════════════════════════════════

TICKET INFORMATION
═══════════════════════════════════════════════
Ticket Number: ${ticketInfo.ticketNumber}
Generated On: ${currentDate}
Status: SUBMITTED

TRACKING INFORMATION
═══════════════════════════════════════════════
Tracking Link: ${ticketInfo.trackingLink}

ISSUE DETAILS
═══════════════════════════════════════════════
Category: ${issueData.issueCategory?.replace('_', ' ').toUpperCase() || 'N/A'}
Centre Code: ${issueData.centreCode || 'N/A'}
City: ${issueData.city || 'N/A'}
${issueData.resourceId ? `Resource ID: ${issueData.resourceId}` : ''}
${issueData.awignAppTicketId ? `Awign App Ticket ID: ${issueData.awignAppTicketId}` : ''}
${!issueData.isAnonymous && issueData.submittedBy ? `Submitted By: ${issueData.submittedBy}` : 'Submitted Anonymously'}

DESCRIPTION
═══════════════════════════════════════════════
${issueData.issueDescription || 'No description provided'}

${issueData.issueEvidence && issueData.issueEvidence.length > 0 ? `
ATTACHMENTS
═══════════════════════════════════════════════
${issueData.issueEvidence.map((file: File) => `• ${file.name} (${(file.size / 1024).toFixed(1)} KB)`).join('\n')}
` : ''}

INSTRUCTIONS
═══════════════════════════════════════════════
1. Keep this ticket number safe for future reference
2. Use the tracking link to monitor your issue status
3. You will receive updates as your issue progresses
4. For urgent matters, contact support with your ticket number

═══════════════════════════════════════════════
This ticket was generated automatically by Awign Escalation Management System.
Save this file for your records.
═══════════════════════════════════════════════
  `.trim();

  const blob = new Blob([ticketContent], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Awign_Ticket_${ticketInfo.ticketNumber}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const generateWhatsAppMessage = (ticketNumber: string, trackingLink: string) => {
  // To prevent link preview, wrap the link in < >
  const message = `🏠 *Awign Escalation Management*\n\n*Ticket Number:* ${ticketNumber}\n*Track your issue:* <${trackingLink}>\n\nYou can send this ticket to yourself for easy tracking. Use the ticket number or link above to track progress.\n\n_Powered by Awign Escalation Management System_`;
  
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
};
