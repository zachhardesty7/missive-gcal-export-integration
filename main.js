/* global Missive chrono */

import { html, render } from "https://unpkg.com/lit-html@2.8.0/lit-html.js?module"
import { unsafeHTML } from "https://unpkg.com/lit-html@2.8.0/directives/unsafe-html.js?module"

// doesn't make much sense to create a calendar event in the past
const HIDE_PAST_EVENTS = true
// also match duplicates via start and end datetime
const HIDE_DUPLICATE_EVENTS = true
// copy email body into Google Calendar event
const INCLUDE_BODY = false
// log email body before and after sterilization
const DEBUG = false

/**
 * strings to ignore when unintentionally picked up by chrono
 *
 * **NOTE** - case sensitive
 */
const blacklistCaseSensitive = new Set(["sun"])

/**
 * strings to ignore when unintentionally picked up by chrono
 *
 * **NOTE** - case insensitive
 */
const blacklistCaseInsensitive = [
  "now",
  "today",
  "night",
  // TODO: convert to regex targetting any number <= 24
  "24 hours a day",
  // TODO: convert to regex targetting any number <= 168
  "40 hours a week",
  // TODO: convert to regex targetting any number <= 7
  "7 days a week",
  "a minute",
  "a few minutes",
  "a second",
  "a few seconds",
  // individual month's would nearly never be used as a Google Calendar event
  // REVIEW: consider allowing months
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
  // weird ones I stumbled on
  // TODO: should probably be any number <= 24
  "a 12",
  "a 24",
  "Sam",
  "sex",
  "DOM",
  "an SEC",
  // TODO: convert to regexes
  // should probably be any number <= 24
  // "9HP",
  // should probably be any number <= 24
  // "19:",
  // gets parsed as 20:14, should probably be any number with 4 digits
  // "a 2014",
  // gets parsed as 20:19-20:20
  // "2019 to 2020",
  // gets parsed as hours, should rm any "to" range
  // "15 to 20",
]

/**
 * checks used to determine if matches should be kept
 *
 * @param {ChronoDates[number]} match
 */
function shouldKeepMatch(match) {
  return (
    // remove blacklisted items
    !blacklistCaseSensitive.has(match.text.trim()) &&
    !blacklistCaseInsensitive
      .map((str) => str.toLowerCase())
      .includes(match.text.trim().toLowerCase()) &&
    // remove items without valid start datetime
    match.start.toString() !== "Invalid Date" &&
    // if enabled, hide datetimes that started in the past
    (!HIDE_PAST_EVENTS || !Missive.isPast(match.start))
  )
}

/**
 * filters out certain text matches if any of the (enabled) following are true: case
 * sensitive or insensitive blacklisted, start is 'Invalid Date' when parsing, event
 * starts in the past, duplicate text, duplicate start and end time
 *
 * @param {ChronoDates} matches - list of matches returned by Chrono
 * @returns {ChronoDates} shorter array than input (w/o meta info for start/end)
 */
const filterMatches = (matches) => {
  const cleanMatches = matches.map((match) => {
    const clone = { ...match }

    // convert match info to datetime string
    clone.start = clone.start.date()
    clone.end = clone.end ? clone.end.date() : ""

    // hide invalid end values
    if (clone.end === "Invalid Date") {
      clone.end = ""
    }

    return clone
  })

  const debugMatches = cleanMatches.map((match) => {
    const newMatch = { ...match }

    // append debug info if any of the filters would have removed this match
    if (!shouldKeepMatch(match)) {
      newMatch.text = `<s>${match.text}</s><br>(DEBUG) rm'd by filters:`
    }

    // check each item in {@link matchFilter} individually
    if (blacklistCaseSensitive.has(match.text.trim())) {
      newMatch.text += `<br>- blacklistCaseSensitive`
    }
    if (
      blacklistCaseInsensitive
        .map((str) => str.toLowerCase())
        .includes(match.text.trim().toLowerCase())
    ) {
      newMatch.text += `<br>- blacklistCaseInsensitive`
    }
    if (match.start.toString() === "Invalid Date") {
      newMatch.text += `<br>- start Invalid Date`
    }
    if (HIDE_PAST_EVENTS && Missive.isPast(match.start)) {
      newMatch.text += `<br>- start in past`
    }

    return newMatch
  })

  const processedMatches = DEBUG ? debugMatches : cleanMatches.filter(shouldKeepMatch)

  // convert from arr -> obj -> arr to remove identical text datetimes
  let matchTable = {}
  for (const match of processedMatches) {
    if (!matchTable[match.text]) {
      matchTable[match.text] = match
    }
  }
  let output = Object.values(matchTable)

  // reuse and filter duplicate start/end datetimes
  if (HIDE_DUPLICATE_EVENTS) {
    matchTable = {}
    for (const match of output) {
      const key = match.start + match.end
      if (!matchTable[key]) {
        matchTable[key] = match
      }
    }
    output = Object.values(matchTable)
  }

  return output
}

