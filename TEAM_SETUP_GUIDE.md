# 🚀 Awign Escalation Management Portal - Team Setup Guide

## 📦 Project Overview
This is a React + TypeScript + Supabase escalation management portal for Awign invigilation escalations. The application allows users to report issues, track tickets, and manage escalations with role-based access control.

## 🛠️ Prerequisites
Before setting up the project, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **Supabase CLI** (optional, for database management) - [Install guide](https://supabase.com/docs/guides/cli)

## 📋 Setup Instructions

### 1. Extract and Navigate
```bash
# Extract the zip file
unzip awign-issue-compass-main-updated-*.zip

# Navigate to project directory
cd awign-issue-compass-main
```

### 2. Install Dependencies
```bash
# Install all required packages
npm install

# Or if you prefer using bun (faster)
bun install
```

### 3. Environment Configuration
Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Email Configuration (Optional)
VITE_EMAIL_API_URL=your_email_api_url
VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
VITE_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
VITE_EMAILJS_USER_ID=your_emailjs_user_id

# Netlify Configuration (for deployment)
VITE_NETLIFY_SITE_ID=your_netlify_site_id
```

### 4. Database Setup
The project includes SQL migrations in the `supabase/migrations/` folder. To set up the database:

```bash
# If using Supabase CLI
supabase db reset

# Or manually run the migrations in order:
# 1. 20250625111338-07f3a998-96e0-4f00-93a1-d0c53997e86e.sql
# 2. 20250625113538-a01ea036-9137-46c9-94e3-52d2c1ada33e.sql
# 3. 20250625132851-29d93634-cd14-4a54-8451-7993baa72e7e.sql
# 4. 20250625144750-d7b68c15-a59a-4e9f-adba-454b323016a6.sql
# 5. 20250625150000-ticket-management-enhancements.sql
# 6. 20250627062617_fix-status-transitions-and-role-restrictions.sql
# 7. 20250627070000_add-awign-app-ticket-id-and-update-resource-id.sql
```

### 5. Development Server
```bash
# Start the development server
npm run dev

# Or with bun
bun dev
```

The application will be available at `http://localhost:5173`

## 🏗️ Project Structure

```
awign-issue-compass-main/
├── src/
│   ├── components/          # React components
│   │   ├── admin/          # Admin-specific components
│   │   ├── navigation/     # Navigation components
│   │   ├── ui/            # Reusable UI components (shadcn/ui)
│   │   └── dev/           # Development tools
│   ├── contexts/          # React contexts (Auth, User, Issue)
│   ├── hooks/             # Custom React hooks
│   ├── integrations/      # External service integrations
│   │   └── supabase/      # Supabase client and types
│   ├── pages/             # Page components
│   ├── services/          # Business logic services
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── supabase/              # Database migrations and config
├── public/                # Static assets
└── docs/                  # Documentation
```

## 🎯 Key Features

### User Roles
- **Invigilator**: Can report issues and track their tickets
- **Resolver**: Can resolve tickets assigned to them
- **Approver**: Can approve resolutions
- **Super Admin**: Full access to all features

### Core Functionality
- ✅ Issue reporting (anonymous and non-anonymous)
- ✅ Ticket tracking and management
- ✅ Role-based access control
- ✅ File attachments
- ✅ Email notifications
- ✅ Admin dashboard with analytics
- ✅ Mobile-responsive design

## 🚀 Development Workflow

### 1. Making Changes
```bash
# Create a new branch for your feature
git checkout -b feature/your-feature-name

# Make your changes
# Test locally with npm run dev

# Commit your changes
git add .
git commit -m "feat: add your feature description"

# Push to remote
git push origin feature/your-feature-name
```

### 2. Building for Production
```bash
# Build the project
npm run build

# Preview the build
npm run preview
```

### 3. Deployment
```bash
# Deploy to Netlify
netlify deploy --prod --dir=dist
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Anonymous form submission works
- [ ] Non-anonymous form submission works
- [ ] All required fields are validated
- [ ] File uploads work correctly
- [ ] Email notifications are sent
- [ ] Role-based access works
- [ ] Mobile responsiveness is maintained

### Automated Testing (Future Enhancement)
```bash
# Run tests (when implemented)
npm test

# Run tests in watch mode
npm run test:watch
```

## 🔧 Common Issues and Solutions

### 1. Build Errors
```bash
# Clear cache and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### 2. Database Connection Issues
- Verify Supabase credentials in `.env`
- Check if Supabase project is active
- Ensure database migrations are applied

### 3. Email Service Issues
- Email service is optional and won't break the app
- Check email service credentials if notifications are needed

### 4. Anonymous Form Issues
- Recent fix: Anonymous submissions now work correctly
- Resource ID is automatically set to 'NOT_SPECIFIED' for anonymous reports

## 📚 Documentation

### API Documentation
- **Supabase**: Check `src/integrations/supabase/` for database schema
- **Services**: Check `src/services/` for business logic
- **Components**: Check `src/components/` for UI components

### Database Schema
Key tables:
- `tickets`: Main ticket information
- `users`: User accounts and roles
- `comments`: Ticket comments
- `attachments`: File attachments
- `ticket_timeline`: Status change history

## 🤝 Team Collaboration

### Code Standards
- Use TypeScript for all new code
- Follow existing component patterns
- Use shadcn/ui components for consistency
- Add proper error handling
- Include comments for complex logic

### Git Workflow
1. Always work on feature branches
2. Use descriptive commit messages
3. Test changes before pushing
4. Create pull requests for review
5. Keep commits atomic and focused

### Communication
- Use clear commit messages
- Document breaking changes
- Update this guide when adding new setup steps
- Communicate environment changes to the team

## 🚨 Important Notes

### Environment Variables
- Never commit `.env` files to version control
- Share environment variables securely with team members
- Use different environments for development and production

### Database Changes
- Always create migrations for database changes
- Test migrations on a copy of production data
- Coordinate database changes with the team

### Security
- Keep Supabase keys secure
- Don't expose sensitive data in client-side code
- Use proper authentication and authorization

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Review the console for error messages
3. Check the Supabase dashboard for database issues
4. Contact the team lead for complex issues

## 🎉 Getting Started

Once you've completed the setup:
1. Visit `http://localhost:5173`
2. Test the anonymous form submission
3. Try creating a user account
4. Explore the admin dashboard
5. Test file uploads and email notifications

Happy coding! 🚀 