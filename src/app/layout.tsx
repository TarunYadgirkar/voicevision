import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from 'next/font/google';
import './globals.css';
import { FilterOverlay } from '@/components/FilterOverlay';
import { BOOT_SCRIPT } from '@/lib/persistence';

// The Braille Institute drew Atkinson Hyperlegible for low-vision readers: every letter is
// distinguishable from its lookalikes (I l 1, O 0, b d). That is the product's whole claim.
const atkinson = Atkinson_Hyperlegible_Next({
  variable: '--font-atkinson',
  subsets: ['latin'],
  display: 'swap',
  adjustFontFallback: false,
  fallback: ['system-ui', 'sans-serif'],
});

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  display: 'swap',
  axes: ['opsz', 'wdth'],
});

export const metadata: Metadata = {
  title: 'VoiceVision',
  description:
    'Describe what is hard to see and the page adapts: larger text, more spacing, less glare, steadier motion and optional colour adjustments.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eceef0' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1013' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${atkinson.variable} ${bricolage.variable} h-full antialiased`}>
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
