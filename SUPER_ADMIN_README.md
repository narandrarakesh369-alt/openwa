# Super Admin Access

## Super Admin Credentials

**Email:** narandra.rakesh369@gmail.com  
**Password:** Ramrak16@!

## First Time Setup

1. Navigate to the login page at `/auth`
2. Use the credentials above to sign in
3. You will be redirected to the Super Admin Dashboard

## Super Admin Capabilities

### School Management
- Create new schools and their admin accounts
- Edit school information
- Activate/Freeze schools
- Delete schools
- View subscription status

### Student Membership Management
- View all students across all schools
- Monitor payment status
- Unfreeze frozen student/parent accounts
- Filter by payment status (All/Paid/Unpaid)

### Email Notifications
When a new school is created, you will receive a notification message in the system containing:
- School Name
- School Code
- School Email
- Admin Name
- Admin Email
- Creation Timestamp

## Bootstrap Function

To manually reset or create the super admin account, you can call the edge function:

```bash
# Using curl
curl -X POST https://vddccefwieqnfitmxtjh.supabase.co/functions/v1/bootstrap-super-admin \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

This will:
1. Create or update the super admin user
2. Set the password to: Ramrak16@!
3. Assign super_admin role
4. Update the profile information

## Security Notes

⚠️ **Important:** 
- Change the password after first login
- Do not share these credentials
- The bootstrap function should only be used for initial setup or password recovery
- All school creation actions send notifications to this email

## System Architecture

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Authentication:** Supabase Auth with RLS policies
- **Real-time:** Supabase Realtime for live updates

## Support

For technical issues or questions, contact the system administrator.
