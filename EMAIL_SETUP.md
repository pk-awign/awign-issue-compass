# Email Notification Setup

This document explains how to set up email notifications for the AWIGN Issue Management System.

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
This is an automated notification from the AWIGN Issue Management System.
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
This is an automated notification from the AWIGN Issue Management System.
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