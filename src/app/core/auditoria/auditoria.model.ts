export interface EventoAuditoria {
  idEvento: string;
  idUsuarioActor: string | null;
  idUsuarioAfectado: string | null;
  tipoEvento: string;
  resultado: string;
  metadatosMinimos: Record<string, unknown> | null;
  fechaEvento: string;
}

export interface PaginaEventosAuditoria {
  datos: EventoAuditoria[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface FiltrosAuditoria {
  tipoEvento?: string;
  resultado?: string;
  idUsuario?: string;
  desde?: string;
  hasta?: string;
  pagina?: number;
  porPagina?: number;
}
