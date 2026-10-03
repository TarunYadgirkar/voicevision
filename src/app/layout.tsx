import type { Metadata } from 'next';
import { Bricolage_Grotesque, Public_Sans } from 'next/font/google';
import './globals.css';
import { FilterOverlay } from '@/components/FilterOverlay';
import { BOOT_SCRIPT } from '@/lib/persistence';

// Public Sans is the US Web Design System text face, drawn against federal accessibility
// requirements: open apertures, tall x-height, unambiguous 1/l/I and 0/O. It is the right
// face for a product whose whole claim is that people can read the screen.
const publicSans = Public_Sans({
  variable: '--font-public-sans',
  subsets: ['latin'],
  display: 'swap',
});

// Bricolage Grotesque carries an optical-size and a width axis, so the display cut at
// hero size is a genuinely different drawing rather than Public Sans set large.
const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  display: 'swap',
  axes: ['opsz', 'wdth'],
});

export const metadata: Metadata = {
  title: 'VoiceVision',
  description:
    'Say how you see and the screen adapts. VoiceVision offers adjustable text, spacing, colour, contrast and motion for reading comfort.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${publicSans.variable} ${bricolage.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-page text-text">
        <FilterOverlay />
        {children}
      </body>
    </html>
  );
}
