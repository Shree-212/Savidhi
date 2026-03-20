/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        primary: {
          50:  '#FFF8F0',
          100: '#FEEDD8',
          200: '#FDD8AC',
          300: '#F4A261',
          400: '#E8813A',
          500: '#E8813A',
          600: '#D06B25',
          700: '#B5581A',
          800: '#8C4314',
          900: '#6B330F',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          warm: '#FFF8F0',
          muted: '#F9F5F0',
        },
        text: {
          primary: '#2D1B0E',
          secondary: '#6B7280',
          muted: '#8E8E8E',
        },
        border: {
          DEFAULT: '#E5E7EB',
          light: '#F3F4F6',
        },
        status: {
          success: '#4CAF50',
          error: '#E53935',
          processing: '#1565C0',
          warning: '#FF9800',
        },
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
    },
  },
  plugins: [],
};
