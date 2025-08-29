module.exports = {
  content: ["./src/**/*.{html,ts,scss}"],
  theme: { extend: {} },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/line-clamp'),
  ],
  darkMode: 'class',
};
