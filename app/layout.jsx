import './globals.css'

export const metadata = {
  title: 'LumeraVega SMB IN BOX | Security & Compliance Operations',
  description: 'Security, privacy, and risk operations for Indian MSMEs, with LF-RISKROSI risk and audit foundations.',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
