import type { ReactNode, SelectHTMLAttributes } from "react";

interface SelectProps {
  select: SelectHTMLAttributes<HTMLSelectElement>;
  children: ReactNode;
  label?: string;
  id?: string;
  error?: string;
}

export default function ConformSelect(props: SelectProps) {
  const id = props.id ?? props.select.name ?? "invalid_id";
  return (
    <>
      {props.label && (
        <label htmlFor={id} className="cursor-pointer">
          {props.label}
        </label>
      )}
      <div>
        <select {...props.select}>{props.children}</select>
        {props.error && (
          <p className="text-red-500">
            <em>{props.error}</em>
          </p>
        )}
      </div>
    </>
  );
}
