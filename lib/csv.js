function safeCsvCell(value) {
  const text = value === null || value === undefined
    ? ''
    : typeof value === 'string'
      ? value
      : String(value)
  const neutralized = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text
  return `"${neutralized.replaceAll('"', '""')}"`
}

export function serializeCsv(headers, rows) {
  return [
    headers.map(safeCsvCell).join(','),
    ...rows.map((row) => headers.map((header) => safeCsvCell(row[header])).join(',')),
  ].join('\r\n')
}
