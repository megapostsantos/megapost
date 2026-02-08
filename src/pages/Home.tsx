import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useContent } from "@/contexts/ContentContext";
import EditableText from "@/components/EditableText";
import { MessageSquare, Headphones, ArrowDown, ShieldCheck, Truck, Package, ClipboardCheck, LogOut, Users } from "lucide-react";
import { Link } from "react-router-dom";

const Home = () => {
  const { content } = useContent();
  const { settings, loading } = useSiteSettings();

  const grupoLink = settings.link_grupo_wpp || content.link_grupo_wpp;
  const megapostWpp = settings.whatsapp_megapost ? `https://wa.me/${settings.whatsapp_megapost}` : content.link_suporte_wpp;
  const btn1Text = settings.hero_btn1_texto || content.hero_btn1;
  const btn2Text = settings.hero_btn2_texto || content.hero_btn2;

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="bg-muted py-12 md:py-20">
        <div className="container text-center space-y-6">
          <EditableText
            contentKey="hero_titulo"
            as="h1"
            className="text-3xl md:text-4xl lg:text-5xl font-black text-foreground leading-tight max-w-3xl mx-auto"
          />
          <EditableText
            contentKey="hero_subtitulo"
            as="p"
            className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto"
          />
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <a
              href={grupoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm bg-secondary text-secondary-foreground hover:brightness-95 shadow-sm transition-all w-full sm:w-auto"
            >
              <MessageSquare className="h-5 w-5" />
              {btn1Text}
            </a>
            <a
              href={megapostWpp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all w-full sm:w-auto"
            >
              <Headphones className="h-5 w-5" />
              {btn2Text}
            </a>
            <Link to="/como-funciona" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm border-2 border-border text-foreground hover:bg-muted transition-colors w-full sm:w-auto">
              <ArrowDown className="h-5 w-5" />
              {content.hero_btn3}
            </Link>
          </div>
        </div>
      </section>

      {/* Regras de Ouro */}
      <section className="bg-primary text-primary-foreground py-12 md:py-16">
        <div className="container">
          <div className="text-center mb-8">
            <EditableText
              contentKey="regras_titulo"
              as="h2"
              className="text-2xl md:text-3xl font-bold mb-3"
            />
            <EditableText
              contentKey="regras_subtitulo"
              as="p"
              className="opacity-90"
            />
          </div>
          <div className="max-w-2xl mx-auto space-y-3">
            {["regra1", "regra2", "regra3", "regra4", "regra5", "regra6"].map((key) => (
              <div key={key} className="flex items-start gap-3 bg-primary-foreground/10 rounded-lg p-4">
                <ShieldCheck className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                <EditableText
                  contentKey={key}
                  as="p"
                  className="text-sm leading-relaxed"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Atalhos Operacionais */}
      <section className="py-12 md:py-16 bg-muted">
        <div className="container">
          <EditableText
            contentKey="atalhos_titulo"
            as="h2"
            className="text-2xl md:text-3xl font-bold text-center mb-8 text-foreground"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <a
              href={grupoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm bg-secondary text-secondary-foreground hover:brightness-95 shadow-sm transition-all"
            >
              <MessageSquare className="h-5 w-5" />
              {content.atalho_grupo}
            </a>
            <a
              href={megapostWpp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            >
              <Headphones className="h-5 w-5" />
              {content.atalho_suporte}
            </a>
            <Link
              to="/como-funciona"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm border-2 border-border text-foreground hover:bg-background transition-colors"
            >
              <ClipboardCheck className="h-5 w-5" />
              {content.atalho_como}
            </Link>
            <Link
              to="/seja-parceiro"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm border-2 border-border text-foreground hover:bg-background transition-colors"
            >
              <Package className="h-5 w-5" />
              Seja Parceiro
            </Link>
          </div>
          <div className="text-center mt-6">
            <Link
              to="/admin/login"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Sistema Interno →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;
