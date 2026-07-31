'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { Room, Staff, CompletedSession } from '@/lib/database.types'

function toRoom(row: { id: string; name: string }): Room {
  return { id: row.id, name: row.name }
}

function toStaff(row: { id: string; name: string; rate: number }): Staff {
  return { id: row.id, name: row.name, rate: row.rate }
}

function toCompletedSession(row: {
  id: string; room_name: string; room_id: string; staff_id: string;
  staff_name: string; start_time: string; end_time: string;
  hours: number; amount: number;
}): CompletedSession {
  return {
    id: row.id,
    roomName: row.room_name,
    roomId: row.room_id,
    staffId: row.staff_id,
    staffName: row.staff_name,
    start: new Date(row.start_time).getTime(),
    end: new Date(row.end_time).getTime(),
    hours: row.hours,
    amount: row.amount,
  }
}

export function useData() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [rooms, setRooms] = useState<Room[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [completedSessions, setCompletedSessions] = useState<CompletedSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      try {
        const [roomsRes, staffRes, completedRes] = await Promise.all([
          supabase.from('rooms').select('*'),
          supabase.from('staff').select('*'),
          supabase.from('completed_sessions').select('*').order('created_at', { ascending: false }),
        ])

        if (roomsRes.data) setRooms(roomsRes.data.map(toRoom))
        if (staffRes.data) setStaff(staffRes.data.map(toStaff))
        if (completedRes.data) setCompletedSessions(completedRes.data.map(toCompletedSession))
      } catch (e) {
        console.error('Failed to fetch data:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [supabase])

  const addRoom = useCallback(async (name: string) => {
    const { data, error } = await supabase
      .from('rooms')
      .insert({ name })
      .select()
      .single()
    if (error || !data) return false
    setRooms(prev => [...prev, toRoom(data)])
    return true
  }, [supabase])

  const updateRoom = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from('rooms').update({ name }).eq('id', id)
    if (error) return false
    setRooms(prev => prev.map(r => r.id === id ? { ...r, name } : r))
    return true
  }, [supabase])

  const deleteRoom = useCallback(async (id: string) => {
    const { error } = await supabase.from('rooms').delete().eq('id', id)
    if (error) return false
    setRooms(prev => prev.filter(r => r.id !== id))
    return true
  }, [supabase])

  const addStaff = useCallback(async (name: string, rate: number) => {
    const { data, error } = await supabase
      .from('staff')
      .insert({ name, rate })
      .select()
      .single()
    if (error || !data) return false
    setStaff(prev => [...prev, toStaff(data)])
    return true
  }, [supabase])

  const updateStaff = useCallback(async (id: string, name: string, rate: number) => {
    const { error } = await supabase.from('staff').update({ name, rate }).eq('id', id)
    if (error) return false
    setStaff(prev => prev.map(s => s.id === id ? { ...s, name, rate } : s))
    return true
  }, [supabase])

  const deleteStaff = useCallback(async (id: string) => {
    const { error } = await supabase.from('staff').delete().eq('id', id)
    if (error) return false
    setStaff(prev => prev.filter(s => s.id !== id))
    return true
  }, [supabase])

  const quickCheckin = useCallback(async (
    roomId: string,
    staffId: string,
    roomName: string,
    staffName: string,
    start: number,
    end: number,
    hours: number,
    amount: number,
  ): Promise<CompletedSession | null> => {
    const { data, error } = await supabase
      .from('completed_sessions')
      .insert({
        room_id: roomId,
        staff_id: staffId,
        room_name: roomName,
        staff_name: staffName,
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        hours,
        amount: Math.round(amount),
      })
      .select()
      .single()

    if (error || !data) return null
    const session = toCompletedSession(data)
    setCompletedSessions(prev => [session, ...prev])
    return session
  }, [supabase])

  const updateSession = useCallback(async (
    id: string,
    data: {
      roomId?: string
      staffId?: string
      roomName?: string
      staffName?: string
      start?: number
      end?: number
      hours?: number
      amount?: number
    }
  ) => {
    const updateData: Record<string, unknown> = {}
    if (data.roomId !== undefined) updateData.room_id = data.roomId
    if (data.staffId !== undefined) updateData.staff_id = data.staffId
    if (data.roomName !== undefined) updateData.room_name = data.roomName
    if (data.staffName !== undefined) updateData.staff_name = data.staffName
    if (data.start !== undefined) updateData.start_time = new Date(data.start).toISOString()
    if (data.end !== undefined) updateData.end_time = new Date(data.end).toISOString()
    if (data.hours !== undefined) updateData.hours = data.hours
    if (data.amount !== undefined) updateData.amount = Math.round(data.amount)

    const { error } = await supabase
      .from('completed_sessions')
      .update(updateData)
      .eq('id', id)

    if (error) return false
    setCompletedSessions(prev => prev.map(s => s.id === id ? { ...s, ...data } as CompletedSession : s))
    return true
  }, [supabase])

  const deleteSession = useCallback(async (id: string) => {
    const { error } = await supabase.from('completed_sessions').delete().eq('id', id)
    if (error) return false
    setCompletedSessions(prev => prev.filter(s => s.id !== id))
    return true
  }, [supabase])

  return {
    rooms,
    staff,
    completedSessions,
    loading,
    addRoom,
    updateRoom,
    deleteRoom,
    addStaff,
    updateStaff,
    deleteStaff,
    quickCheckin,
    updateSession,
    deleteSession,
  }
}
