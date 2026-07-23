import { createClient } from '@/lib/supabase/server'
import AccountForm from './AccountForm'
import StudentManager from '@/components/StudentManager'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: parent } = await supabase
    .from('parents')
    .select('id, name, email, phone, students(id, name, year_level, subjects)')
    .eq('user_id', user!.id)
    .single()

  const students = (parent?.students ?? []) as Array<{
    id: string; name: string; year_level: string | null; subjects: string[]
  }>

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-semibold">Account</h1>

      <AccountForm
        name={parent?.name ?? ''}
        email={parent?.email ?? user?.email ?? ''}
        phone={parent?.phone ?? ''}
      />

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Students
        </h2>
        <StudentManager
          students={students}
          createUrl="/api/parent/students"
          updateUrlBase="/api/parent/students"
        />
      </section>
    </div>
  )
}
