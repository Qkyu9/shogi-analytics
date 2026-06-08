import { auth, currentUser } from '@clerk/nextjs/server'
import { createServiceRoleClient } from './service-role'

/**
 * Clerkのユーザー情報をSupabaseのusersテーブルに同期する関数
 * Server ActionsやServer Component、Route Handlerから呼び出す
 */
export async function ensureSupabaseUser() {
  const { userId } = await auth()
  if (!userId) return null

  const user = await currentUser()
  if (!user) return null

  const supabase = createServiceRoleClient()
  
  // Upsert user data to Supabase
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        clerk_user_id: userId,
        email: user.emailAddresses[0].emailAddress,
        full_name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || null,
        // 必要に応じて他のフィールドも同期
      },
      { onConflict: 'clerk_user_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error syncing user to Supabase:', error)
    throw error
  }
  
  return data
}

export async function getSupabaseUserByClerkId() {
  const { userId } = await auth()
  if (!userId) return null

  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  return data ?? null
}
