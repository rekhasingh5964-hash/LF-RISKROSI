import { getSessionUser } from '@/lib/auth'
import { errorResponse, json } from '@/lib/http'
import { AI_ENGINE_ROLES } from '@/lib/ai-engines'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  return json(Object.entries(AI_ENGINE_ROLES).map(([name, purpose]) => ({
    name,
    purpose,
    status: name === 'LF_SECURITY_AI' ? 'DETERMINISTIC_CORE' : name === 'LUMAVEGA' ? 'SIMULATION_CORE' : 'INTERFACE_ONLY',
    inferenceConfigured: false,
  })))
}
