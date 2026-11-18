import Link from "next/link";
import { estadoInfo } from "@/lib/turnos";

export function Encabezado({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="titulo text-3xl leading-none">{titulo}</h1>
        {subtitulo && <p className="text-suave mt-1">{subtitulo}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function EstadoBadge({ estado }: { estado: string }) {
  const info = estadoInfo(estado);
  return <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${info.clase}`}>{info.label}</span>;
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <div className="tarjeta p-8 text-center text-suave">{children}</div>;
}

export function Campo({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  placeholder,
  className,
  ...rest
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue">) {
  return (
    <div className={className}>
      <label className="etiqueta" htmlFor={name}>{label}</label>
      <input
        className="input"
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? undefined}
        required={required}
        placeholder={placeholder}
        {...rest}
      />
    </div>
  );
}

export function Volver({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-block text-sm text-suave hover:text-texto mb-3">
      &larr; {children}
    </Link>
  );
}