/**
 * parse text to remove char sequences that cause false positives in Chrono
 *
 * @param {string} str - arbitrary value, usually email body
 * @returns {string} input without extra whitespace and problematic chars
 */
/* eslint-disable no-irregular-whitespace */
const sterilizeText = (str) =>
  str
    .replaceAll(/(@|\|)/gm, "at") // swap @ and | for word "at"
    .replaceAll(/[Tt]ime:/gm, ",") // time label
    // "the 10th" style breaks date func, rm bc usually preceded by weekday
    .replaceAll(/the \d\d?(st|nd|rd|th)/gm, "")
    // most US timezone indicators (surrounded by parens or brackets)
    .replaceAll(/[([][CEMP][DS]?T[)\]]/gm, "")
    // most Europe timezone indicators (surrounded by parens or brackets)
    .replaceAll(/[([]\w{1,2}[ES]T[)\]]/gm, "")
    // UTC or GMT (surrounded by parens)
    .replaceAll(/[([]?(UTC|GMT)[)\]]?/gm, "")
    // REVIEW: possibly overzealous phone num filtering
    // phone numbers that accidentally trigger
    .replaceAll(/\+?\d{1,3}-\d{3}-\d{3}-\d{4}/gm, " ") // int'l
    .replaceAll(/\d-\d{4}/gm, " ")
    .replaceAll(/\d{3}- ?\d{2}/gm, " ")
    .replaceAll(/\d{3}-\d{3}/gm, " ")
    .replaceAll(/\d{3}-\d{4}/gm, " ")
    .replaceAll(/\d- ?\d-\d{3}/gm, " ")
    // fix whitespace
    .trim()
    .replaceAll(/[\t  ]{2,}/gm, " ") // extra spaces
    .replaceAll(/([\t  ]*\n)+/gm, "\n") // multiple blank lines
    // time values mess up when only 1 part has minutes
    .replaceAll(/(?<!\d)(?<!:)(\d\d?)( ?- ?\d\d?:\d\d)/gm, "$1:00$2")
    .replaceAll(/(\d\d?:\d\d ?- ?\d\d?)(?!\d?:)/gm, "$1:00")
    // cosmetic fix for strange date display
    .replaceAll(/\((\d\d?\/\d\d?)\)/gm, " $1 ")
    // fix for missing month in end of date range
    .replaceAll(/(\d?\d)(\/\d?\d)(-)(\d?\d)/gm, "$1$2 $3 $1/$4")

/* eslint-enable no-irregular-whitespace */

/**
 * simply attempts to convert to a date string supported by Google Calendar with empty
 * string fallback
 *
 * @param {string} str - date-like arbitrary string
 * @returns {string} GCal supported date string or empty string
 */
const formatAsGCalDate = (str = "") =>
  (str &&
    new Date(str) &&
    new Date(str).toISOString() &&
    new Date(str).toISOString().replaceAll(/-|:|\.\d{3}/g, "")) ||
  ""

/**
 * takes info about events and encodes it into a url that opens Google Calendar and
 * automatically creates and fills in event info provided
 *
 * @param {string} title - as shown on GCal event
 * @param {string} start - GCal date-like val of event start
 * @param {string} end - GCal date-like val of event end
 * @param {string} details - arbitrary info to include in event body
 * @param {string} location - physical location of event
 * @returns {string} encoded URL of endpoint and query args to target
 */
const buildLink = (title = "", start = "", end = "", details = "", location = "") => {
  const link = new URLSearchParams()
  const startFormatted = formatAsGCalDate(start)
  let endFormatted = formatAsGCalDate(end)

  // fill in empty end datetime as 1 hour after start datetime
  if (!endFormatted) {
    const datetime = new Date(start)
    datetime.setHours(datetime.getHours() + 1)

    endFormatted = formatAsGCalDate(datetime)
  }

  link.append("action", "TEMPLATE") // required
  link.append("text", title)
  link.append("dates", `${startFormatted}/${endFormatted}`)
  link.append("details", details)
  link.append("location", location)
  link.append("trp", "true") // busy
  link.append("sprop", "https://mail.missiveapp.com") // source
  link.append("sprop", "name:Missive") // source name

  return `https://calendar.google.com/render?${link.toString()}`
}

