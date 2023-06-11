import type { useForm } from "@conform-to/react";
import type { FormProps } from "@remix-run/react";
import { Form } from "@remix-run/react";
import type { ReactNode } from "react";

interface ConformFormProps extends FormProps {
  formComponent?: typeof Form;
  /** Form object returned from `useForm` */
  form: ReturnType<typeof useForm>[0];
  children: ReactNode;
}

/** Normal Remix `Form` with automatic form error message included */
export default function ConformForm({
  formComponent: FormComponent = Form,
  form,
  children,
  ...rest
}: ConformFormProps) {
  return (
    <FormComponent {...rest} {...form.props}>
      {form.error && (
        <p className="py-1 text-red-500">
          <em>{form.error}</em>
        </p>
      )}
      {children}
    </FormComponent>
  );
}
