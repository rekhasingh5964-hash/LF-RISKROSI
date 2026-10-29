import { NextResponse } from 'next/server'

export function middleware(request) {
  const requestId = crypto.randomUUID()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)
  requestHeaders.set('x-request-started-at', String(Date.now()))
  requestHeaders.set('x-request-method', request.method)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('x-request-id', requestId)
  return response
}

export const config = {
  matcher: '/api/:path*',
}
