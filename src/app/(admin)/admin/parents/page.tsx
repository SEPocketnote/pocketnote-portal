import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import ParentsSearch from './ParentsSearch'

export default async function ParentsPage() {
  const supabase = await createClient()

  const { data: parents } = await supabase
    .from('parents')
    .select(`
      id, name, email, phone, created_at,
      students ( id ),
      bookings ( id, status )
    `)
    .order('name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Parents</h1>
        <Link
          href="/admin/parents/new"
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <UserPlus className="w-4 h-4" />
          New parent
        </Link>
      </div>

      {!parents?.length ? (
        <div className="bg-white rounded-2xl shadow-md p-10 text-center">
          <p className="font-medium mb-1">No parents yet</p>
          <p className="text-sm text-muted-foreground">Parents are created when you create an enrolment.</p>
        </div>
      ) : (
        <ParentsSearch parents={parents as any} />
      )}
    </div>
  )
}
