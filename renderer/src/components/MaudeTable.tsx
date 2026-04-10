import type { MaudeMatch } from '../../../shared/types';
import { formatMaudeDate } from '../lib/format';

interface MaudeTableProps {
  matches: MaudeMatch[];
}

export default function MaudeTable({ matches }: MaudeTableProps) {
  if (matches.length === 0) {
    return <p className="text-xs text-stone-400 py-4">No report details available.</p>;
  }
  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-left text-stone-400 border-b border-surface-border mono">
          <th className="pb-1.5 pr-3 font-medium">Date</th>
          <th className="pb-1.5 pr-3 font-medium">Type</th>
          <th className="pb-1.5 pr-3 font-medium">Outcome</th>
          <th className="pb-1.5 font-medium">Description</th>
        </tr>
      </thead>
      <tbody className="text-stone-600">
        {matches.map((m, i) => (
          <tr key={i} className="border-b border-stone-50 align-top hover:bg-stone-50">
            <td className="py-1.5 pr-3 whitespace-nowrap mono text-stone-400 text-[10px]">
              {formatMaudeDate(m.reportDate)}
            </td>
            <td className="py-1.5 pr-3 whitespace-nowrap">{m.eventType}</td>
            <td
              className={`py-1.5 pr-3 whitespace-nowrap ${
                m.patientOutcome === 'Death' ? 'text-risk-high font-medium' : ''
              }`}
            >
              {m.patientOutcome}
            </td>
            <td className="py-1.5 text-stone-500 leading-relaxed">
              {m.eventDescription.slice(0, 250)}
              {m.eventDescription.length > 250 ? '...' : ''}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
