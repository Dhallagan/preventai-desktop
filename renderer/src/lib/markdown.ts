// Tiny markdown renderer for risk briefs.
// Handles **bold**, paragraphs, and numbered lists.

export function renderMarkdown(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-stone-900 font-semibold">$1</strong>')
    .replace(/^(\d+)\.\s+/gm, '<br/><span class="font-medium">$1.</span> ')
    .replace(/\n\n/g, '</p><p class="mt-3">')
    .replace(/\n/g, '<br/>');
}
