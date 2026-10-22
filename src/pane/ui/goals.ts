import { goalTypeName } from '../goals'
import type { GoalReport, GoalRow } from '../goal-data'
import { escape } from './kit'

const percent = (rate: number | null) => rate === null ? 'No visits yet' : `${(rate * 100).toLocaleString('en-US', {maximumFractionDigits: 1})}%`
const number = (value: number) => value.toLocaleString('en-US')

function breakdown(title: string, rows: GoalRow[], name: (label: string) => string): string {
 const shown = rows.filter(row => row.conversions > 0)
 return `<details><summary>${title}</summary>${shown.length ? `<dl class="goal-rows">${shown.map(row => `<div><dt>${escape(name(row.label))}</dt><dd>${number(row.conversions)} of ${number(row.visits)} · ${percent(row.visits ? row.conversions / row.visits : null)}</dd></div>`).join('')}</dl>` : '<p class="help">No conversions recorded yet.</p>'}</details>`
}

/** Conversions and rate per goal, with a landing-visit to conversion funnel. */
export function goalsView(goals: GoalReport[], title: (slug: string) => string): string {
 const body = goals.length ? goals.map(goal => {
  const width = goal.visits ? Math.max(goal.conversions / goal.visits * 100, goal.conversions ? 2 : 0) : 0
  return `<article class="goal" aria-label="${escape(goal.name)}"><h3>${escape(goal.name)}</h3><p class="help">${goalTypeName(goal.type)}${goal.page ? ` on ${escape(title(goal.page))}` : ' on any page'}</p><h4>Funnel</h4><ol class="funnel"><li><span>Visits${goal.page ? ` to ${escape(title(goal.page))}` : ''}</span><strong>${number(goal.visits)}</strong><i style="width:100%"></i></li><li><span>${escape(goal.name)}</span><strong>${number(goal.conversions)}</strong><i style="width:${width}%"></i></li></ol><p class="goal-rate">Conversion rate <strong>${percent(goal.rate)}</strong></p>${breakdown('By page', goal.byPage, title)}${breakdown('By channel', goal.bySource, label => label || 'Not provided')}${breakdown('By campaign', goal.byCampaign, label => label || 'No campaign tag')}</article>`
 }).join('') : '<div class="empty"><strong>No conversion goals yet</strong><p>Add goals under Site name and description in the editor, then publish.</p></div>'
 return `<section class="card visits-card" id="goals" aria-labelledby="goals-title"><h2 id="goals-title">Conversion goals</h2><p class="help">Completed goals as a share of the visits to the same page, channel or campaign. A goal counts for the page view it happens on. Counts only, with no visitor identifiers or message text.</p>${body}</section>`
}
