import { BookOpen } from "lucide-react";

const AdminTreinamento = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
    <BookOpen className="h-12 w-12 text-muted-foreground" />
    <h1 className="text-2xl font-bold text-foreground">Treinamento</h1>
    <p className="text-muted-foreground text-sm max-w-md">
      Este módulo será implementado em breve. Aqui você encontrará manuais e materiais de treinamento.
    </p>
  </div>
);

export default AdminTreinamento;
