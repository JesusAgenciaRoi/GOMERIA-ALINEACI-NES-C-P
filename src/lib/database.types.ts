// Generado desde Supabase (tablas y funciones del esquema public).
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];


export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      bloqueos: {
        Row: { fin: string; id: string; inicio: string; motivo: string | null; recurso_id: string | null };
        Insert: { fin: string; id?: string; inicio: string; motivo?: string | null; recurso_id?: string | null };
        Update: { fin?: string; id?: string; inicio?: string; motivo?: string | null; recurso_id?: string | null };
        Relationships: [
          { foreignKeyName: "bloqueos_recurso_id_fkey"; columns: ["recurso_id"]; isOneToOne: false; referencedRelation: "recursos"; referencedColumns: ["id"] },
        ];
      };
      clientes: {
        Row: { acepta_promos: boolean; created_at: string; email: string | null; id: string; nombre: string; notas: string | null; origen: string; telefono: string | null };
        Insert: { acepta_promos?: boolean; created_at?: string; email?: string | null; id?: string; nombre: string; notas?: string | null; origen?: string; telefono?: string | null };
        Update: { acepta_promos?: boolean; created_at?: string; email?: string | null; id?: string; nombre?: string; notas?: string | null; origen?: string; telefono?: string | null };
        Relationships: [];
      };
      campanas: {
        Row: {
          activa: boolean; created_at: string; creado_por: string | null; id: string; mensaje: string; meses: number; nombre: string;
          servicio_ids: string[]; tipo: string;
        };
        Insert: {
          activa?: boolean; created_at?: string; creado_por?: string | null; id?: string; mensaje: string; meses?: number; nombre: string;
          servicio_ids?: string[]; tipo: string;
        };
        Update: Partial<Database["public"]["Tables"]["campanas"]["Row"]>;
        Relationships: [];
      };
      campana_envios: {
        Row: { campana_id: string; cliente_id: string; enviado_en: string; enviado_por: string | null; id: string };
        Insert: { campana_id: string; cliente_id: string; enviado_en?: string; enviado_por?: string | null; id?: string };
        Update: Partial<Database["public"]["Tables"]["campana_envios"]["Row"]>;
        Relationships: [];
      };
      config_negocio: {
        Row: {
          anticipacion_min_horas: number; dias_max_reserva: number; direccion: string | null; email: string | null;
          facebook: string | null; id: number; instagram: string | null; intervalo_min: number; nombre: string; personas: number;
          sena_activa: boolean; sena_minutos_vencimiento: number; telefono: string | null; whatsapp: string | null; zona_horaria: string;
        };
        Insert: Partial<Database["public"]["Tables"]["config_negocio"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["config_negocio"]["Row"]>;
        Relationships: [];
      };
      horarios: {
        Row: { apertura: string; cierre: string; dia_semana: number; id: string };
        Insert: { apertura: string; cierre: string; dia_semana: number; id?: string };
        Update: { apertura?: string; cierre?: string; dia_semana?: number; id?: string };
        Relationships: [];
      };
      pagos: {
        Row: { created_at: string; datos: Json | null; estado: string; id: string; monto: number; proveedor: string; referencia_externa: string | null; turno_id: string | null };
        Insert: { created_at?: string; datos?: Json | null; estado?: string; id?: string; monto: number; proveedor?: string; referencia_externa?: string | null; turno_id?: string | null };
        Update: { created_at?: string; datos?: Json | null; estado?: string; id?: string; monto?: number; proveedor?: string; referencia_externa?: string | null; turno_id?: string | null };
        Relationships: [
          { foreignKeyName: "pagos_turno_id_fkey"; columns: ["turno_id"]; isOneToOne: false; referencedRelation: "turnos"; referencedColumns: ["id"] },
        ];
      };
      profiles: {
        Row: { created_at: string; email: string | null; id: string; nombre: string; rol: string };
        Insert: { created_at?: string; email?: string | null; id: string; nombre: string; rol?: string };
        Update: { created_at?: string; email?: string | null; id?: string; nombre?: string; rol?: string };
        Relationships: [];
      };
      recursos: {
        Row: { activo: boolean; id: string; nombre: string; tipo: string };
        Insert: { activo?: boolean; id?: string; nombre: string; tipo?: string };
        Update: { activo?: boolean; id?: string; nombre?: string; tipo?: string };
        Relationships: [];
      };
      servicios: {
        Row: {
          activo: boolean; descripcion: string | null; duracion_min: number; id: string; monto_sena: number | null; nombre: string;
          orden: number; precio: number | null; requiere_sena: boolean; reservable_web: boolean; tipo_recurso: string;
        };
        Insert: {
          activo?: boolean; descripcion?: string | null; duracion_min: number; id?: string; monto_sena?: number | null; nombre: string;
          orden?: number; precio?: number | null; requiere_sena?: boolean; reservable_web?: boolean; tipo_recurso?: string;
        };
        Update: Partial<Database["public"]["Tables"]["servicios"]["Row"]>;
        Relationships: [];
      };
      proveedores: {
        Row: { created_at: string; email: string | null; id: string; nombre: string; notas: string | null; telefono: string | null };
        Insert: { created_at?: string; email?: string | null; id?: string; nombre: string; notas?: string | null; telefono?: string | null };
        Update: Partial<Database["public"]["Tables"]["proveedores"]["Row"]>;
        Relationships: [];
      };
      productos: {
        Row: {
          activo: boolean; categoria: string; codigo: string | null; condicion: string; created_at: string; id: string; marca: string | null;
          medida: string | null; nombre: string; notas: string | null; precio_costo: number | null; precio_venta: number | null;
          proveedor_id: string | null; stock: number; stock_minimo: number;
        };
        Insert: {
          activo?: boolean; categoria?: string; codigo?: string | null; condicion?: string; created_at?: string; id?: string; marca?: string | null;
          medida?: string | null; nombre: string; notas?: string | null; precio_costo?: number | null; precio_venta?: number | null;
          proveedor_id?: string | null; stock?: number; stock_minimo?: number;
        };
        Update: Partial<Database["public"]["Tables"]["productos"]["Row"]>;
        Relationships: [
          { foreignKeyName: "productos_proveedor_id_fkey"; columns: ["proveedor_id"]; isOneToOne: false; referencedRelation: "proveedores"; referencedColumns: ["id"] },
        ];
      };
      ordenes: {
        Row: {
          cliente_id: string; cobrada_en: string | null; creado_por: string | null; created_at: string; descuento: number; estado: string;
          factura: string | null; id: string; km: number | null; notas: string | null; numero: number; total: number; turno_id: string | null;
          vehiculo_id: string | null;
        };
        Insert: {
          cliente_id: string; cobrada_en?: string | null; creado_por?: string | null; created_at?: string; descuento?: number; estado?: string;
          factura?: string | null; id?: string; km?: number | null; notas?: string | null; total?: number; turno_id?: string | null;
          vehiculo_id?: string | null;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["ordenes"]["Row"], "numero">>;
        Relationships: [
          { foreignKeyName: "ordenes_cliente_id_fkey"; columns: ["cliente_id"]; isOneToOne: false; referencedRelation: "clientes"; referencedColumns: ["id"] },
          { foreignKeyName: "ordenes_turno_id_fkey"; columns: ["turno_id"]; isOneToOne: true; referencedRelation: "turnos"; referencedColumns: ["id"] },
          { foreignKeyName: "ordenes_vehiculo_id_fkey"; columns: ["vehiculo_id"]; isOneToOne: false; referencedRelation: "vehiculos"; referencedColumns: ["id"] },
        ];
      };
      orden_items: {
        Row: {
          cantidad: number; created_at: string; descripcion: string; id: string; orden_id: string; precio_unitario: number;
          producto_id: string | null; servicio_id: string | null; subtotal: number; tipo: string;
        };
        Insert: {
          cantidad?: number; created_at?: string; descripcion: string; id?: string; orden_id: string; precio_unitario?: number;
          producto_id?: string | null; servicio_id?: string | null; tipo?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["orden_items"]["Row"], "subtotal">>;
        Relationships: [
          { foreignKeyName: "orden_items_orden_id_fkey"; columns: ["orden_id"]; isOneToOne: false; referencedRelation: "ordenes"; referencedColumns: ["id"] },
          { foreignKeyName: "orden_items_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "productos"; referencedColumns: ["id"] },
          { foreignKeyName: "orden_items_servicio_id_fkey"; columns: ["servicio_id"]; isOneToOne: false; referencedRelation: "servicios"; referencedColumns: ["id"] },
        ];
      };
      movimientos_stock: {
        Row: {
          cantidad: number; costo_unitario: number | null; creado_por: string | null; created_at: string; id: string; motivo: string | null;
          orden_id: string | null; producto_id: string; proveedor_id: string | null; tipo: string; compra_id: string | null;
        };
        Insert: {
          cantidad: number; costo_unitario?: number | null; creado_por?: string | null; created_at?: string; id?: string; motivo?: string | null;
          orden_id?: string | null; producto_id: string; proveedor_id?: string | null; tipo: string; compra_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["movimientos_stock"]["Row"]>;
        Relationships: [
          { foreignKeyName: "movimientos_stock_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "productos"; referencedColumns: ["id"] },
          { foreignKeyName: "movimientos_stock_proveedor_id_fkey"; columns: ["proveedor_id"]; isOneToOne: false; referencedRelation: "proveedores"; referencedColumns: ["id"] },
          { foreignKeyName: "movimientos_stock_orden_id_fkey"; columns: ["orden_id"]; isOneToOne: false; referencedRelation: "ordenes"; referencedColumns: ["id"] },
          { foreignKeyName: "movimientos_stock_compra_id_fkey"; columns: ["compra_id"]; isOneToOne: false; referencedRelation: "compras"; referencedColumns: ["id"] },
        ];
      };
      caja_movimientos: {
        Row: {
          categoria: string; concepto: string | null; creado_por: string | null; created_at: string; fecha: string; id: string; medio: string;
          monto: number; orden_id: string | null; tipo: string; compra_id: string | null;
        };
        Insert: {
          categoria?: string; concepto?: string | null; creado_por?: string | null; created_at?: string; fecha?: string; id?: string; medio?: string;
          monto: number; orden_id?: string | null; tipo: string; compra_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["caja_movimientos"]["Row"]>;
        Relationships: [
          { foreignKeyName: "caja_movimientos_orden_id_fkey"; columns: ["orden_id"]; isOneToOne: false; referencedRelation: "ordenes"; referencedColumns: ["id"] },
          { foreignKeyName: "caja_movimientos_compra_id_fkey"; columns: ["compra_id"]; isOneToOne: false; referencedRelation: "compras"; referencedColumns: ["id"] },
        ];
      };
      compras: {
        Row: {
          created_at: string; creado_por: string | null; estado: string; factura: string | null; fecha: string; id: string; medio: string;
          notas: string | null; numero: number; proveedor_id: string | null; total: number;
        };
        Insert: {
          created_at?: string; creado_por?: string | null; estado?: string; factura?: string | null; fecha?: string; id?: string; medio?: string;
          notas?: string | null; proveedor_id?: string | null; total?: number;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["compras"]["Row"], "numero">>;
        Relationships: [
          { foreignKeyName: "compras_proveedor_id_fkey"; columns: ["proveedor_id"]; isOneToOne: false; referencedRelation: "proveedores"; referencedColumns: ["id"] },
        ];
      };
      compra_items: {
        Row: {
          cantidad: number; categoria_gasto: string | null; compra_id: string; costo_unitario: number; descripcion: string; id: string;
          producto_id: string | null; subtotal: number; tipo: string;
        };
        Insert: {
          cantidad: number; categoria_gasto?: string | null; compra_id: string; costo_unitario: number; descripcion: string; id?: string;
          producto_id?: string | null; tipo: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["compra_items"]["Row"], "subtotal">>;
        Relationships: [
          { foreignKeyName: "compra_items_compra_id_fkey"; columns: ["compra_id"]; isOneToOne: false; referencedRelation: "compras"; referencedColumns: ["id"] },
          { foreignKeyName: "compra_items_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "productos"; referencedColumns: ["id"] },
        ];
      };
      disenos: {
        Row: {
          alto: number; ancho: number; created_at: string; creado_por: string | null; datos: Json; estado: string; fecha_publicacion: string | null;
          formato: string; id: string; preview_path: string | null; redes: string[]; texto_publicacion: string | null; titulo: string; updated_at: string;
        };
        Insert: {
          alto: number; ancho: number; created_at?: string; creado_por?: string | null; datos?: Json; estado?: string; fecha_publicacion?: string | null;
          formato?: string; id?: string; preview_path?: string | null; redes?: string[]; texto_publicacion?: string | null; titulo?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["disenos"]["Row"]>;
        Relationships: [];
      };
      turnos: {
        Row: {
          cliente_id: string; creado_por: string | null; created_at: string; estado: string; fin: string; id: string; inicio: string;
          notas: string | null; origen: string; precio: number | null; recurso_id: string; sena_vence_en: string | null;
          servicio_id: string; vehiculo_id: string | null;
        };
        Insert: {
          cliente_id: string; creado_por?: string | null; created_at?: string; estado?: string; fin: string; id?: string; inicio: string;
          notas?: string | null; origen?: string; precio?: number | null; recurso_id: string; sena_vence_en?: string | null;
          servicio_id: string; vehiculo_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["turnos"]["Row"]>;
        Relationships: [
          { foreignKeyName: "turnos_cliente_id_fkey"; columns: ["cliente_id"]; isOneToOne: false; referencedRelation: "clientes"; referencedColumns: ["id"] },
          { foreignKeyName: "turnos_recurso_id_fkey"; columns: ["recurso_id"]; isOneToOne: false; referencedRelation: "recursos"; referencedColumns: ["id"] },
          { foreignKeyName: "turnos_servicio_id_fkey"; columns: ["servicio_id"]; isOneToOne: false; referencedRelation: "servicios"; referencedColumns: ["id"] },
          { foreignKeyName: "turnos_vehiculo_id_fkey"; columns: ["vehiculo_id"]; isOneToOne: false; referencedRelation: "vehiculos"; referencedColumns: ["id"] },
        ];
      };
      vehiculos: {
        Row: {
          anio: number | null; cliente_id: string; created_at: string; id: string; marca: string | null; medida_cubierta: string | null;
          modelo: string | null; notas: string | null; patente: string | null;
        };
        Insert: {
          anio?: number | null; cliente_id: string; created_at?: string; id?: string; marca?: string | null; medida_cubierta?: string | null;
          modelo?: string | null; notas?: string | null; patente?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["vehiculos"]["Row"]>;
        Relationships: [
          { foreignKeyName: "vehiculos_cliente_id_fkey"; columns: ["cliente_id"]; isOneToOne: false; referencedRelation: "clientes"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: {
      productos_reservado: {
        Row: { producto_id: string | null; reservado: number | null };
        Relationships: [];
      };
    };
    Functions: {
      capacidad_libre: { Args: { p_excluir_turno?: string; p_fin: string; p_inicio: string }; Returns: boolean };
      campana_destinatarios: {
        Args: { p_campana: string };
        Returns: {
          cliente_id: string; nombre: string; telefono: string; ultima_visita: string | null; servicio: string | null; vehiculo: string | null;
          meses: number | null; enviado_en: string | null; ya_enviado: boolean; turno_proximo: string | null;
        }[];
      };
      disponibilidad: { Args: { p_fecha: string; p_servicio_id: string }; Returns: { hora: string }[] };
      registrar_compra: { Args: { p_datos: Json }; Returns: Json };
      anular_compra: { Args: { p_compra: string; p_motivo?: string }; Returns: undefined };
      cobrar_orden: { Args: { p_orden: string; p_pagos: Json; p_factura?: string }; Returns: Json };
      anular_orden: { Args: { p_orden: string; p_motivo?: string }; Returns: undefined };
      es_admin: { Args: never; Returns: boolean };
      es_staff: { Args: never; Returns: boolean };
      recurso_libre: { Args: { p_excluir_turno?: string; p_fin: string; p_inicio: string; p_tipo: string }; Returns: string };
      reservar_turno: {
        Args: {
          p_email?: string; p_inicio: string; p_marca?: string; p_modelo?: string; p_nombre: string; p_notas?: string;
          p_origen?: string; p_patente?: string; p_servicio_id: string; p_telefono: string;
        };
        Returns: Json;
      };
      rol_actual: { Args: never; Returns: string };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
