import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bwxt: {
          navy:             '#17153A',
          'navy-dark':      '#0E0C27',
          'navy-light':     '#EEEDF7',
          crimson:          '#9E3039',
          'crimson-dark':   '#7A2430',
          'crimson-light':  '#F5E6E8',
          bg:               '#F4F4F7',
          border:           '#E0DFF0',
          'text-primary':   '#17153A',
          'text-secondary': '#5A5880',
          'text-muted':     '#9896B0',
          success:          '#1A6B4A',
          warning:          '#92600A',
          danger:           '#9E3039',
        },
        brand: {
          navy:  '#17153A',
          blue:  '#17153A',
          gold:  '#9E3039',
          light: '#F4F4F7',
        },
      },
      fontFamily: {
        sans:     ['var(--font-inter)', 'system-ui', 'sans-serif'],
        playfair: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 4px rgba(23,21,58,0.06)',
      },
    },
  },
  plugins: [],
}

export default config
