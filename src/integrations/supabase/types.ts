export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          registro_id: string
          tabela: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id: string
          tabela: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id?: string
          tabela?: string
          user_id?: string | null
        }
        Relationships: []
      }
      conferencias: {
        Row: {
          created_at: string
          id: string
          qtd_app: number | null
          qtd_contada: number | null
          resultado: string | null
          rota_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          qtd_app?: number | null
          qtd_contada?: number | null
          resultado?: string | null
          rota_id: string
        }
        Update: {
          created_at?: string
          id?: string
          qtd_app?: number | null
          qtd_contada?: number | null
          resultado?: string | null
          rota_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conferencias_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conferencias_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "v_routes_monthly"
            referencedColumns: ["route_id"]
          },
        ]
      }
      dias: {
        Row: {
          am0_previsto: number
          am1_previsto: number
          created_at: string
          created_by: string | null
          data: string
          id: string
          status: string
        }
        Insert: {
          am0_previsto?: number
          am1_previsto?: number
          created_at?: string
          created_by?: string | null
          data: string
          id?: string
          status?: string
        }
        Update: {
          am0_previsto?: number
          am1_previsto?: number
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          created_at: string
          data_referencia: string | null
          financeiro_entrada_id: string | null
          financeiro_saida_id: string | null
          id: string
          observacao: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          created_at?: string
          data_referencia?: string | null
          financeiro_entrada_id?: string | null
          financeiro_saida_id?: string | null
          id?: string
          observacao?: string | null
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          created_at?: string
          data_referencia?: string | null
          financeiro_entrada_id?: string | null
          financeiro_saida_id?: string | null
          id?: string
          observacao?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_financeiro_entrada_id_fkey"
            columns: ["financeiro_entrada_id"]
            isOneToOne: false
            referencedRelation: "financeiro_entradas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_financeiro_saida_id_fkey"
            columns: ["financeiro_saida_id"]
            isOneToOne: false
            referencedRelation: "financeiro_saidas"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          ativo: boolean
          created_at: string
          farol: string
          foto_url: string | null
          id: string
          nome: string
          observacao: string | null
          placa: string | null
          telefone: string | null
          tipo: string
          transportadora_nome: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          farol?: string
          foto_url?: string | null
          id?: string
          nome: string
          observacao?: string | null
          placa?: string | null
          telefone?: string | null
          tipo?: string
          transportadora_nome?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          farol?: string
          foto_url?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          placa?: string | null
          telefone?: string | null
          tipo?: string
          transportadora_nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      estoque: {
        Row: {
          codigo_pacote: string
          created_at: string
          data_entrada: string
          destino_saida: string | null
          dia_id: string | null
          enviado_em: string | null
          id: string
          motivo: string | null
          origem_driver_id: string | null
          retirada_id: string | null
          rota_id: string | null
          rota_origem: string | null
          saida_route_id: string | null
          status: string
          tipo_insucesso: string
          updated_at: string
        }
        Insert: {
          codigo_pacote: string
          created_at?: string
          data_entrada?: string
          destino_saida?: string | null
          dia_id?: string | null
          enviado_em?: string | null
          id?: string
          motivo?: string | null
          origem_driver_id?: string | null
          retirada_id?: string | null
          rota_id?: string | null
          rota_origem?: string | null
          saida_route_id?: string | null
          status?: string
          tipo_insucesso: string
          updated_at?: string
        }
        Update: {
          codigo_pacote?: string
          created_at?: string
          data_entrada?: string
          destino_saida?: string | null
          dia_id?: string | null
          enviado_em?: string | null
          id?: string
          motivo?: string | null
          origem_driver_id?: string | null
          retirada_id?: string | null
          rota_id?: string | null
          rota_origem?: string | null
          saida_route_id?: string | null
          status?: string
          tipo_insucesso?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_dia_id_fkey"
            columns: ["dia_id"]
            isOneToOne: false
            referencedRelation: "dias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_dia_id_fkey"
            columns: ["dia_id"]
            isOneToOne: false
            referencedRelation: "v_routes_monthly"
            referencedColumns: ["dia_id"]
          },
          {
            foreignKeyName: "estoque_origem_driver_id_fkey"
            columns: ["origem_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_retirada_id_fkey"
            columns: ["retirada_id"]
            isOneToOne: false
            referencedRelation: "stock_pickups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "v_routes_monthly"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "estoque_saida_route_id_fkey"
            columns: ["saida_route_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_saida_route_id_fkey"
            columns: ["saida_route_id"]
            isOneToOne: false
            referencedRelation: "v_routes_monthly"
            referencedColumns: ["route_id"]
          },
        ]
      }
      finance_entries: {
        Row: {
          categoria: string | null
          created_at: string
          data: string
          descricao: string
          id: string
          kind: string
          observacao: string | null
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data?: string
          descricao: string
          id?: string
          kind?: string
          observacao?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          kind?: string
          observacao?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      financeiro_entradas: {
        Row: {
          created_at: string
          data_referencia: string
          descricao: string
          dia_id: string | null
          documento_id: string | null
          id: string
          observacao: string | null
          recebido_em: string | null
          status: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_referencia?: string
          descricao: string
          dia_id?: string | null
          documento_id?: string | null
          id?: string
          observacao?: string | null
          recebido_em?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          data_referencia?: string
          descricao?: string
          dia_id?: string | null
          documento_id?: string | null
          id?: string
          observacao?: string | null
          recebido_em?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_entradas_dia_id_fkey"
            columns: ["dia_id"]
            isOneToOne: false
            referencedRelation: "dias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_entradas_dia_id_fkey"
            columns: ["dia_id"]
            isOneToOne: false
            referencedRelation: "v_routes_monthly"
            referencedColumns: ["dia_id"]
          },
          {
            foreignKeyName: "financeiro_entradas_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_saidas: {
        Row: {
          created_at: string
          data_referencia: string
          descricao: string
          documento_id: string | null
          id: string
          observacao: string | null
          pago_em: string | null
          status: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_referencia?: string
          descricao: string
          documento_id?: string | null
          id?: string
          observacao?: string | null
          pago_em?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          data_referencia?: string
          descricao?: string
          documento_id?: string | null
          id?: string
          observacao?: string | null
          pago_em?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_saidas_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome_motorista: string | null
          nx_codigo_oc: string | null
          origem: string
          placa_veiculo: string | null
          resolvido_em: string | null
          rota_id: string | null
          rota_numero: string | null
          status: string
          tipo: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome_motorista?: string | null
          nx_codigo_oc?: string | null
          origem?: string
          placa_veiculo?: string | null
          resolvido_em?: string | null
          rota_id?: string | null
          rota_numero?: string | null
          status?: string
          tipo: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome_motorista?: string | null
          nx_codigo_oc?: string | null
          origem?: string
          placa_veiculo?: string | null
          resolvido_em?: string | null
          rota_id?: string | null
          rota_numero?: string | null
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "v_routes_monthly"
            referencedColumns: ["route_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      rotas: {
        Row: {
          created_at: string
          dia_id: string
          driver_id: string | null
          hora_chegada: string | null
          hora_saida: string | null
          id: string
          mx_codigo: string | null
          nx_codigo: string | null
          observacoes: string | null
          periodo: string
          qr_codigo: string | null
          rota_codigo: string
          status: string
          tempo_atendimento_min: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dia_id: string
          driver_id?: string | null
          hora_chegada?: string | null
          hora_saida?: string | null
          id?: string
          mx_codigo?: string | null
          nx_codigo?: string | null
          observacoes?: string | null
          periodo: string
          qr_codigo?: string | null
          rota_codigo: string
          status?: string
          tempo_atendimento_min?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dia_id?: string
          driver_id?: string | null
          hora_chegada?: string | null
          hora_saida?: string | null
          id?: string
          mx_codigo?: string | null
          nx_codigo?: string | null
          observacoes?: string | null
          periodo?: string
          qr_codigo?: string | null
          rota_codigo?: string
          status?: string
          tempo_atendimento_min?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotas_dia_id_fkey"
            columns: ["dia_id"]
            isOneToOne: false
            referencedRelation: "dias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_dia_id_fkey"
            columns: ["dia_id"]
            isOneToOne: false
            referencedRelation: "v_routes_monthly"
            referencedColumns: ["dia_id"]
          },
          {
            foreignKeyName: "rotas_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      route_event_log: {
        Row: {
          action: string
          actor_role: string
          created_at: string
          id: string
          payload_json: Json | null
          route_id: string
        }
        Insert: {
          action: string
          actor_role?: string
          created_at?: string
          id?: string
          payload_json?: Json | null
          route_id: string
        }
        Update: {
          action?: string
          actor_role?: string
          created_at?: string
          id?: string
          payload_json?: Json | null
          route_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_event_log_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_event_log_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "v_routes_monthly"
            referencedColumns: ["route_id"]
          },
        ]
      }
      sellers: {
        Row: {
          ativo: boolean
          cidade: string | null
          cnpj: string | null
          created_at: string
          id: string
          nome: string
          observacao: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          nome: string
          observacao?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          nome?: string
          observacao?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      stock_pickups: {
        Row: {
          created_at: string
          dia_id: string | null
          id: string
          motorista_nome: string
          observacao: string | null
          placa: string | null
          quantidade_informada: number | null
          telefone: string | null
          tipo_retirada: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dia_id?: string | null
          id?: string
          motorista_nome: string
          observacao?: string | null
          placa?: string | null
          quantidade_informada?: number | null
          telefone?: string | null
          tipo_retirada?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dia_id?: string | null
          id?: string
          motorista_nome?: string
          observacao?: string | null
          placa?: string | null
          quantidade_informada?: number | null
          telefone?: string | null
          tipo_retirada?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_pickups_dia_id_fkey"
            columns: ["dia_id"]
            isOneToOne: false
            referencedRelation: "dias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_pickups_dia_id_fkey"
            columns: ["dia_id"]
            isOneToOne: false
            referencedRelation: "v_routes_monthly"
            referencedColumns: ["dia_id"]
          },
        ]
      }
      training_content: {
        Row: {
          content: string
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_driver_monthly: {
        Row: {
          atribuidas: number | null
          com_saida: number | null
          driver_id: string | null
          finalizadas: number | null
          month_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rotas_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_routes_monthly: {
        Row: {
          dia_data: string | null
          dia_id: string | null
          driver_id: string | null
          hora_chegada: string | null
          hora_saida: string | null
          month_id: string | null
          nx_codigo: string | null
          periodo: string | null
          qr_codigo: string | null
          rota_codigo: string | null
          route_id: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rotas_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "operador"],
    },
  },
} as const
