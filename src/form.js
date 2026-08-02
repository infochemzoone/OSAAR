const FORM_EMAIL = 'info.osaar@gmail.com'

const form = document.getElementById('intake-form')
const statusEl = document.getElementById('form-status')
const submitBtn = document.getElementById('form-submit')

if (form) {
  if (FORM_EMAIL && FORM_EMAIL !== 'YOUR_EMAIL_HERE') {
    form.action = `https://formsubmit.co/ajax/${FORM_EMAIL}`
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()

    if (!FORM_EMAIL || FORM_EMAIL === 'YOUR_EMAIL_HERE') {
      statusEl.hidden = false
      statusEl.className = 'form-status form-status--error'
      statusEl.textContent =
        'Add your email in src/form.js (FORM_EMAIL) so enquiries can reach you.'
      return
    }

    submitBtn.disabled = true
    submitBtn.textContent = 'Sending…'
    statusEl.hidden = true

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) throw new Error('Request failed')

      window.location.href = '/thank-you.html'
    } catch {
      statusEl.hidden = false
      statusEl.className = 'form-status form-status--error'
      statusEl.textContent = 'Something went wrong. Please try again in a moment.'
      submitBtn.disabled = false
      submitBtn.textContent = 'Send Enquiry'
    }
  })
}
