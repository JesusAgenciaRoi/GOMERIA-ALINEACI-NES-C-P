import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerPerfil } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const metadata = { title: "Ingresar | Panel C&P" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (await obtenerPerfil()) redirect("/panel");

  return (
    <main className="flex-1 grid place-items-center px-4 py-12 bg-asfalto">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <Link href="/" className="text-center">
          <span className="titulo text-3xl text-white">Gomería <span className="text-senal">C&amp;P</span></span>
          <span className="block text-sm text-zinc-400">Panel de gestión</span>
        </Link>
        {error && <p className="text-sm text-amber-300">No se pudo validar el enlace. Probá ingresar de nuevo.</p>}
        <LoginForm next={next ?? "/panel"} />
      </div>
    </main>
  );
}
