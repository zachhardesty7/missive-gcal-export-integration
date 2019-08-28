/* global Missive chrono */
// eslint-disable-next-line import/no-unresolved
import { html, render } from 'https://unpkg.com/lit-html?module'

// doesn't make much sense to create a calendar event in the past
const HIDE_PAST_EVENTS = true
// also match duplicates via start and end datetime
const AGGRESSIVELY_FILTER_DUPLICATES = true
// copy email body into Google Calendar event
const INCLUDE_BODY = false

/**
 * strings to ignore when unintentionally picked up by chrono
 *
 * **NOTE** - case sensitive
 */
const blacklistCaseSensitive = [
	'sun',
]

/**
 * strings to ignore when unintentionally picked up by chrono
 *
 * **NOTE** - case insensitive
 */
const blacklistCaseInsensitive = [
	'now', 'today',
	// individual month's would nearly never be used as a Google Calendar event
	'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
	// weird ones I stumbled on
	'1-800',
	'a 12',
]

/**
 * filters out certain text matches if any of the (enabled) following are true:
 * case sensitive or insensitive blacklisted, start is 'Invalid Date' when parsing,
 * event starts in the past, duplicate text, duplicate start and end time
 *
 * @param {ChronoDates} matches - list of matches returned by Chrono
 * @returns {ChronoDates} shorter array than input (w/o meta info for start/end)
 */
const filterMatches = (matches) => {
	const cleanMatches = matches.map((match) => {
		const clone = { ...match }

		// convert match info to datetime string
		clone.start = clone.start.date()
		clone.end = clone.end ? clone.end.date() : ''

		// hide invalid end values
		if (clone.end === 'Invalid Date') clone.end = ''

		return clone
	})

	const filteredMatches = cleanMatches
		// remove blacklisted items
		.filter(({ text }) => !blacklistCaseSensitive.includes(text.trim()))
		.filter(({ text }) => !blacklistCaseInsensitive.includes(text.trim().toLowerCase()))

		// remove items without valid end datetime
		.filter(({ start }) => start !== 'Invalid Date')

		// if enabled, hide datetimes that started in the past
		.filter(({ start }) => !HIDE_PAST_EVENTS || !Missive.isPast(start))

	// convert from arr -> obj -> arr to remove identical text datetimes
	let matchTable = {}
	filteredMatches.forEach((match) => {
		if (!matchTable[match.text]) matchTable[match.text] = match
	})
	let output = Object.values(matchTable)

	// reuse and filter duplicate start/end datetimes
	if (AGGRESSIVELY_FILTER_DUPLICATES) {
		matchTable = {}
		output.forEach((match) => {
			const key = match.start + match.end
			if (!matchTable[key]) matchTable[key] = match
		})
		output = Object.values(matchTable)
	}

	return output
}

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
	let endFormatted = formatAsGCalDate(end)

	// fill in empty end datetime as 1 hour after start datetime
	if (!endFormatted) {
		const datetime = new Date(start)
		datetime.setHours(datetime.getHours() + 1)

		endFormatted = formatAsGCalDate(datetime)
	}

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
    <h3 class="title text-600">${orig}</h3>
    <div class="margin-top-xlarge margin-bottom-xlarge">
			<p>
				<span class="text-c label-date">
					<!-- REVIEW: keep 'At' label? -->
					${!end ? 'At: ' : 'Start: '}
				</span>
				${start}
			</p>
			${end && html`
				<p>
					<span class="text-c label-date">
						End: 
					</span>
					${end}
				</p>
			`}
    </div>
    <a target="_blank" @click=${() => Missive.openURL(link)} href=${link} class="button">Export</a>
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
	matches.map(({ text, start, end }) => {
		const link = buildLink(title, start, end, details, location)
		return card(text, start, end, link)
	}).filter(Boolean)
)

/**
 * @param {TemplateResult[]} items - cards to be rendered, any node
 * @returns {TemplateResult} sidebar with appropriate header and cards
 */
const sidebar = items => (
	items.length !== 0
		? html`
			<h2 class="text-xlarge align-center padding-top-medium text-600">detected events</h2>
			${items}
		`
		: html`<p class="text-large align-center padding-top-large">no matches</p>`
)

// activate reload button
document.querySelector('#reload')
	.addEventListener('click', () => Missive.reload())

const handleConversationsChange = (ids) => {
	Missive.fetchConversations(ids, ['latest_message', 'link'])
		.then((conversations) => {
			if (conversations && conversations[0]) {
				const reference = conversations[0].link
				const message = Array.isArray(conversations[0].latest_message)
					? conversations[0].latest_message[0]
					: conversations[0].latest_message

				if (message && message.from_field && conversations.length === 1) {
					// extract raw text from stringified html provided
					const template = document.createElement('template')
					template.innerHTML = message.body
					const body = template.content.textContent.replace(/\s+/gm, ' ').trim()

					const matches = filterMatches(chrono.parse(body))
					const details = `<strong>LINK:</strong>\n${reference}${INCLUDE_BODY ? `\n\n<strong>EMAIL:</strong>\n${body}` : ''}`
					const cardItems = cards(matches, message.subject, details)

					const results = document.querySelector('#results')
					render(sidebar(cardItems), results)
				}
			}
			return null // required by linter
		}).catch((e) => {
			console.error(`GCalError\n${e.stack}`)
			Missive.alert({ title: 'error in GCal script', message: e.toString() })
		})
}

/**
 * triggers each time email is loaded and renders found matches
 */
Missive.on('change:conversations', handleConversationsChange)
handleConversationsChange(Missive.state.conversations)

/* eslint-disable max-len */
/**
 * @typedef {import('lit-html').TemplateResult} TemplateResult
 * @typedef {{ index: number, text: string, tags: object, start: { knownValues: [object],impliedValues: [object] }, end: { knownValues: [object], impliedValues: [object] } }[]} ChronoDates
 */
