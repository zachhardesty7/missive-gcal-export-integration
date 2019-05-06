/* global Missive chrono */
// eslint-disable-next-line import/no-unresolved
import { html, render } from 'https://unpkg.com/lit-html?module'

const buildLink = (title = '', start = '', end = '', details = '', location = '') => {
  const link = new URLSearchParams()
  const startFormatted = (new Date(start)).toISOString().replace(/-|:|\.\d\d\d/g, '')
  const endFormatted = (new Date(end)).toISOString().replace(/-|:|\.\d\d\d/g, '')

  link.append('action', 'TEMPLATE')
  link.append('text', title)
  link.append('dates', `${startFormatted}/${endFormatted}`)
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
    const start = match.start.date()
    const end = match.end.date()
    const link = buildLink(title, start, end, details, location)

    return item([match.text, start], link)
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
      if (conversations[0]) {
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
      }
      return null
    }).catch(e => Missive.alert({ title: 'error in GCal script', message: e.toString() }))
})
