/* global Missive chrono */
// eslint-disable-next-line import/no-unresolved
import { html, render } from 'https://unpkg.com/lit-html?module'

const blacklist = [
  '1-800'
]

const formatAsGCalDate = (str = '') => (
  (str &&
    (new Date(str)) &&
    (new Date(str)).toISOString() &&
    (new Date(str)).toISOString().replace(/-|:|\.\d\d\d/g, '')
  ) || ''
)

const buildLink = (title = '', start = '', end = '', details = '', location = '') => {
  const link = new URLSearchParams()
  const startFormatted = formatAsGCalDate(start)
  const endFormatted = formatAsGCalDate(end)

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

const item = (orig, start = '', end = '', link) => html`
  <div class="card shadow padding-xlarge">
    <h3 class="title">${orig}</h3>
    <div class="margin-top-xlarge margin-bottom-xlarge">
      <p class="text">${start}</p>
      ${end && html`<p class="text">${end}</p>`}
    </div>
    <a target="_blank" href=${link} class="button">Export</a>
  </div>
`

const sidebar = (matches, title, details, location) => html`
  <h2 class="text-xlarge align-center padding-top-medium">detected events</h2>
  ${matches.map((match) => {
    const start = match.start.date()
    const end = match.end ? match.end.date() : ''
    const link = buildLink(title, start, end, details, location)

    return item(match.text, start, end, link)
  })}
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
          const body = nodes.innerText.replace(/\s+/gm, ' ').trim()

          const matches = chrono.parse(body).filter(match => !blacklist.includes(match.text))
          const results = document.querySelector('#results')

          matches.length !== 0
            ? render(sidebar(matches, message.subject, `${reference}\n${body}`), results)
            : render(html`<p class="text-large align-center padding-top-large">no matches</p>`, results)
        }
      }
      return null
    }).catch((e) => {
      console.error(`GCalError\n${e.stack}`)
      Missive.alert({ title: 'error in GCal script', message: e.toString() })
    })
})
