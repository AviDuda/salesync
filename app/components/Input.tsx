import type { InputHTMLAttributes } from "react";
import { useField } from "remix-validated-form";

interface InputProps {
  input?: InputHTMLAttributes<HTMLInputElement>;
  name: string;
  label?: string;
  // error?: string;
  /** Defaults to the value of the `name` prop */
  id?: string;
}

export default function Input(props: InputProps) {
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
        <input
          {...props.input}
          {...getInputProps({ id })}
          className="border py-1 px-2 w-96"
        />
        {error && (
          <p className="text-red-500">
            <em>{error}</em>
          </p>
        )}
      </div>
    </>
  );
}
