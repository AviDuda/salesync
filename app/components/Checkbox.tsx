import type { InputHTMLAttributes } from "react";
import { useField } from "remix-validated-form";

interface CheckboxProps {
  input?: InputHTMLAttributes<HTMLInputElement>;
  name: string;
  label?: string;
  id?: string;
}

export default function Checkbox(props: CheckboxProps) {
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
        <input {...props.input} {...getInputProps({ id, type: "checkbox" })} />
        {error && (
          <p className="text-red-500">
            <em>{error}</em>
          </p>
        )}
      </div>
    </>
  );
}
