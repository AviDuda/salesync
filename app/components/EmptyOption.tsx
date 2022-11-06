interface EmptyOptionProps {
  title?: string;
}

/**
 * A little helper to render an empty option
 * which is hidden after selecting an option.
 *
 * You will need to set `defaultValue=""` on the `<select>` to make this work.
 */
export default function EmptyOption(props: EmptyOptionProps) {
  return (
    <option hidden disabled value="">
      {props.title ?? "-- select --"}
    </option>
  );
}
