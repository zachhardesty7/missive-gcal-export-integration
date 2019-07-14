/* global Missive chrono */
// eslint-disable-next-line import/no-unresolved
import { html, render } from 'https://unpkg.com/lit-html?module'

/**
 * strings to ignore when unintentionally picked up by chrono
 */
const blacklist = [
	'1-800',
]

/**
 * simply attempts to convert to a date string supported by
 * Google Calendar with empty string fallback
 *
 * @param {string} str - date-like arbitrary string
 * @returns {string} GCal supported date string or empty string
 */
const formatAsGCalDate = (str = '') => console.log(str) || (
	(
		str &&
    (new Date(str)) &&
    (new Date(str)).toISOString() &&
    (new Date(str)).toISOString().replace(/-|:|\.\d{3}/g, '')
	) || ''
)

/**
 * takes info about events and encodes it into a url that opens Google
 * Calendar and automatically creates and fills in event info provided
 *
 * @param {string} title - as shown on GCal event
 * @param {string} start - GCal date-like val of event start
 * @param {string} end - GCal date-like val of event end
 * @param {string} details - arbitrary info to include in event body
 * @param {string} location - physical location of event
 * @returns {string} encoded URL of endpoint and query args to target
 */
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

/**
 * template for each card display of info from parsed date/time
 * from email body using `lit-html`
 *
 * @param {string} orig - original date-like string
 * @param {string} start - completely parsed date-like event start
 * @param {string} end - completely parsed date-like event end
 * @param {string} link - Google Calendar auto-create event link for button
 * @returns {TemplateStringsArray} template to be rendered into html of detected info
 */
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

/**
 * template for container of cards with info from parsed date/time
 * from email body using `lit-html`
 *
 * @param {Array} matches - result array of calling chrono.parse
 * @param {string} title - as shown on GCal event
 * @param {string} details - arbitrary info to include in event body
 * @param {string} location - physical location of event
 * @returns {TemplateStringsArray} rendered side-bar
 */
const sidebar = (matches, title, details, location) => html`
  <h2 class="text-xlarge align-center padding-top-medium">detected events</h2>
  ${matches.map((match) => {
		console.log(match.start)

		const start = match.start.date()
		const end = match.end ? match.end.date() : ''
		// console.log(`start: ${match.start} | end: ${match.end}`)
		// start === 'Invalid Date'

		// start !== 'Invalid Date' || end === 'Invalid Date'
		const link = buildLink(title, start, end, details, location)

		return item(match.text, start, end, link)
	})}
`

document.querySelector('#reload')
	.addEventListener('click', () => Missive.reload())

/**
 * triggers on every time email is loaded and renders matches
 * if any are found
 */
Missive.on('change:conversations', (ids) => {
	Missive.fetchConversations(ids, ['latest_message', 'link'])
		.then((conversations) => {
			if (conversations[0]) {
				const message = conversations[0].latest_message
				const reference = conversations[0].link
				if (message && message.from_field && conversations.length === 1) {
					// extract raw text from stringified html provided
					const template = document.createElement('template')
					template.innerHTML = message.body
					const nodes = template.content.firstChild
					const body = nodes.innerText.replace(/\s+/gm, ' ').trim()

					// find dates / times and filter blacklisted matches
					const matches = chrono.parse(body).filter(match => !blacklist.includes(match.text))

					// render if matches exist
					const results = document.querySelector('#results')
					matches.length !== 0
						? render(sidebar(matches, message.subject, `${reference}\n${body}`), results)
						: render(html`<p class="text-large align-center padding-top-large">no matches</p>`, results)
				}
			}
			return null // ESLint error if not included
		}).catch((e) => {
			console.error(`GCalError\n${e.stack}`)
			Missive.alert({ title: 'error in GCal script', message: e.toString() })
		})
})
