import jsPDF from 'jspdf';
import { AttachmentMetadata, processAttachments } from './attachmentProcessor';

interface TicketInfo {
  ticketNumber: string;
  trackingLink: string;
}

interface IssueData {
  issueCategory?: string;
  centreCode?: string;
  city?: string;
  resourceId?: string;
  awignAppTicketId?: string;
  submittedBy?: string;
  isAnonymous?: boolean;
  issueDescription?: string;
  issueEvidence?: File[];
  issueDate?: any; // This can be an object with different date types
}

const formatIssueDate = (issueDate: any): string => {
  if (!issueDate) return 'N/A';
  
  if (typeof issueDate === 'string') return issueDate;
  
  if (typeof issueDate === 'object') {
    const { type, dates, startDate, endDate } = issueDate;
    
    switch (type) {
      case 'single':
        return dates && dates[0] ? new Date(dates[0]).toLocaleDateString() : 'N/A';
      case 'range':
        if (startDate && endDate) {
          return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
        }
        return 'N/A';
      case 'multiple':
        if (dates && dates.length > 0) {
          return dates.map((date: Date) => new Date(date).toLocaleDateString()).join(', ');
        }
        return 'N/A';
      case 'ongoing':
        return 'Ongoing Issue';
      default:
        return 'N/A';
    }
  }
  
  return 'N/A';
};

export const generateTicketPDF = async (ticketInfo: TicketInfo, issueData: IssueData) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (2 * margin);
  let yPosition = margin;

  // Header with simple title only
  pdf.setFillColor(31, 41, 55); // gray-800
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('AWIGN', margin, 20);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Issue Management System', margin, 30);
  pdf.text('TCS Examination Operations Portal', margin, 37);

  yPosition = 60;

  // Ticket Information Section
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TICKET INFORMATION', margin, yPosition);
  yPosition += 10;

  // Ticket details box
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(margin, yPosition, contentWidth, 40);
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, yPosition, contentWidth, 40, 'F');

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Ticket Number: ' + ticketInfo.ticketNumber, margin + 5, yPosition + 10);
  pdf.text('Tracking Link: ' + ticketInfo.trackingLink, margin + 5, yPosition + 18);
  pdf.text('Generated On: ' + new Date().toLocaleString(), margin + 5, yPosition + 26);
  pdf.text('Status: SUBMITTED', margin + 5, yPosition + 34);

  yPosition += 55;

  // Issue Details Section
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ISSUE DETAILS', margin, yPosition);
  yPosition += 15;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  const details = [
    { label: 'Issue Type', value: issueData.issueCategory?.replace('_', ' ').toUpperCase() || 'N/A' },
    { label: 'Centre Code', value: issueData.centreCode || 'N/A' },
    { label: 'City', value: issueData.city || 'N/A' },
    { label: 'Resource ID', value: issueData.resourceId || 'N/A' },
    { label: 'Awign App Ticket ID', value: issueData.awignAppTicketId || 'N/A' },
    { label: 'Submitted By', value: issueData.isAnonymous ? 'Anonymous' : (issueData.submittedBy || 'N/A') },
    { label: 'Issue Date', value: formatIssueDate(issueData.issueDate) }
  ];

  details.forEach((detail) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(detail.label + ':', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(detail.value, margin + 35, yPosition);
    yPosition += 8;
  });

  yPosition += 10;

  // Description Section
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DESCRIPTION', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const description = issueData.issueDescription || 'No description provided';
  const splitDescription = pdf.splitTextToSize(description, contentWidth);
  pdf.text(splitDescription, margin, yPosition);
  yPosition += splitDescription.length * 5 + 15;

  // Attachments Section (without thumbnails)
  if (issueData.issueEvidence && issueData.issueEvidence.length > 0) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ATTACHMENTS', margin, yPosition);
    yPosition += 15;

    try {
      const attachments = await processAttachments(issueData.issueEvidence);
      
      attachments.forEach((attachment) => {
        // Check if we need a new page
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = margin;
        }

        // Attachment box without thumbnail
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(margin, yPosition, contentWidth, 20);
        pdf.setFillColor(249, 250, 251);
        pdf.rect(margin, yPosition, contentWidth, 20, 'F');

        // File details only
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(attachment.name, margin + 5, yPosition + 8);
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(attachment.size + ' • ' + attachment.type, margin + 5, yPosition + 15);

        yPosition += 25;
      });
    } catch (error) {
      pdf.setFontSize(10);
      pdf.text('Error processing attachments', margin, yPosition);
      yPosition += 10;
    }
  }

  // Instructions Section
  if (yPosition > 220) {
    pdf.addPage();
    yPosition = margin;
  }

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INSTRUCTIONS', margin, yPosition);
  yPosition += 15;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const instructions = [
    '1. Keep this ticket number safe for future reference',
    '2. Use the tracking link to monitor your issue status',
    '3. You will receive updates as your issue progresses',
    '4. For urgent matters, contact support with your ticket number'
  ];

  instructions.forEach((instruction) => {
    pdf.text(instruction, margin, yPosition);
    yPosition += 8;
  });

  yPosition += 10;

  // Save this file note under instructions
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Save this file for your records.', margin, yPosition);

  yPosition += 15;

  // Footer
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, yPosition, pageWidth, 20, 'F');
  
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  // Center align the auto-generation text
  const autoGenText = 'This ticket was generated automatically by Awign Issue Management System.';
  const textWidth = pdf.getTextWidth(autoGenText);
  const centerX = (pageWidth - textWidth) / 2;
  pdf.text(autoGenText, centerX, yPosition + 12);

  // Save the PDF
  pdf.save('Awign_Ticket_' + ticketInfo.ticketNumber + '.pdf');
};
