/* global Missive chrono */
// eslint-disable-next-line import/no-unresolved
import { html, render } from 'https://unpkg.com/lit-html?module'

/* eslint-disable max-len */
/**
 * @typedef {import('lit-html').TemplateResult} TemplateResult
 * @typedef {{ index: number, text: string, tags: object, start: { knownValues: [object],impliedValues: [object] }, end: { knownValues: [object], impliedValues: [object] } }[]} ChronoDates
 */
/* eslint-enable max-len */

// doesn't make much sense to create a calendar event in the past
const HIDE_PAST_EVENTS = true

/**
 * strings to ignore when unintentionally picked up by chrono
 *
 * **NOTE:** case sensitive
 */
const blacklistCaseSensitive = [
	'sun',
]

/**
 * strings to ignore when unintentionally picked up by chrono
 *
 * **NOTE:** case insensitive
 */
const blacklistCaseInsensitive = [
	'now',
	// individual month's would nearly never be used as a Google Calendar event
	'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
	// weird ones I stumbled on
	'1-800',
	'a 12',
]

/**
 * simply attempts to convert to a date string supported by
 * Google Calendar with empty string fallback
 *
 * @param {string} str - date-like arbitrary string
 * @returns {string} GCal supported date string or empty string
 */
const formatAsGCalDate = (str = '') => (
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
 * @returns {TemplateResult} template to be rendered into html of detected info
 */
const card = (orig, start = '', end = '', link) => html`
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
 * @param {ChronoDates} matches - result array of calling chrono.parse
 * @param {string} title - as shown on GCal event
 * @param {string} details - arbitrary info to include in event body
 * @param {string} location - physical location of event
 * @returns {TemplateResult[]} built cards from input matches data
 */
const cards = (matches, title, details, location) => (
	matches.map((match) => {
		const start = match.start.date()
		const end = match.end ? match.end.date() : ''

		// filter dates from the past
		if (start.toString() === 'Invalid Date' || end.toString() === 'Invalid Date') return null
		if (HIDE_PAST_EVENTS && Missive.isPast(start)) return null

		const link = buildLink(title, start, end, details, location)
		return card(match.text, start, end, link)
	}).filter(Boolean)
)

/**
 * @param {TemplateResult[]} items - cards to be rendered, any node
 * @returns {TemplateResult} sidebar with appropriate header and cards
 */
const sidebar = items => (
	items.length !== 0
		? html`
			<h2 class="text-xlarge align-center padding-top-medium">detected events</h2>
			${items}
		`
		: html`<p class="text-large align-center padding-top-large">no matches</p>`
)

// activate reload button
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
					const matches = chrono.parse(body)
						.filter(match => !blacklistCaseSensitive.includes(match.text.trim()))
						.filter(match => !blacklistCaseInsensitive.includes(match.text.trim().toLowerCase()))

					const cardItems = cards(matches, message.subject, `${reference}\n${body}`)

					// render widget
					const results = document.querySelector('#results')
					render(sidebar(cardItems), results)
				}
			}
			return null // ESLint error if not included
		}).catch((e) => {
			console.error(`GCalError\n${e.stack}`)
			Missive.alert({ title: 'error in GCal script', message: e.toString() })
		})
})
