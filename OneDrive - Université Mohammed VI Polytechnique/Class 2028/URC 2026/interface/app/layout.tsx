import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { TeamsProvider } from '@/context/TeamsContext'
import { RacesProvider } from '@/context/RacesContext'
import { ScoresProvider } from '@/context/ScoresContext'
import { ParticleBackground } from '@/components/ParticleBackground'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'URC Robotics Championship',
  description: 'Universal Robotics Competition - Matrix Protocol',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
          
          @keyframes glitch {
            0%, 100% { text-shadow: 2px 2px 0 #00e5ff; }
            25% { text-shadow: -2px -2px 0 #00e5ff; }
            50% { text-shadow: 2px -2px 0 #00e5ff; }
            75% { text-shadow: -2px 2px 0 #00e5ff; }
          }
          
          @keyframes scanlines {
            0% { transform: translateY(0); }
            100% { transform: translateY(10px); }
          }
          
          .glitch-text {
            animation: glitch 0.3s infinite;
          }
          
          .scanlines {
            animation: scanlines 8s linear infinite;
            pointer-events: none;
          }
        `}</style>
      </head>
      <body className={`font-sans antialiased overflow-x-hidden`} style={{ background: '#0a0e27' }}>
        <ParticleBackground />
        <TeamsProvider>
          <RacesProvider>
            <ScoresProvider>
              {children}
            </ScoresProvider>
          </RacesProvider>
        </TeamsProvider>
        <Analytics />
      </body>
    </html>
  )
}
