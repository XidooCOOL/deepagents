import { defineConfig, presetUno, presetIcons, presetWebFonts } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      cdn: 'https://esm.sh/',
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
      },
    }),
    presetWebFonts({
      fonts: {
        sans: 'Inter:400,500,600,700',
        mono: 'JetBrains Mono:400,500',
      },
    }),
  ],
  theme: {
    colors: {
      primary: {
        DEFAULT: '#409eff',
        50: '#ecf5ff',
        100: '#d9ecff',
        200: '#b3d8ff',
        300: '#80bfff',
        400: '#4d91ff',
        500: '#409eff',
        600: '#337ecc',
        700: '#2a5f99',
        800: '#1f4066',
        900: '#162233',
      },
      success: {
        DEFAULT: '#67c23a',
        light: '#e1f3d8',
      },
      warning: {
        DEFAULT: '#e6a23c',
        light: '#fdf6ec',
      },
      danger: {
        DEFAULT: '#f56c6c',
        light: '#fef0f0',
      },
      info: {
        DEFAULT: '#909399',
        light: '#f4f4f5',
      },
    },
  },
  shortcuts: {
    'btn': 'px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer',
    'btn-primary': 'btn bg-primary text-white hover:bg-primary-600 active:bg-primary-700',
    'btn-secondary': 'btn bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300',
    'btn-danger': 'btn bg-danger text-white hover:bg-red-600',
    'card': 'bg-white rounded-xl shadow-sm border border-gray-100',
    'card-hover': 'card hover:shadow-md transition-shadow duration-200',
    'page-container': 'p-6',
    'flex-center': 'flex items-center justify-center',
    'flex-between': 'flex items-center justify-between',
    'text-primary': 'text-gray-800',
    'text-secondary': 'text-gray-500',
    'text-sm': 'text-sm',
    'text-xs': 'text-xs',
    'gap-2': 'gap-2',
    'gap-4': 'gap-4',
    'grid-2': 'grid grid-cols-2 gap-4',
    'grid-3': 'grid grid-cols-3 gap-4',
    'grid-4': 'grid grid-cols-4 gap-4',
  },
  rules: [
    [/^animate-delay-(\d+)$/, ([, d]) => ({ 'animation-delay': `${d}ms` })],
    ['transition-base', { transition: 'all 0.2s ease-in-out' }],
  ],
})
