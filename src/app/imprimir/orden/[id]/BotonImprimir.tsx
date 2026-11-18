"use client";

export default function BotonImprimir() {
  return (
    <button className="btn btn-oscuro" onClick={() => window.print()}>
      Imprimir / guardar PDF
    </button>
  );
}
