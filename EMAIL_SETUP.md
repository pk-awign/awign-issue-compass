# Email Notification Setup

This document explains how to set up email notifications for the AWIGN Escalation Management System.

## 🚨 Current Issue: Email Data Flow Problem

**Problem:** Data flows from Netlify to EmailJS, but when EmailJS sends emails, the data is missing.

**Root Cause:** EmailJS environment variables are not properly configured.

## 🔧 Quick Fix Steps

### Step 1: Set up EmailJS Account
1. Go to [EmailJS.com](https://www.emailjs.com/) and create a free account
2. Verify your email address

### Step 2: Create Email Service
1. Go to **Email Services** → **Add New Service**
2. Choose your email provider (Gmail, Outlook, etc.)
3. Follow the setup instructions
4. **Copy the Service ID** (e.g., `service_abc123`)

### Step 3: Create Email Template
1. Go to **Email Templates** → **Create New Template**
2. Use this template content:

```html
Subject: New Ticket Created: {{ticket_number}}

Hi team,

A new ticket has been created:

• Ticket Number: {{ticket_number}}
• Centre Code & City: {{centre_code}}, {{city}}
• Resource ID: {{resource_id}}
• Issue Category & Severity: {{issue_category}}, {{severity}}
• Submitted By: {{submitted_by}}
• Submitted At: {{submitted_at}}
• Attachments: {{attachments_count}} files

Issue Description:
{{issue_description}}

---
This is an automated notification from the AWIGN Escalation Management System.
```

3. **Copy the Template ID** (e.g., `template_xyz789`)

### Step 4: Get User ID
1. Go to **Account** → **API Keys**
2. **Copy the Public Key** (e.g., `user_def456`)

### Step 5: Configure Environment Variables

**For Local Development:**
Create a `.env.local` file in your project root:

```env
VITE_EMAILJS_SERVICE_ID=service_abc123
VITE_EMAILJS_TEMPLATE_ID=template_xyz789
VITE_EMAILJS_USER_ID=user_def456
```

**For Netlify Production:**
1. Go to your Netlify dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add these variables:
   - `VITE_EMAILJS_SERVICE_ID` = `service_abc123`
   - `VITE_EMAILJS_TEMPLATE_ID` = `template_xyz789`
   - `VITE_EMAILJS_USER_ID` = `user_def456`

### Step 6: Test the Setup

1. **Create a test ticket** in your application
2. **Check browser console** for debug logs:
   ```
   🔍 DEBUG: Email Service Configuration:
   📧 DEBUG: Generated email content for ticket creation:
   🚀 Attempting to send via EmailJS...
   📤 Sending to EmailJS with params:
   📥 EmailJS Response:
   ```

3. **Check your email** for the notification

## 🔍 Debugging the Data Flow

### Check Environment Variables
Add this to your browser console:
```javascript
console.log('EmailJS Config:', {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  userId: import.meta.env.VITE_EMAILJS_USER_ID
});
```

### Test EmailJS Configuration
Add this to your browser console:
```javascript
// Import the EmailService
import { EmailService } from './src/services/emailService';
// Debug the configuration
EmailService.debugEmailJSConfig();
```

### Manual Email Test
Add this to your browser console:
```javascript
// Test sending an email
EmailService.sendTicketCreatedNotification({
  ticketNumber: 'TEST-001',
  centreCode: 'CENTRE001',
  city: 'Mumbai',
  resourceId: 'RES001',
  issueCategory: 'TECHNICAL_ISSUE',
  issueDescription: 'This is a test email',
  submittedBy: 'Test User',
  submittedAt: new Date(),
  severity: 'sev3'
});
```

## 📧 Email Content Structure

The system sends these parameters to EmailJS:

```javascript
{
  to_email: "issue_management@awign.com",
  subject: "New Ticket Created: AWG-2024-001",
  message: "Full email content...",
  ticket_number: "AWG-2024-001",
  centre_code: "CENTRE001",
  city: "Mumbai",
  resource_id: "RES001",
  issue_category: "TECHNICAL_ISSUE",
  issue_description: "The system is not responding...",
  submitted_by: "John Doe",
  submitted_at: "1/1/2024, 10:00:00 AM",
  severity: "sev3",
  attachments_count: 2
}
```

## 🚨 Common Issues & Solutions

### Issue 1: "EmailJS not configured"
**Solution:** Set all three environment variables

### Issue 2: "Email sent but no data"
**Solution:** Check EmailJS template variables match the parameters

### Issue 3: "CORS error"
**Solution:** EmailJS handles CORS automatically, check network tab

### Issue 4: "Rate limit exceeded"
**Solution:** EmailJS free tier has limits, upgrade if needed

## 🔄 Alternative Email Services

If EmailJS doesn't work, you can use:

### Option 1: SendGrid
```env
VITE_EMAIL_API_URL=https://your-sendgrid-api.com/send
```

### Option 2: Resend
```env
VITE_EMAIL_API_URL=https://your-resend-api.com/send
```

### Option 3: Custom API
Create your own email endpoint and set:
```env
VITE_EMAIL_API_URL=https://your-api.com/send-email
```

## 📊 Monitoring

Check these logs in browser console:
- ✅ `🔍 DEBUG: Email Service Configuration`
- ✅ `📧 DEBUG: Generated email content`
- ✅ `🚀 Attempting to send via EmailJS`
- ✅ `📤 Sending to EmailJS with params`
- ✅ `📥 EmailJS Response`
- ✅ `✅ EmailJS email sent successfully`

## 🔒 Security Notes

- Never commit `.env` files to version control
- Use environment variables for all sensitive data
- Monitor email sending quotas
- Consider rate limiting for production use

## Overview

The system sends email notifications to `issue_management@awign.com` for:
- New ticket creation
- Status changes

## Email Service Options

### Option 1: EmailJS (Recommended for quick setup)

1. **Sign up at [EmailJS](https://www.emailjs.com/)**
2. **Create an Email Service:**
   - Go to Email Services
   - Add a new service (Gmail, Outlook, etc.)
   - Configure your email credentials

3. **Create an Email Template:**
   - Go to Email Templates
   - Create a new template
   - Use variables: `{{to_email}}`, `{{subject}}`, `{{message}}`

4. **Get your credentials:**
   - Service ID
   - Template ID
   - User ID (Public Key)

5. **Add to environment variables:**
   ```env
   VITE_EMAILJS_SERVICE_ID=your_service_id
   VITE_EMAILJS_TEMPLATE_ID=your_template_id
   VITE_EMAILJS_USER_ID=your_user_id
   ```

### Option 2: Custom Email API

1. **Set up your email service** (SendGrid, Resend, etc.)
2. **Create an API endpoint** that accepts:
   ```json
   {
     "to": "issue_management@awign.com",
     "subject": "New Ticket Created",
     "content": "Email content here"
   }
   ```
3. **Add to environment variables:**
   ```env
   VITE_EMAIL_API_URL=https://your-api-endpoint.com/send
   ```

### Option 3: Development Mode

If no email service is configured, the system will log email notifications to the console for development purposes.

## Email Content

### New Ticket Notification
```
New Ticket Created

Ticket Number: AWG-2024-001
Centre Code: CENTRE001
City: Mumbai
Resource ID: RES001
Category: TECHNICAL_ISSUE
Severity: sev3
Submitted By: John Doe
Submitted At: 1/1/2024, 10:00:00 AM

Description:
The system is not responding properly...

Attachments (2):
- screenshot.png (245.3 KB, image/png)
- log.txt (12.1 KB, text/plain)

---
This is an automated notification from the AWIGN Escalation Management System.
```

### Status Change Notification
```
Ticket Status Updated

Ticket Number: AWG-2024-001
Status Changed: open → in_progress
Changed By: Jane Smith
Changed At: 1/1/2024, 11:00:00 AM
Resolution Notes: Working on the issue...

---
This is an automated notification from the AWIGN Escalation Management System.
```

## Testing

1. **Create a new ticket** - Check for email notification
2. **Update ticket status** - Check for status change notification
3. **Check console logs** - For development mode verification

## Troubleshooting

- **Email not sending:** Check console for error messages
- **Wrong email address:** Verify `NOTIFICATION_EMAIL` in `EmailService`
- **API errors:** Check network tab for failed requests
- **Environment variables:** Ensure they're properly set in your deployment

## Security Notes

- Never commit email credentials to version control
- Use environment variables for all sensitive data
- Consider rate limiting for email notifications
- Monitor email sending quotas 