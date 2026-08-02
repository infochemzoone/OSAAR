import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        offerings: resolve(__dirname, 'offerings.html'),
        testimonials: resolve(__dirname, 'testimonials.html'),
        resources: resolve(__dirname, 'resources.html'),
        newsletter: resolve(__dirname, 'newsletter.html'),
        contact: resolve(__dirname, 'contact.html'),
        start: resolve(__dirname, 'start.html'),
        wellnessLibrary: resolve(__dirname, 'wellness-library.html'),
        faqs: resolve(__dirname, 'faqs.html'),
        selfAssessment: resolve(__dirname, 'self-assessment.html'),
        guidedMeditation: resolve(__dirname, 'guided-meditation.html'),
        breathing: resolve(__dirname, 'breathing.html'),
        healingJourney: resolve(__dirname, 'healing-journey.html'),
        workshops: resolve(__dirname, 'workshops.html'),
        emergency: resolve(__dirname, 'emergency.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
        cookies: resolve(__dirname, 'cookies.html'),
        refund: resolve(__dirname, 'refund.html'),
        cancellation: resolve(__dirname, 'cancellation.html'),
        accessibility: resolve(__dirname, 'accessibility.html'),
        thankYou: resolve(__dirname, 'thank-you.html'),
      },
    },
  },
})
