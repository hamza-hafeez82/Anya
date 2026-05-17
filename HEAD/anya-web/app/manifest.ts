import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ANYA OS',
    short_name: 'ANYA',
    description: 'Anya Operating System Web Interface',
    start_url: '/',
    display: 'fullscreen',
    orientation: 'landscape',
    background_color: '#080810',
    theme_color: '#080810',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
