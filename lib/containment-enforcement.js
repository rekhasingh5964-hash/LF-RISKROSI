export const ENFORCEMENT_UNAVAILABLE = 'ENFORCEMENT_UNAVAILABLE'

export function isEnforcementUnavailableAcknowledgment(body) {
  return body !== null &&
    typeof body === 'object' &&
    Object.keys(body).length === 2 &&
    body.status === 'FAILED' &&
    body.result === ENFORCEMENT_UNAVAILABLE
}
