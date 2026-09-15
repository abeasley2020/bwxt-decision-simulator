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
          // Interactive control boundary. WCAG 2.2 AA 1.4.11 needs 3:1 against
          // adjacent color; bwxt.border is 1.31:1 and is for decorative card
          // edges only. Use border-bwxt-border-input on inputs, textareas and
          // any other control whose shape carries meaning.
          'border-input':   '#84829F',
          'text-primary':   '#17153A',
          'text-secondary': '#5A5880',
          // 4.5:1 minimum on white, bwxt.bg, bwxt.navy-light and gray-50.
          'text-muted':     '#63618A',
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
