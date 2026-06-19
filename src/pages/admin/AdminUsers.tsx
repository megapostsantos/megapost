import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/customSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  UserPlus, Search, Shield, ShieldCheck, Ban, CheckCircle, KeyRound,
  Eye, Upload, Camera, X,
} from "lucide-react";

const FUNCTION_URL = `https://otfjcpajobmjlwitgnqi.supabase.co/functions/v1/manage-users`;

interface UserRow {
  id: string;
  email: string;
  role: "admin" | "operador" | null;
  created_at: string;
  banned: boolean;
  last_sign_in_at: string | null;
  nome: string | null;
  telefone: string | null;
  endereco: string | null;
  documento_foto_url: string | null;
  display_name: string | null;
}

const AdminUsers = () => {
  const { session } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "operador">("operador");
  const [submitting, setSubmitting] = useState(false);

  // Reset password dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  // Profile detail dialog
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editEndereco, setEditEndereco] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const callFn = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro desconhecido");
      return data;
    },
    [session]
  );

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await callFn({ action: "list" });
      setUsers(data.users || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [callFn]);

  useEffect(() => {
    if (session) loadUsers();
  }, [session, loadUsers]);

  const handleCreate = async () => {
    if (!newEmail || !newPassword) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    try {
      setSubmitting(true);
      await callFn({ action: "create", email: newEmail, password: newPassword, role: newRole });
      toast.success("Usuário criado com sucesso!");
      setDialogOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewRole("operador");
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await callFn({ action: "update_role", user_id: userId, role });
      toast.success("Role atualizada!");
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleBan = async (userId: string, ban: boolean) => {
    try {
      await callFn({ action: "toggle_ban", user_id: userId, ban });
      toast.success(ban ? "Usuário desativado." : "Usuário reativado.");
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUserId || !resetPassword || resetPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    try {
      setSubmitting(true);
      await callFn({ action: "reset_password", user_id: resetUserId, new_password: resetPassword });
      toast.success("Senha redefinida com sucesso!");
      setResetDialogOpen(false);
      setResetPassword("");
      setResetUserId(null);
      setResetEmail("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openProfile = (u: UserRow) => {
    setSelectedUser(u);
    setEditNome(u.nome || "");
    setEditTelefone(u.telefone || "");
    setEditEndereco(u.endereco || "");
    setProfileDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      await callFn({
        action: "update_profile",
        user_id: selectedUser.id,
        nome: editNome,
        telefone: editTelefone,
        endereco: editEndereco,
      });
      toast.success("Dados salvos com sucesso!");
      setProfileDialogOpen(false);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedUser || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 5MB).");
      return;
    }

    try {
      setUploadingDoc(true);
      const ext = file.name.split(".").pop() || "jpg";
      const path = `documentos-rg/${selectedUser.id}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("documentos")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("documentos")
        .getPublicUrl(path);

      await callFn({
        action: "update_profile",
        user_id: selectedUser.id,
        documento_foto_url: urlData.publicUrl,
      });

      toast.success("Documento enviado!");
      setSelectedUser({ ...selectedUser, documento_foto_url: urlData.publicUrl });
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar documento.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRemoveDoc = async () => {
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      await callFn({
        action: "update_profile",
        user_id: selectedUser.id,
        documento_foto_url: "",
      });
      setSelectedUser({ ...selectedUser, documento_foto_url: null });
      toast.success("Documento removido.");
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = users.filter((u) => {
    const term = search.toLowerCase();
    const matchSearch =
      u.email?.toLowerCase().includes(term) ||
      u.nome?.toLowerCase().includes(term) ||
      u.telefone?.toLowerCase().includes(term);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-sm text-muted-foreground">Crie, edite e gerencie permissões e dados pessoais</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filtrar role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="operador">Operador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum usuário encontrado.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="border rounded-lg hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome / E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{u.nome || "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{u.telefone || "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role || "operador"}
                        onValueChange={(v) => handleRoleChange(u.id, v)}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <span className="flex items-center gap-1.5">
                              <ShieldCheck className="h-3 w-3" /> Admin
                            </span>
                          </SelectItem>
                          <SelectItem value="operador">
                            <span className="flex items-center gap-1.5">
                              <Shield className="h-3 w-3" /> Operador
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {u.banned ? (
                        <Badge variant="destructive" className="text-xs">Inativo</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openProfile(u)} className="h-8 gap-1.5 text-xs">
                        <Eye className="h-3.5 w-3.5" /> Perfil
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setResetUserId(u.id);
                          setResetEmail(u.email);
                          setResetPassword("");
                          setResetDialogOpen(true);
                        }}
                        className="h-8 gap-1.5 text-xs"
                      >
                        <KeyRound className="h-3.5 w-3.5" /> Resetar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleBan(u.id, !u.banned)}
                        className="h-8 gap-1.5 text-xs"
                      >
                        {u.banned ? (
                          <><CheckCircle className="h-3.5 w-3.5" /> Ativar</>
                        ) : (
                          <><Ban className="h-3.5 w-3.5" /> Desativar</>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((u) => (
              <div key={u.id} className="border rounded-lg p-4 space-y-3 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{u.nome || u.email}</p>
                    {u.nome && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                    {u.telefone && <p className="text-xs text-muted-foreground">{u.telefone}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {u.banned ? (
                      <Badge variant="destructive" className="text-xs">Inativo</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Ativo</Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs shrink-0">Role:</Label>
                  <Select
                    value={u.role || "operador"}
                    onValueChange={(v) => handleRoleChange(u.id, v)}
                  >
                    <SelectTrigger className="h-9 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </span>
                      </SelectItem>
                      <SelectItem value="operador">
                        <span className="flex items-center gap-1.5">
                          <Shield className="h-3 w-3" /> Operador
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" onClick={() => openProfile(u)} className="h-9 gap-1 text-xs">
                    <Eye className="h-3.5 w-3.5" /> Perfil
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setResetUserId(u.id);
                      setResetEmail(u.email);
                      setResetPassword("");
                      setResetDialogOpen(true);
                    }}
                    className="h-9 gap-1 text-xs"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Senha
                  </Button>
                  <Button
                    variant={u.banned ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleBan(u.id, !u.banned)}
                    className="h-9 gap-1 text-xs"
                  >
                    {u.banned ? (
                      <><CheckCircle className="h-3.5 w-3.5" /> Ativar</>
                    ) : (
                      <><Ban className="h-3.5 w-3.5" /> Desativar</>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar novo usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha temporária</Label>
              <Input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Definir nova senha para <span className="font-medium text-foreground">{resetEmail}</span>
            </p>
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input
                type="text"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleResetPassword} disabled={submitting}>
              {submitting ? "Salvando..." : "Redefinir Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile detail dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Perfil do Usuário</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-5 py-2">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium">{selectedUser.email}</p>
                <p className="text-xs text-muted-foreground">
                  Criado em: {new Date(selectedUser.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <Input
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={editTelefone}
                    onChange={(e) => setEditTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Textarea
                    value={editEndereco}
                    onChange={(e) => setEditEndereco(e.target.value)}
                    placeholder="Endereço completo"
                    rows={2}
                  />
                </div>
              </div>

              {/* Document photo section */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Documento (RG / CPF)
                </Label>

                {selectedUser.documento_foto_url ? (
                  <div className="space-y-2">
                    <div className="relative border rounded-lg overflow-hidden bg-muted">
                      <img
                        src={selectedUser.documento_foto_url.replace(
                          "/storage/v1/object/public/",
                          "/storage/v1/render/image/public/"
                        ) + (selectedUser.documento_foto_url.includes("?") ? "&" : "?") + "width=600&quality=70"}
                        alt="Documento"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (img.src !== selectedUser.documento_foto_url) img.src = selectedUser.documento_foto_url;
                        }}
                        className="w-full max-h-64 object-contain"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 h-7 w-7 p-0"
                        onClick={handleRemoveDoc}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      {uploadingDoc ? "Enviando..." : "Clique ou tire uma foto do documento"}
                    </span>
                    <span className="text-xs text-muted-foreground/60 mt-1">JPG, PNG — máx 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleDocUpload}
                      disabled={uploadingDoc}
                    />
                  </label>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProfile} disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar Dados"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
