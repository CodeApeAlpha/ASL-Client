export default function Transcription({
  content,
  placeholder,
}: {
  content: string;
  placeholder?: string;
}) {
  return (
    <div className="px-5 py-3 border-t border-white/[0.06] min-h-[56px] flex items-center">
      {content ? (
        <p className="text-lg text-white font-medium leading-relaxed">
          {content}
        </p>
      ) : (
        <p className="text-sm text-neutral-600 italic">
          {placeholder || "Waiting for input..."}
        </p>
      )}
    </div>
  );
}
