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
      drivers: {
        Row: {
          ativo: boolean
          created_at: string
          foto_url: string | null
          id: string
          nome: string
          placa: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          foto_url?: string | null
          id?: string
          nome: string
          placa?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          foto_url?: string | null
          id?: string
          nome?: string
          placa?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      estoque: {
        Row: {
          codigo_pacote: string
          created_at: string
          data_entrada: string
          dia_id: string | null
          enviado_em: string | null
          id: string
          rota_id: string | null
          rota_origem: string | null
          status: string
          tipo_insucesso: string
          updated_at: string
        }
        Insert: {
          codigo_pacote: string
          created_at?: string
          data_entrada?: string
          dia_id?: string | null
          enviado_em?: string | null
          id?: string
          rota_id?: string | null
          rota_origem?: string | null
          status?: string
          tipo_insucesso: string
          updated_at?: string
        }
        Update: {
          codigo_pacote?: string
          created_at?: string
          data_entrada?: string
          dia_id?: string | null
          enviado_em?: string | null
          id?: string
          rota_id?: string | null
          rota_origem?: string | null
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
            foreignKeyName: "estoque_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
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
            foreignKeyName: "rotas_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
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
