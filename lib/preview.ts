/**
 * Extra lock-down for the live preview. Generated pages are meant to be standalone, so the
 * preview blocks every network request, remote resource and form submission. Only inline
 * script/style and data: URIs work. The downloaded file is never modified.
 */
const PREVIEW_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "media-src data: blob:",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

export function withPreviewCsp(html: string): string {
  const tag = `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">`;

  const head = /<head\b[^>]*>/i.exec(html);
  if (head) {
    const end = head.index + head[0].length;
    return html.slice(0, end) + tag + html.slice(end);
  }
  const root = /<html\b[^>]*>/i.exec(html);
  if (root) {
    const end = root.index + root[0].length;
    return `${html.slice(0, end)}<head>${tag}</head>${html.slice(end)}`;
  }
  return tag + html;
}
