import { Construction } from "lucide-react";

const AdminControle = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
    <Construction className="h-12 w-12 text-muted-foreground" />
    <h1 className="text-2xl font-bold text-foreground">Controle Operacional</h1>
    <p className="text-muted-foreground text-sm max-w-md">
      Este módulo será implementado em breve. Aqui você encontrará Estoque, Ocorrências, Pacotes fora de rota e Divergências.
    </p>
  </div>
);

export default AdminControle;
