import { CaretDown } from '@phosphor-icons/react/dist/ssr';

interface Props {
  id?: string;
  title: string;
  children: React.ReactNode;
}

export function Disclosure({ id, title, children }: Props) {
  return (
    <details id={id} className="disclosure">
      <summary className="type-heading">{title}<CaretDown size={20} weight="bold" aria-hidden className="chevron shrink-0" /></summary>
      <div className="flex flex-col gap-4 pt-3 pb-4">{children}</div>
    </details>
  );
}
