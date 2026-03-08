import { Clock } from "lucide-react";

const AdminPonto = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
    <Clock className="h-12 w-12 text-muted-foreground" />
    <h1 className="text-2xl font-bold text-foreground">Ponto</h1>
    <p className="text-muted-foreground text-sm max-w-md">
      Este módulo será implementado em breve. Aqui você poderá registrar entrada e saída.
    </p>
  </div>
);

export default AdminPonto;
