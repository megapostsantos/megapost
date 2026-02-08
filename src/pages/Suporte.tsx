import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useContent } from "@/contexts/ContentContext";
import EditableText from "@/components/EditableText";
import { Headphones, MessageSquare, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const Suporte = () => {
  const { content } = useContent();
  const { settings } = useSiteSettings();

  const megapostWpp = settings.whatsapp_megapost
    ? `https://wa.me/${settings.whatsapp_megapost}`
    : content.link_suporte_wpp;
  const mlWpp = settings.whatsapp_mercadolivre
    ? `https://wa.me/${settings.whatsapp_mercadolivre}`
    : "#";

  return (
    <main className="min-h-screen py-10 md:py-16">
      <div className="container max-w-3xl">
        <div className="text-center mb-10">
          <EditableText
            contentKey="sup_titulo"
            as="h1"
            className="text-3xl md:text-4xl font-black text-foreground mb-3"
          />
          <EditableText
            contentKey="sup_subtitulo"
            as="p"
            className="text-muted-foreground"
          />
        </div>

        {/* 3 Buttons */}
        <div className="flex flex-col gap-4 max-w-md mx-auto">
          <a
            href={megapostWpp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-semibold text-base bg-secondary text-secondary-foreground hover:brightness-95 shadow-sm transition-all"
          >
            <Headphones className="h-6 w-6" />
            Falar com a Mega POST
          </a>

          <a
            href={mlWpp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-semibold text-base bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
          >
            <MessageSquare className="h-6 w-6" />
            Falar com o Suporte do Mercado Livre
          </a>

          <Link
            to="/registrar-ocorrencia"
            className="inline-flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-semibold text-base border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all"
          >
            <AlertTriangle className="h-6 w-6" />
            Registrar Ocorrência
          </Link>
        </div>
      </div>
    </main>
  );
};

export default Suporte;
