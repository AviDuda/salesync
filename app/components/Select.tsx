import type { ReactNode } from "react";
import { useField } from "remix-validated-form";

interface InputProps {
  name: string;
  label?: string;
  id?: string;
  children: ReactNode;
}

export default function Select(props: InputProps) {
  const { error, getInputProps } = useField(props.name);
  const id = props.id ?? props.name;
  return (
    <>
      {props.label && (
        <label htmlFor={id} className="cursor-pointer">
          {props.label}
        </label>
      )}
      <div>
        <select {...getInputProps({ id })}>{props.children}</select>
        {error && (
          <p className="text-red-500">
            <em>{error}</em>
          </p>
        )}
      </div>
    </>
  );
}
