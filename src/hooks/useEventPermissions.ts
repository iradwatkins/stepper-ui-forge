import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export interface EventPermission {
  event_id: string
  event_title: string
  event_date: string
  can_sell_tickets: boolean
  can_work_events: boolean
  is_organizer: boolean
  commission_rate?: number
  team_member_status?: 'active' | 'disabled'
}

export interface EventPermissionSummary {
  canSellTickets: boolean
  canWorkEvents: boolean
  sellerEvents: EventPermission[]
  teamMemberEvents: EventPermission[]
  organizedEvents: EventPermission[]
  loading: boolean
  error: string | null
}

export const useEventPermissions = () => {
  const { user } = useAuth()
  const [permissionSummary, setPermissionSummary] = useState<EventPermissionSummary>({
    canSellTickets: false,
    canWorkEvents: false,
    sellerEvents: [],
    teamMemberEvents: [],
    organizedEvents: [],
    loading: true,
    error: null
  })

  const loadEventPermissions = useCallback(async () => {
    if (!user) return

    setPermissionSummary(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Get events where user is organizer
      const { data: organizedEvents, error: organizedError } = await supabase
        .from('events')
        .select('id, title, date')
        .eq('owner_id', user.id)

      if (organizedError) throw organizedError

      // Get events where user can sell tickets (via seller assignments - single event limitation)
      const { data: sellerAssignments, error: sellerError } = await supabase
        .from('seller_event_assignments')
        .select(`
          commission_rate,
          status,
          event:events!event_id(id, title, date)
        `)
        .eq('seller_id', user.id)
        .eq('status', 'active')

      if (sellerError) throw sellerError

      // Get events where user is a team member
      const { data: teamEvents, error: teamError } = await supabase
        .from('team_members')
        .select(`
          status,
          event:events!event_id(id, title, date)
        `)
        .eq('user_id', user.id)

      if (teamError) throw teamError

      // Process organized events
      const processedOrganizedEvents: EventPermission[] = organizedEvents?.map(event => ({
        event_id: event.id,
        event_title: event.title,
        event_date: event.date,
        can_sell_tickets: false,
        can_work_events: false,
        is_organizer: true
      })) || []

      // Process seller events (single event assignment)
      const processedSellerEvents: EventPermission[] = sellerAssignments?.map(assignment => ({
        event_id: assignment.event.id,
        event_title: assignment.event.title,
        event_date: assignment.event.date,
        can_sell_tickets: true,
        can_work_events: false,
        is_organizer: false,
        commission_rate: assignment.commission_rate
      })) || []

      // Process team member events
      const processedTeamEvents: EventPermission[] = teamEvents?.map(teamMember => ({
        event_id: teamMember.event.id,
        event_title: teamMember.event.title,
        event_date: teamMember.event.date,
        can_sell_tickets: false,
        can_work_events: teamMember.status === 'active',
        is_organizer: false,
        team_member_status: teamMember.status
      })).filter(event => event.can_work_events) || []

      const canSellTickets = processedSellerEvents.length > 0
      const canWorkEvents = processedTeamEvents.length > 0

      setPermissionSummary({
        canSellTickets,
        canWorkEvents,
        sellerEvents: processedSellerEvents,
        teamMemberEvents: processedTeamEvents,
        organizedEvents: processedOrganizedEvents,
        loading: false,
        error: null
      })

    } catch (error) {
      console.error('Error loading event permissions:', error)
      setPermissionSummary(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load event permissions'
      }))
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadEventPermissions()
    } else {
      setPermissionSummary({
        canSellTickets: false,
        canWorkEvents: false,
        sellerEvents: [],
        teamMemberEvents: [],
        organizedEvents: [],
        loading: false,
        error: null
      })
    }
  }, [user, loadEventPermissions])

  const refreshPermissions = useCallback(() => {
    if (user) {
      loadEventPermissions()
    }
  }, [user, loadEventPermissions])

  const getEventPermission = useCallback((eventId: string): EventPermission | null => {
    const allEvents = [
      ...permissionSummary.sellerEvents,
      ...permissionSummary.teamMemberEvents,
      ...permissionSummary.organizedEvents
    ]
    return allEvents.find(event => event.event_id === eventId) || null
  }, [permissionSummary])

  const canAccessSellerFeatures = useCallback((eventId?: string): boolean => {
    if (!eventId) return permissionSummary.canSellTickets
    return permissionSummary.sellerEvents.some(event => event.event_id === eventId)
  }, [permissionSummary])

  const canAccessTeamFeatures = useCallback((eventId?: string): boolean => {
    if (!eventId) return permissionSummary.canWorkEvents
    return permissionSummary.teamMemberEvents.some(event => event.event_id === eventId)
  }, [permissionSummary])

  return {
    ...permissionSummary,
    refreshPermissions,
    getEventPermission,
    canAccessSellerFeatures,
    canAccessTeamFeatures
  }
}