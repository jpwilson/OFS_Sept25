// Module hooks for node-story.mjs: utils/sanitizeHtml.js resolves to a pass-through.
const PASS = 'data:text/javascript,export function sanitizeHtml(h){return h?String(h):""}'

export async function resolve(specifier, context, next) {
  if (/(^|\/)utils\/sanitizeHtml\.js$/.test(specifier)) return { url: PASS, shortCircuit: true }
  return next(specifier, context)
}
