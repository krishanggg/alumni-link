import { titleCase } from '../../utils/titleCase';

interface FormErrorSummaryProps {
  message: string;
  fieldErrors?: Record<string, string[]>;
  fieldIds?: Record<string, string>;
}

export function FormErrorSummary({ message, fieldErrors = {}, fieldIds = {} }: FormErrorSummaryProps) {
  const entries = Object.entries(fieldErrors).filter(([, messages]) => messages && messages.length > 0);

  function focusField(fieldId: string) {
    const field = document.getElementById(fieldId);
    if (field instanceof HTMLElement) {
      field.focus();
    }
  }

  return (
    <div className="rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
      <p>{message}</p>
      {entries.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-label-sm">
          {entries.map(([field, messages]) => (
            <li key={field}>
              {fieldIds[field] ? (
                <a
                  href={`#${fieldIds[field]}`}
                  onClick={(event) => {
                    event.preventDefault();
                    focusField(fieldIds[field]);
                  }}
                  className="font-label-md underline underline-offset-2 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-on-error-container/40"
                >
                  {titleCase(field)}: {messages[0]}
                </a>
              ) : (
                <>
                  <span className="font-label-md">{titleCase(field)}:</span> {messages[0]}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
