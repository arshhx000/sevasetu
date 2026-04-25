/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      colors: {
        te: {
          bg: '#f6f5f2',
          panel: '#ffffff',
          ink: '#151515',
          soft: '#6b6b6b',
          accent: '#ff6b2c',
          mute: '#e8e6e2'
        }
      },
      borderRadius: {
        soft: '20px',
        xl2: '24px'
      },
      boxShadow: {
        mac: '0 18px 45px rgba(0,0,0,0.08), 0 3px 10px rgba(0,0,0,0.05)'
      }
    }
  },
  plugins: []
};
