/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mySidebar: "#F46B5D",
        myBackground: "#FFEDE7",
        myHeader: "#55A1A4",
        zyncureOrange: "#FB8F67",
        zyncureBlack: "#333333",
        zyncureLightPink: "#FEDED2",
        zyncureSearchBar:"#FFEDE7",
        // PROFILE PAGE
        profileText: "#F15629",
        profileBg: "#FEDED2",
        mainBg: "#FFEDE7",
        profileHeader: "#55A1A4",
      },
    },
  },
  plugins: [],
}

