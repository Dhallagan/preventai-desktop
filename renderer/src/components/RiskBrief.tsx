import { renderMarkdown } from '../lib/markdown';

interface RiskBriefProps {
  brief: string | undefined;
}

export default function RiskBrief({ brief }: RiskBriefProps) {
  if (!brief) {
    return <p className="text-sm text-stone-400">No risk brief available.</p>;
  }
  return (
    <div
      className="text-[14px] text-stone-700 leading-[1.8]"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(brief) }}
    />
  );
}
