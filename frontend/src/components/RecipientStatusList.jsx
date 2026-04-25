export default function RecipientStatusList({ recipients = [] }) {
  return (
    <div className="rounded-[2rem] border border-stone-200 bg-white/88 p-6 shadow-glow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Recipients</p>
          <p className="mt-2 text-sm text-stone-600">Legend: `sent` means delivered, `acknowledged` means someone responded.</p>
        </div>
        <p className="text-sm text-stone-500">{recipients.length} tracked</p>
      </div>
      <div className="mt-4 space-y-3">
        {recipients.map((recipient) => (
          <div
            key={`${recipient.recipient_email || recipient.email}-${recipient.id || recipient.status}`}
            className="flex items-center justify-between rounded-[1.5rem] border border-stone-200 bg-stone-50/90 px-4 py-3"
          >
            <div>
              <p className="font-semibold text-stone-900">
                {recipient.recipient_name || recipient.name}
              </p>
              <p className="text-sm text-stone-500">
                {recipient.recipient_email || recipient.email}
              </p>
            </div>
            <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-stone-700">
              {recipient.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
