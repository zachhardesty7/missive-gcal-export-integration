/* global Missive chrono */
// eslint-disable-next-line import/no-unresolved
import { html, render } from 'https://unpkg.com/lit-html?module'

const buildLink = (title = '', date = '', details = '', location = '') => {
  const link = new URLSearchParams()
  const dateFormatted = (new Date(date)).toISOString().replace(/-|:|\.\d\d\d/g, '')

  link.append('action', 'TEMPLATE')
  link.append('text', title)
  link.append('dates', `${dateFormatted}/${dateFormatted}`)
  link.append('details', details)
  link.append('location', location)
  link.append('trp', 'false')
  link.append('sprop', '')
  link.append('sprop', 'name:')

  return `https://calendar.google.com/event?${link.toString()}`
}

const sidebar = (matches, title, details, location) => html`
  <div class="text-large align-center padding-top-large">detected events</div>
  ${matches.map((match) => {
    const date = match.start.date()
    const link = buildLink(title, date, details, location)
    return item([match.text, date], link)
  })}
`

const item = (rows = [], link) => html`
  <div class="section padding-large">
    ${rows.map(row => html`<p class="row">${row}</p>`)}
    <a target="_blank" href=${link} class="button">Export</a>
  </div>
`

document.querySelector('#reload')
  .addEventListener('click', () => Missive.reload())

Missive.on('change:conversations', (ids) => {
  Missive.fetchConversations(ids, ['latest_message', 'link'])
    .then((conversations) => {
      const message = conversations[0].latest_message
      const reference = conversations[0].link
      if (message && message.from_field && conversations.length === 1) {
        const template = document.createElement('template')
        template.innerHTML = message.body
        const nodes = template.content.firstChild
        const text = nodes.innerText.replace(/\s+/gm, ' ').trim()

        const raw = chrono.parse(text)
        const results = document.querySelector('#results')

        raw.length !== 0
          ? render(sidebar(raw, message.subject, `${text}\n${reference}`), results)
          : render(html`<div class="text-large align-center padding-top-large">no matches</div>`, results)
      }

      return message
    }).catch(e => Missive.alert({ title: 'error', message: 'error message', note: e.toString() }))
})
