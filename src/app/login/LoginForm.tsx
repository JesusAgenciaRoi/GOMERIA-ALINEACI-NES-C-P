"use client";

import { useActionState, useState } from "react";
import { iniciarSesion, registrarse } from "./actions";

export default function LoginForm({ next }: { next: string }) {
  const [modo, setModo] = useState<"ingresar" | "registro">("ingresar");
  const [estadoLogin, accionLogin, cargandoLogin] = useActionState(iniciarSesion, undefined);
  const [estadoReg, accionReg, cargandoReg] = useActionState(registrarse, undefined);
  const estado = modo === "ingresar" ? estadoLogin : estadoReg;

  return (
    <div className="tarjeta p-6 sm:p-8 w-full max-w-sm">
      <div className="flex gap-1 p-1 bg-fondo rounded-lg mb-6" role="tablist">
        {(["ingresar", "registro"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={modo === m}
            onClick={() => setModo(m)}
            className={`flex-1 rounded-md py-2 text-sm font-semibold ${modo === m ? "bg-superficie shadow-sm" : "text-suave"}`}
          >
            {m === "ingresar" ? "Ingresar" : "Crear cuenta"}
          </button>
        ))}
      </div>

      <form action={modo === "ingresar" ? accionLogin : accionReg} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        {modo === "registro" && (
          <div>
            <label className="etiqueta" htmlFor="nombre">Nombre</label>
            <input className="input" id="nombre" name="nombre" autoComplete="name" required />
          </div>
        )}
        <div>
          <label className="etiqueta" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="etiqueta" htmlFor="password">Contraseña</label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            autoComplete={modo === "ingresar" ? "current-password" : "new-password"}
            minLength={modo === "registro" ? 8 : undefined}
            required
          />
        </div>

        {estado?.error && <p className="text-sm text-peligro" role="alert">{estado.error}</p>}
        {estado?.ok && <p className="text-sm text-ok" role="status">{estado.ok}</p>}

        <button className="btn btn-oscuro w-full" disabled={cargandoLogin || cargandoReg}>
          {modo === "ingresar" ? (cargandoLogin ? "Ingresando..." : "Ingresar") : cargandoReg ? "Creando..." : "Crear cuenta"}
        </button>

        {modo === "registro" && (
          <p className="text-xs text-suave">
            La primera cuenta creada es la del dueño (administrador). Las siguientes quedan pendientes hasta que el
            administrador las apruebe.
          </p>
        )}
      </form>
    </div>
  );
}
