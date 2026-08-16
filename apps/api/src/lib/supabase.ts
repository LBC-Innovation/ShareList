import { createClient } from '@supabase/supabase-js'

const url = process.env['SUPABASE_URL']
const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

if (!url || !serviceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
}

// Used for JWT validation only (auth.getUser, auth.admin.*).
// Must NOT have accessToken set — supabase-js disables the auth namespace when
// accessToken is present, making auth.getUser() throw at runtime.
export const supabaseAuth = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Used for all PostgREST operations (from(), rpc()).
// accessToken pins the Authorization header to the service role key on every
// request, bypassing auth.getSession(). Without this, any in-memory session
// set by auth client methods (e.g. signInWithOtp in the magic-link route)
// would cause PostgREST to receive a user JWT, making Postgres execute as
// `authenticated` and triggering RLS policies.
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  accessToken: async () => serviceKey,
})
