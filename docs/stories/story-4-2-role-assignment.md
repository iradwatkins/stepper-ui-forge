# Story 4.2: Role Assignment

## User Story

As an event organizer,
I want to assign specific roles to team members,
so that they have appropriate permissions for their responsibilities.

## Acceptance Criteria

- [x] AC1: Role selection available during team member invitation
- [x] AC2: Support for 5 predefined roles: Event Manager, Check-in Staff, Customer Service, Security, Vendor Coordinator
- [x] AC3: Each role has specific permission set defined in database
- [x] AC4: Permission validation enforced across all system components
- [x] AC5: Role changes require event owner or manager permissions
- [x] AC6: Team member dashboard shows role-appropriate functions only

## Integration Verification

- [x] IV1: Permission system integrates with existing authentication
- [x] IV2: Role permissions apply to all API endpoints
- [x] IV3: UI components respect role-based access control

## Technical Implementation Notes

### Database Schema
- `team_role` enum with 5 predefined roles
- `get_team_member_permissions()` function returns role permissions
- `user_has_event_permission()` function for permission checking

### Role Permissions Matrix
```
                    Event  Check-in  Customer  Security  Vendor
                   Manager   Staff   Service           Coordinator
view_event           ✓        ✓        ✓        ✓        ✓
edit_event           ✓        ✗        ✗        ✗        ✗
manage_team          ✓        ✗        ✗        ✗        ✗
view_analytics       ✓        ✗        ✗        ✓        ✗
check_in_tickets     ✓        ✓        ✓        ✓        ✗
view_attendees       ✓        ✓        ✓        ✓        ✗
manage_seating       ✓        ✗        ✗        ✗        ✓
handle_refunds       ✓        ✗        ✓        ✗        ✗
```

### Components Implemented
- `PermissionGuard` component for conditional rendering
- `useTeamPermissions` hook for permission checking
- Role selection in `TeamMemberInvite`

### API Integration
- Permission validation middleware
- Role-based endpoint access control
- Automated permission checking functions

## Dev Agent Record

### Tasks Completed
- [x] Database role enum and permission functions
- [x] PermissionGuard component implementation
- [x] useTeamPermissions hook
- [x] Role selection UI in invitation flow
- [x] API permission validation
- [x] Role-based dashboard filtering

### Debug Log
| Task | File | Change | Reverted? |
|------|------|---------|----------|
| N/A | N/A | N/A | N/A |

### Completion Notes
Complete role-based permission system implemented with database functions, React components, and API validation.

### Change Log
No requirement changes needed.

### File List
- `supabase/migrations/005_epic_4_team_management_enhancements.sql`
- `src/components/PermissionGuard.tsx`
- `src/lib/hooks/useTeamPermissions.ts`
- `src/components/dashboard/TeamMemberInvite.tsx`

## Status: Review
Story complete and ready for final review.