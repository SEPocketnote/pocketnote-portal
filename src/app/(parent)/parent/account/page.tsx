import { createClient } from '@/lib/supabase/server'
import AccountForm from './AccountForm'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: parent } = await supabase
    .from('parents')
    .select('name, email, phone')
    .eq('user_id', user!.id)
    .single()

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Account</h1>
      <AccountForm
        name={parent?.name ?? ''}
        email={parent?.email ?? user?.email ?? ''}
        phone={parent?.phone ?? ''}
      />
    </div>
  )
}
