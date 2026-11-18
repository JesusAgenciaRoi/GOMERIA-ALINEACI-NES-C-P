"use client";

import dynamic from "next/dynamic";
import type { DisenoInicial } from "@/components/editor/Editor";
import type { DatosNegocio } from "@/components/editor/plantillas";

// El editor usa el canvas del navegador: se carga solo en el cliente
const Editor = dynamic(() => import("@/components/editor/Editor"), {
  ssr: false,
  loading: () => <div className="p-10 text-center text-suave">Abriendo el editor...</div>,
});

export default function EditorCarga(props: { diseno: DisenoInicial; negocio: DatosNegocio; fotosLocal: string[]; fotosSubidas: string[] }) {
  return <Editor {...props} />;
}
