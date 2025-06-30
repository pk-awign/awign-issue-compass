import { supabase } from '@/integrations/supabase/client';
import { Issue } from '@/types/issue';

const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'];
const issueCategories: Issue['issueCategory'][] = ['payment_delay', 'partial_payment', 'behavioral_complaint', 'improvement_request', 'facility_issue', 'penalty_issue', 'other'];
const severities: Issue['severity'][] = ['sev1', 'sev2', 'sev3'];
const statuses: Issue['status'][] = ['open', 'in_progress', 'resolved', 'closed'];

const sampleDescriptions = [
  'Payment for invigilation services has been delayed beyond the agreed timeline.',
  'Received only partial payment for completed examination duties.',
  'Inappropriate behavior from examination center staff towards invigilators.',
  'Request for better seating arrangements in examination halls.',
  'Technical issues with the examination system causing delays.',
  'Unclear instructions provided for examination procedures.',
  'Issues with air conditioning in examination centers.',
  'Request for additional break time during long examination sessions.',
  'Problems with student verification process.',
  'Difficulty accessing examination materials and resources.'
];

const sampleNames = [
  'Priya Sharma', 'Rahul Kumar', 'Anjali Patel', 'Vikram Singh', 'Sneha Gupta',
  'Amit Verma', 'Kavya Reddy', 'Arjun Nair', 'Pooja Agarwal', 'Suresh Yadav'
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomDate(daysBack: number = 30): Date {
  const now = new Date();
  const randomDaysBack = Math.floor(Math.random() * daysBack);
  const randomDate = new Date(now.getTime() - randomDaysBack * 24 * 60 * 60 * 1000);
  return randomDate;
}

function generateTicketNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 999) + 1;
  return `AWG-${year}-${String(random).padStart(3, '0')}`;
}

function generateCentreCode(city: string): string {
  const cityCode = city.substring(0, 3).toUpperCase();
  const number = Math.floor(Math.random() * 999) + 1;
  return `TCS-${cityCode}-${String(number).padStart(3, '0')}`;
}

export async function createRandomTickets(count: number = 10) {
  console.log(`🎫 Creating ${count} random tickets...`);
  
  const tickets = [];
  
  for (let i = 0; i < count; i++) {
    const city = getRandomElement(cities);
    const issueCategory = getRandomElement(issueCategories);
    const severity = getRandomElement(severities);
    const status = getRandomElement(statuses);
    const submittedBy = getRandomElement(sampleNames);
    const issueDescription = getRandomElement(sampleDescriptions);
    const centreCode = generateCentreCode(city);
    const ticketNumber = generateTicketNumber();
    const submittedAt = generateRandomDate();
    
    // Create issue date object
    const issueDate = {
      type: 'single' as const,
      dates: [generateRandomDate(7)],
      startDate: undefined,
      endDate: undefined
    };

    // Auto-assign resolver based on city
    let assignedResolver = 'resolver_1';
    if (city === 'Delhi') {
      assignedResolver = 'resolver_2';
    } else if (city === 'Mumbai') {
      assignedResolver = 'resolver_3';
    }

    const ticket = {
      ticket_number: ticketNumber,
      centre_code: centreCode,
      city: city,
      resource_id: `RES${Math.floor(Math.random() * 9999) + 1000}`,
      issue_category: issueCategory,
      issue_description: issueDescription,
      issue_date: issueDate,
      severity: severity,
      status: status,
      is_anonymous: Math.random() > 0.7, // 30% chance of anonymous
      submitted_by: submittedBy,
      submitted_at: submittedAt.toISOString(),
      assigned_resolver: assignedResolver,
      resolved_at: status === 'resolved' || status === 'closed' ? new Date().toISOString() : null,
      resolution_notes: status === 'resolved' || status === 'closed' ? 'Issue resolved successfully' : null,
    };

    tickets.push(ticket);
  }

  try {
    const { data, error } = await supabase
      .from('tickets')
      .insert(tickets)
      .select();

    if (error) {
      console.error('❌ Error creating random tickets:', error);
      throw error;
    }

    console.log(`✅ Successfully created ${data.length} random tickets`);
    
    // Add some random comments to a few tickets
    if (data.length > 0) {
      await addRandomComments(data.slice(0, Math.min(5, data.length)));
    }
    
    return data;
  } catch (error) {
    console.error('❌ Failed to create random tickets:', error);
    throw error;
  }
}

async function addRandomComments(tickets: any[]) {
  console.log('💬 Adding random comments to tickets...');
  
  const commentAuthors = ['Admin', 'Resolver', 'Supervisor'];
  const commentRoles: ('admin' | 'resolver' | 'approver')[] = ['admin', 'resolver', 'approver'];
  const sampleComments = [
    'Investigating the issue further.',
    'Escalating to the concerned department.',
    'Issue has been acknowledged and is under review.',
    'Additional information required from the reporter.',
    'Working on a resolution, expected completion by tomorrow.',
    'Issue resolved, please verify.',
    'Closed as duplicate of another ticket.',
    'No further action required.'
  ];

  const comments = [];
  
  for (const ticket of tickets) {
    const numComments = Math.floor(Math.random() * 3) + 1; // 1-3 comments per ticket
    
    for (let i = 0; i < numComments; i++) {
      const comment = {
        ticket_id: ticket.id,
        content: getRandomElement(sampleComments),
        author: getRandomElement(commentAuthors),
        author_role: getRandomElement(commentRoles),
        is_internal: Math.random() > 0.6, // 40% chance of internal comment
      };
      
      comments.push(comment);
    }
  }

  try {
    const { error } = await supabase
      .from('comments')
      .insert(comments);

    if (error) {
      console.error('❌ Error creating random comments:', error);
    } else {
      console.log(`✅ Successfully created ${comments.length} random comments`);
    }
  } catch (error) {
    console.error('❌ Failed to create random comments:', error);
  }
}

export async function clearAllTickets() {
  console.log('🗑️ Clearing all tickets and comments...');
  
  try {
    // Delete comments first due to foreign key constraints
    await supabase.from('comments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('✅ All tickets and comments cleared');
  } catch (error) {
    console.error('❌ Error clearing tickets:', error);
    throw error;
  }
}

export async function createSampleAttachments() {
  console.log('📎 Creating sample attachments...');
  
  try {
    // Get a few existing tickets
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id')
      .limit(3);

    if (ticketsError) throw ticketsError;

    const sampleAttachments = [
      {
        file_name: 'screenshot_evidence.png',
        file_size: 245760, // 240 KB
        file_type: 'image/png',
        storage_path: 'sample/screenshot_evidence.png'
      },
      {
        file_name: 'payment_receipt.pdf',
        file_size: 512000, // 500 KB
        file_type: 'application/pdf',
        storage_path: 'sample/payment_receipt.pdf'
      },
      {
        file_name: 'incident_report.docx',
        file_size: 153600, // 150 KB
        file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        storage_path: 'sample/incident_report.docx'
      }
    ];

    for (const ticket of tickets) {
      // Add 1-2 attachments per ticket
      const numAttachments = Math.floor(Math.random() * 2) + 1;
      const selectedAttachments = sampleAttachments.slice(0, numAttachments);
      
      for (const attachment of selectedAttachments) {
        const { error } = await supabase
          .from('attachments')
          .insert({
            ticket_id: ticket.id,
            ...attachment,
            uploaded_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error creating sample attachment:', error);
        }
      }
    }

    console.log('✅ Sample attachments created successfully');
  } catch (error) {
    console.error('❌ Failed to create sample attachments:', error);
  }
}