/**
 * template for each card display of info from parsed date/time from email body using
 * `lit-html`
 *
 * @param {string} orig - original date-like string
 * @param {string} start - completely parsed date-like event start
 * @param {string} end - completely parsed date-like event end
 * @param {string} link - Google Calendar auto-create event link for button
 * @returns {TemplateResult} template to be rendered into html of detected info
 */
const card = (orig, start = "", end = "", link = "#") => html`
  <div class="card shadow padding-xlarge">
    <h3 class="title text-600">${DEBUG ? unsafeHTML(orig) : orig}</h3>
    <div class="margin-top-xlarge margin-bottom-xlarge">
      <p>
        <span class="text-c label-date">
          <!-- REVIEW: keep 'At' label? -->
          ${end ? "Start: " : "At: "}
        </span>
        ${start}
      </p>
      ${end &&
      html`
        <p>
          <span class="text-c label-date">End:</span>
          ${end}
        </p>
      `}
    </div>
    <a @click=${() => Missive.openURL(link)} class="button">Export</a>
  </div>
`

/**
 * template for container of cards with info from parsed date/time from email body using
 * `lit-html`
 *
 * @param {ChronoDates} matches - result array of calling chrono.parse
 * @param {string} title - as shown on GCal event
 * @param {string} details - arbitrary info to include in event body
 * @param {string} location - physical location of event
 * @returns {TemplateResult[]} built cards from input matches data
 */
const cards = (matches, title, details, location) =>
  matches
    .map(({ text, start, end }) => {
      const link = buildLink(title, start, end, details, location)
      return card(text, start, end, link)
    })
    .filter(Boolean)

/**
 * @param {TemplateResult[]} items - cards to be rendered, any node
 * @returns {TemplateResult} sidebar with appropriate header and cards
 */
const sidebar = (items) =>
  items.length === 0
    ? html`
        <p class="text-large align-center padding-top-large">no matches</p>
      `
    : html`
        <h2 class="text-xlarge align-center padding-top-medium text-600">
          detected events
        </h2>
        ${items}
      `

// activate reload button
document.querySelector("#reload")?.addEventListener("click", () => Missive.reload())

// activate github button
document
  .querySelector(".support-icon")
  ?.addEventListener("click", () =>
    Missive.openURL("https://github.com/zachhardesty7/missive-gcal-export-integration"),
  )

const handleConversationsChange = (ids) => {
  Missive.fetchConversations(ids, [
    "latest_message",
    "!latest_message.attachments",
    "link",
  ])
    .then((conversations) => {
      // single convo loaded, operate normally
      const results = document.querySelector("#results")

      if (conversations && conversations.length === 1) {
        const { link, latest_message: message } = conversations[0]

        if (message && message.from_field && conversations.length === 1) {
          // extract raw text from stringified html provided
          const template = document.createElement("template")
          template.innerHTML = message.body
          const body = sterilizeText(template.content.textContent)

          // log email content before & after sterilization
          if (DEBUG) {
            console.log(template.content.textContent)
            console.log(body)
          }

          const allMatches = chrono.parse(body)
          const matches = filterMatches(allMatches)

          // log matches before & after manual filtering
          if (DEBUG) {
            console.log("allMatches", allMatches)
            console.log("matches", matches)
          }

          const emailBody = INCLUDE_BODY ? `\n\n<strong>EMAIL:</strong>\n${body}` : ""
          const details = `<strong>LINK:</strong>\n${link}${emailBody}`
          const cardItems = cards(matches, message.subject, details)

          render(sidebar(cardItems), results)
          results?.scrollIntoView()
        }
      } else if (conversations && conversations.length >= 2) {
        // multiple convos loaded
        const multipleSelections = html`
          <p class="text-large align-center padding-top-large">
            multiple conversations selected
          </p>
        `

        render(multipleSelections, results)
      } else {
        // no convo loaded
        const noSelection = html`
          <p class="text-large align-center padding-top-large">
            no conversation selected
          </p>
        `

        render(noSelection, results)
      }

      return null // required by linter
    })
    .catch((error) => {
      console.error(`GCalError\n${error.stack}`)
      Missive.alert({
        title: "error in GCal script",
        message: error.toString(),
      })
    })
}

/** triggers each time email is loaded and renders found matches */
Missive.on("change:conversations", handleConversationsChange)
handleConversationsChange(Missive.state.conversations)

/**
 * @typedef {import("lit-html").TemplateResult} TemplateResult
 *
 * @typedef {{
 *   index: number
 *   text: string
 *   tags: object
 *   start: { knownValues: [object]; impliedValues: [object] }
 *   end: { knownValues: [object]; impliedValues: [object] }
 * }[]} ChronoDates
 */
