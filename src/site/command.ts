// Inline commands on the run site's pages: a command stays on one line and may
// wrap only before its last argument when that is a repository or path
// ("npx -y @runeditrun/rer dev | just-every/run-pane"), never mid-command.

const isPathArgument = (word: string) => /^[\w.-]+\/[\w./-]+$/.test(word)

/** Group a command's (already escaped) words into the spans that may not break. */
export function commandGroups(words: string[]): string[][] {
  const last = words[words.length - 1]
  return words.length > 2 && isPathArgument(last) ? [words.slice(0, -1), [last]] : [words]
}

/** Base's /run marks each inline command word as a code-word span; regroup them so the command keeps together. */
export const keepCommands = (html: string): string => html.replace(/<code>((?:<span class="code-word">[^<]*<\/span> ?)+)<\/code>/g, (_match, body: string) => {
  const words = [...body.matchAll(/<span class="code-word">([^<]*)<\/span>/g)].map(match => match[1])
  return `<code>${commandGroups(words).map(group => `<span class="pn-cmd">${group.join(' ')}</span>`).join(' ')}</code>`
})
