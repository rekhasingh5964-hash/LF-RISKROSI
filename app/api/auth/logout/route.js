import { cookies } from 'next/headers'
import { SESSION_COOKIE, hashSessionToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { errorResponse, hasSameOrigin, json } from '@/lib/http'

export const runtime = 'nodejs'

export async function POST(request) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } })
  const response = await json({ signedOut: true })
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    path: '/', maxAge: 0,
  })
  return response
}
