import type { InputHTMLAttributes } from "react";

interface InputProps {
  input?: InputHTMLAttributes<HTMLInputElement>;
  label?: string;
  error?: string;
  /** Defaults to the value of the `name` prop */
  id?: string;
  /** @see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete */
  autoComplete?: string;
}

export default function ConformInput(props: InputProps) {
  const id = props.id ?? props.input?.name ?? "invalid_id";
  return (
    <>
      {props.label && (
        <label htmlFor={id} className="cursor-pointer">
          {props.label}
        </label>
      )}
      <div>
        <input
          {...props.input}
          autoComplete={props.autoComplete}
          aria-invalid={props.error !== undefined}
          id={id}
          className="w-96 border px-2 py-1"
        />
        {props.error && (
          <p className="text-red-500">
            <em>{props.error}</em>
          </p>
        )}
      </div>
    </>
  );
}
