const MAX_JSON_BODY_BYTES = 128 * 1024

async function readBoundedText(request) {
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_JSON_BODY_BYTES) {
      await reader.cancel()
      throw new Error('Request body is too large')
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

export async function readJsonBody(request, { optional = false } = {}) {
  const declaredLength = request.headers.get('content-length')
  if (declaredLength !== null) {
    const length = Number(declaredLength)
    if (!Number.isSafeInteger(length) || length < 0) throw new Error('Content-Length is invalid')
    if (length > MAX_JSON_BODY_BYTES) throw new Error('Request body is too large')
  }

  let text
  try {
    text = await readBoundedText(request)
  } catch (error) {
    if (error.message === 'Request body is too large') throw error
    throw new Error('Request body must be valid JSON')
  }
  if (!text.trim() && optional) return {}
  try {
    const body = JSON.parse(text)
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error()
    return body
  } catch {
    throw new Error('Request body must be a JSON object')
  }
}
