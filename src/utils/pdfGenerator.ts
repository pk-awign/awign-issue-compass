import jsPDF from 'jspdf';
import { AttachmentMetadata, processAttachments } from './attachmentProcessor';
import { generateQRCodeDataURL } from './qrCodeGenerator';
import QRCode from 'qrcode';

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
          if (typeof dates[0] === 'object' && dates[0].date) {
            return dates.map((d: any) => `${new Date(d.date).toLocaleDateString()}${d.description ? ': ' + d.description : ''}`).join('\n');
          } else {
            return dates.map((date: Date) => new Date(date).toLocaleDateString()).join(', ');
          }
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

const logoBase64 = 'data:image/png;base64,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';

export const generateTicketPDF = async (ticketInfo: TicketInfo, issueData: IssueData) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (2 * margin);
  let yPosition = margin;

  // Header with minimized logo
  pdf.setFillColor(31, 41, 55); // gray-800
  pdf.rect(0, 0, pageWidth, 40, 'F');
  pdf.addImage(logoBase64, 'PNG', margin, 12, 18, 7); // Even smaller logo, slightly lower

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(15);
  pdf.setFont('helvetica', 'bold');
  pdf.text('AWIGN INVIGILATION ESCALATION TICKET', margin + 25, 18);

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('TCS Project', margin + 25, 30);

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

  // Real QR code for tracking link (below ticket info box, right-aligned)
  const qrDataUrl = await QRCode.toDataURL(ticketInfo.trackingLink, { width: 36, margin: 0 });
  pdf.addImage(qrDataUrl, 'PNG', pageWidth - margin - 36, yPosition + 5, 36, 36);

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
    pdf.text(detail.value, margin + 45, yPosition);
    yPosition += 12; // Increased gap
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
    '4. For urgent matters, contact support with your ticket number',
    '5. Save this file for your records.'
  ];

  instructions.forEach((instruction) => {
    pdf.text(instruction, margin, yPosition);
    yPosition += 8;
  });

  yPosition += 10;

  // Footer
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, yPosition, pageWidth, 20, 'F');
  
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  // Center align the auto-generation text
  const autoGenText = 'This ticket was generated automatically by Awign Escalation Management System.';
  const textWidth = pdf.getTextWidth(autoGenText);
  const centerX = (pageWidth - textWidth) / 2;
  pdf.text(autoGenText, centerX, yPosition + 12);

  // Save the PDF
  pdf.save('Awign_Ticket_' + ticketInfo.ticketNumber + '.pdf');
};
