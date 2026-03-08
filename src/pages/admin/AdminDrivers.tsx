import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/customSupabase";
import { Users, Plus, Search, Edit2, Check, X, Power, Camera, ChevronDown, ChevronUp, Flag, AlertTriangle, MessageCircle, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format, endOfMonth } from "date-fns";

const farolOptions = [
  { value: "VERDE", label: "Verde", color: "bg-green-500" },
  { value: "AMARELO", label: "Amarelo", color: "bg-yellow-400" },
  { value: "VERMELHO", label: "Vermelho", color: "bg-red-500" },
];

const tipoOptions = [
  { value: "ENVIOS_EXTRA", label: "Envios Extra (App)" },
  { value: "TRANSPORTADORA", label: "Transportadora" },
];

const AdminDrivers = () => {
  const { isAdmin } = useAuth();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Create form
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [placa, setPlaca] = useState("");
  const [tipo, setTipo] = useState("ENVIOS_EXTRA");
  const [transportadoraNome, setTransportadoraNome] = useState("");
  const [farol, setFarol] = useState("VERDE");
  const [observacao, setObservacao] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editPlaca, setEditPlaca] = useState("");
  const [editTipo, setEditTipo] = useState("ENVIOS_EXTRA");
  const [editTransportadoraNome, setEditTransportadoraNome] = useState("");
  const [editFarol, setEditFarol] = useState("VERDE");
  const [editObservacao, setEditObservacao] = useState("");

  // Metrics
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [driverMetrics, setDriverMetrics] = useState<any>(null);
  const [metricsMonth, setMetricsMonth] = useState(format(new Date(), "yyyy-MM"));

  useEffect(() => { loadDrivers(); }, []);

  const loadDrivers = async () => {
    const { data } = await supabase.from("drivers").select("*").order("nome");
    setDrivers(data || []);
    setLoading(false);
  };

  const uploadPhoto = async (file: File, driverId: string): Promise<string | null> => {
    try {
      const ext = file.name.split(".").pop();
      const path = `${driverId}.${ext}`;
      const { error } = await supabase.storage.from("driver-photos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("driver-photos").getPublicUrl(path);
      return urlData.publicUrl + "?t=" + Date.now();
    } catch (err: any) {
      toast.error("Erro no upload da foto: " + err.message);
      return null;
    }
  };

  const handleCreate = async () => {
    if (!nome.trim()) { toast.error("Nome é obrigatório."); return; }
    if (!telefone.trim()) { toast.error("Telefone é obrigatório."); return; }
    const photoFile = fileInputRef.current?.files?.[0];
    if (!photoFile) { toast.error("Foto é OBRIGATÓRIA para identificação."); return; }
    if (tipo === "TRANSPORTADORA" && !transportadoraNome.trim()) { toast.error("Nome da transportadora é obrigatório."); return; }

    setSubmitting(true);
    const { data, error } = await supabase
      .from("drivers")
      .insert({
        nome: nome.trim(),
        telefone: telefone.trim(),
        placa: placa.trim() || null,
        tipo,
        transportadora_nome: tipo === "TRANSPORTADORA" ? transportadoraNome.trim() : null,
        farol,
        observacao: observacao.trim() || null,
      } as any)
      .select()
      .single();

    if (error) { toast.error(error.message); setSubmitting(false); return; }

    if (data) {
      const url = await uploadPhoto(photoFile, data.id);
      if (url) {
        await supabase.from("drivers").update({ foto_url: url } as any).eq("id", data.id);
      }
    }

    toast.success("Motorista cadastrado!");
    setNome(""); setTelefone(""); setPlaca(""); setTipo("ENVIOS_EXTRA");
    setTransportadoraNome(""); setFarol("VERDE"); setObservacao("");
    setShowForm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await loadDrivers();
    setSubmitting(false);
  };

  const startEdit = (driver: any) => {
    setEditingId(driver.id);
    setEditNome(driver.nome);
    setEditTelefone(driver.telefone || "");
    setEditPlaca(driver.placa || "");
    setEditTipo(driver.tipo || "ENVIOS_EXTRA");
    setEditTransportadoraNome(driver.transportadora_nome || "");
    setEditFarol(driver.farol || "VERDE");
    setEditObservacao(driver.observacao || "");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editNome.trim() || !editTelefone.trim()) {
      toast.error("Nome e telefone são obrigatórios.");
      return;
    }
    if (editTipo === "TRANSPORTADORA" && !editTransportadoraNome.trim()) {
      toast.error("Nome da transportadora é obrigatório.");
      return;
    }
    const { error } = await supabase
      .from("drivers")
      .update({
        nome: editNome.trim(),
        telefone: editTelefone.trim(),
        placa: editPlaca.trim() || null,
        tipo: editTipo,
        transportadora_nome: editTipo === "TRANSPORTADORA" ? editTransportadoraNome.trim() : null,
        farol: editFarol,
        observacao: editObservacao.trim() || null,
      } as any)
      .eq("id", editingId);
    if (error) { toast.error(error.message); } else {
      toast.success("Motorista atualizado!");
      setEditingId(null);
      await loadDrivers();
    }
  };

  const handleEditPhoto = async (e: React.ChangeEvent<HTMLInputElement>, driverId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadPhoto(file, driverId);
    if (url) {
      await supabase.from("drivers").update({ foto_url: url } as any).eq("id", driverId);
      toast.success("Foto atualizada!");
      await loadDrivers();
    }
  };

  const toggleAtivo = async (driver: any) => {
    const { error } = await supabase.from("drivers").update({ ativo: !driver.ativo }).eq("id", driver.id);
    if (error) { toast.error(error.message); } else {
      toast.success(driver.ativo ? "Motorista desativado" : "Motorista reativado");
      await loadDrivers();
    }
  };

  const loadDriverMetrics = useCallback(async (driverId: string, forceOpen = false) => {
    if (!forceOpen && expandedDriver === driverId) { setExpandedDriver(null); setDriverMetrics(null); return; }
    setExpandedDriver(driverId);
    setDriverMetrics(null);

    // Use v_driver_monthly view for month metrics
    const [{ data: monthData }, { data: allRotas }, { data: allEstoque }] = await Promise.all([
      supabase.from("v_driver_monthly" as any).select("*")
        .eq("driver_id", driverId).eq("month_id", metricsMonth).maybeSingle(),
      supabase.from("rotas").select("id, status, hora_saida, dia_id").eq("driver_id", driverId),
      supabase.from("estoque").select("id, tipo_insucesso, rota_id").eq("origem_driver_id", driverId),
    ]);

    // Get month estoque using dia_ids from dias table
    const monthStart = `${metricsMonth}-01`;
    const monthEnd = format(endOfMonth(new Date(metricsMonth + "-01")), "yyyy-MM-dd");
    const { data: diasDoMes } = await supabase.from("dias").select("id")
      .gte("data", monthStart).lte("data", monthEnd);
    const diaIds = new Set((diasDoMes || []).map(d => d.id));

    // Filter estoque by rota's dia_id (through allRotas)
    const rotaIdToDia = new Map((allRotas || []).map((r: any) => [r.id, r.dia_id]));
    const monthEstoque = (allEstoque || []).filter((e: any) => {
      const rotaDia = rotaIdToDia.get(e.rota_id);
      return rotaDia && diaIds.has(rotaDia);
    });

    const countByStatus = (arr: any[], status: string) => arr.filter((r: any) => r.status === status).length;
    const countWithSaida = (arr: any[]) => arr.filter((r: any) => r.hora_saida).length;

    const md = monthData as any;
    setDriverMetrics({
      mesRotas: md?.atribuidas || 0,
      mesComSaida: md?.com_saida || 0,
      mesFinalizadas: md?.finalizadas || 0,
      mesInsucessos: monthEstoque.length,
      mesAvarias: monthEstoque.filter((e: any) => e.tipo_insucesso === "AVARIA").length,
      mesFaltantes: monthEstoque.filter((e: any) => e.tipo_insucesso === "FALTANTE_BAIXADO").length,
      totalRotas: allRotas?.length || 0,
      totalComSaida: countWithSaida(allRotas || []),
      totalFinalizadas: countByStatus(allRotas || [], "Finalizada"),
      totalInsucessos: allEstoque?.length || 0,
      totalAvarias: allEstoque?.filter((e: any) => e.tipo_insucesso === "AVARIA").length || 0,
      totalFaltantes: allEstoque?.filter((e: any) => e.tipo_insucesso === "FALTANTE_BAIXADO").length || 0,
      dateMethod: "v_driver_monthly (dia_id)",
    });
  }, [expandedDriver, metricsMonth]);

  const filtered = drivers.filter(
    (d) => d.nome.toLowerCase().includes(search.toLowerCase()) || (d.telefone && d.telefone.includes(search))
  );

  const getFarolDot = (f: string) => {
    const opt = farolOptions.find(o => o.value === f);
    return <span className={`inline-block h-3 w-3 rounded-full ${opt?.color || "bg-green-500"}`} title={`Farol: ${opt?.label || f}`} />;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Motoristas</h1>
          <p className="text-sm text-muted-foreground">
            {drivers.filter((d) => d.ativo).length} ativos de {drivers.length} cadastrados
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Cadastro de Motorista</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="11 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>Placa</Label>
                <Input value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="ABC-1234" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Motorista *</Label>
              <div className="flex gap-3">
                {tipoOptions.map(t => (
                  <label key={t.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={tipo === t.value} onChange={() => setTipo(t.value)} className="accent-primary" />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
            {tipo === "TRANSPORTADORA" && (
              <div className="space-y-2">
                <Label>Nome da Transportadora *</Label>
                <Input value={transportadoraNome} onChange={(e) => setTransportadoraNome(e.target.value)} placeholder="Ex: JadLog" />
              </div>
            )}

            <div className="space-y-2">
              <Label>Farol *</Label>
              <div className="flex gap-3">
                {farolOptions.map(f => (
                  <label key={f.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={farol === f.value} onChange={() => setFarol(f.value)} className="accent-primary" />
                    <span className={`inline-block h-3 w-3 rounded-full ${f.color}`} />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Foto * (obrigatória para identificação)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:opacity-90"
              />
            </div>

            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Notas sobre o motorista..." rows={2} />
            </div>

            <Button onClick={handleCreate} disabled={submitting} className="w-full">
              {submitting ? "Salvando..." : "Cadastrar Motorista"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        {filtered.map((d) => (
          <Card key={d.id} className={`p-3 ${!d.ativo ? "opacity-50" : ""}`}>
            {editingId === d.id ? (
              <div className="space-y-2">
                <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} placeholder="Nome" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} placeholder="Telefone *" />
                  <Input value={editPlaca} onChange={(e) => setEditPlaca(e.target.value)} placeholder="Placa" />
                </div>
                <div className="flex gap-3">
                  {tipoOptions.map(t => (
                    <label key={t.value} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="radio" checked={editTipo === t.value} onChange={() => setEditTipo(t.value)} className="accent-primary" />
                      {t.label}
                    </label>
                  ))}
                </div>
                {editTipo === "TRANSPORTADORA" && (
                  <Input value={editTransportadoraNome} onChange={(e) => setEditTransportadoraNome(e.target.value)} placeholder="Transportadora *" />
                )}
                <div className="flex gap-3">
                  {farolOptions.map(f => (
                    <label key={f.value} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="radio" checked={editFarol === f.value} onChange={() => setEditFarol(f.value)} className="accent-primary" />
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${f.color}`} />
                      {f.label}
                    </label>
                  ))}
                </div>
                <Textarea value={editObservacao} onChange={(e) => setEditObservacao(e.target.value)} placeholder="Observação" rows={2} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit}><Check className="h-3 w-3 mr-1" /> Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-3 w-3 mr-1" /> Cancelar</Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative group shrink-0">
                      {d.foto_url ? (
                        <img src={d.foto_url} alt={d.nome} className="h-12 w-12 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center relative">
                          <Users className="h-6 w-6 text-muted-foreground" />
                          <Camera className="h-4 w-4 text-muted-foreground absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5" />
                        </div>
                      )}
                      <button
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file"; input.accept = "image/*"; input.capture = "environment";
                          input.onchange = (e) => handleEditPhoto(e as any, d.id);
                          input.click();
                        }}
                        className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Alterar foto"
                      >
                        <Camera className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {getFarolDot(d.farol || "VERDE")}
                        <p className="font-medium text-sm truncate">{d.nome}</p>
                        {!d.ativo && <Badge variant="outline" className="text-[10px] px-1">Inativo</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {[d.telefone, d.placa].filter(Boolean).join(" • ") || "Sem contato"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {d.tipo === "TRANSPORTADORA" ? `Transportadora: ${d.transportadora_nome || "—"}` : "Envios Extra"}
                        {d.observacao && ` • ${d.observacao}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {d.telefone && (() => {
                      const clean = (d.telefone || "").replace(/\D/g, "");
                      return clean ? (
                        <a href={`https://wa.me/55${clean}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700 p-1" title="WhatsApp">
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      ) : null;
                    })()}
                    <button onClick={() => loadDriverMetrics(d.id)} className="text-muted-foreground hover:text-foreground p-1" title="Ver métricas">
                      {expandedDriver === d.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button onClick={() => toggleAtivo(d)} className="text-muted-foreground hover:text-foreground p-1" title={d.ativo ? "Desativar" : "Ativar"}>
                      <Power className="h-4 w-4" />
                    </button>
                    <button onClick={() => startEdit(d)} className="text-muted-foreground hover:text-foreground p-1">
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {d.farol === "VERMELHO" && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 p-1.5 rounded">
                    <AlertTriangle className="h-3 w-3" /> Motorista BLOQUEADO
                  </div>
                )}
              </div>
            )}

            {expandedDriver === d.id && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-muted-foreground">Mês:</span>
                  <Input type="month" value={metricsMonth} onChange={(e) => { setMetricsMonth(e.target.value); setTimeout(() => loadDriverMetrics(d.id, true), 50); }} className="h-7 text-xs w-36" />
                </div>
                {driverMetrics ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mês selecionado</p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                      <div><p className="text-sm font-bold text-foreground">{driverMetrics.mesRotas}</p><p className="text-[10px] text-muted-foreground">Atribuídas</p></div>
                      <div><p className="text-sm font-bold text-foreground">{driverMetrics.mesComSaida}</p><p className="text-[10px] text-muted-foreground">Com saída</p></div>
                      <div><p className="text-sm font-bold text-foreground">{driverMetrics.mesFinalizadas}</p><p className="text-[10px] text-muted-foreground">Finalizadas</p></div>
                      <div><p className="text-sm font-bold text-foreground">{driverMetrics.mesInsucessos}</p><p className="text-[10px] text-muted-foreground">Insucessos</p></div>
                      <div><p className="text-sm font-bold text-foreground">{driverMetrics.mesFaltantes}</p><p className="text-[10px] text-muted-foreground">Faltantes</p></div>
                     <div><p className="text-sm font-bold text-red-500">{driverMetrics.mesAvarias}</p><p className="text-[10px] text-muted-foreground">Avarias</p></div>
                    </div>
                    {driverMetrics.dateMethod && <p className="text-[9px] text-muted-foreground/50 mt-1">Filtro mensal usando: {driverMetrics.dateMethod}</p>}
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Histórico total</p>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                        <div><p className="text-sm font-bold text-foreground">{driverMetrics.totalRotas}</p><p className="text-[10px] text-muted-foreground">Atribuídas</p></div>
                        <div><p className="text-sm font-bold text-foreground">{driverMetrics.totalComSaida}</p><p className="text-[10px] text-muted-foreground">Com saída</p></div>
                        <div><p className="text-sm font-bold text-foreground">{driverMetrics.totalFinalizadas}</p><p className="text-[10px] text-muted-foreground">Finalizadas</p></div>
                        <div><p className="text-sm font-bold text-foreground">{driverMetrics.totalInsucessos}</p><p className="text-[10px] text-muted-foreground">Insucessos</p></div>
                        <div><p className="text-sm font-bold text-foreground">{driverMetrics.totalFaltantes}</p><p className="text-[10px] text-muted-foreground">Faltantes</p></div>
                        <div><p className="text-sm font-bold text-red-500">{driverMetrics.totalAvarias}</p><p className="text-[10px] text-muted-foreground">Avarias</p></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center py-2"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" /></div>
                )}
              </div>
            )}
          </Card>
        ))}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {search ? "Nenhum motorista encontrado." : "Nenhum motorista cadastrado."}
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminDrivers;
