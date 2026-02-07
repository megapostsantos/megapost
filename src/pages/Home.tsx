import { useContent } from "@/contexts/ContentContext";
import EditableText from "@/components/EditableText";
import StepCard from "@/components/StepCard";
import CTAButton from "@/components/CTAButton";
import { MessageSquare, Headphones, ArrowDown, ShieldCheck, Truck, Package, ClipboardCheck, LogOut, Users } from "lucide-react";
import { Link } from "react-router-dom";

const Home = () => {
  const { content } = useContent();

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
            <CTAButton
              contentKey="hero_btn1"
              href={content.link_grupo_wpp}
              icon={<MessageSquare className="h-5 w-5" />}
            />
            <CTAButton
              contentKey="hero_btn2"
              href={content.link_suporte_wpp}
              variant="secondary"
              icon={<Headphones className="h-5 w-5" />}
            />
            <Link to="/como-funciona" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm border-2 border-border text-foreground hover:bg-muted transition-colors w-full sm:w-auto">
              <ArrowDown className="h-5 w-5" />
              {content.hero_btn3}
            </Link>
          </div>
        </div>
      </section>

      {/* Como Funciona - Preview */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="text-center mb-10">
            <EditableText
              contentKey="como_titulo"
              as="h2"
              className="text-2xl md:text-3xl font-bold text-foreground mb-3"
            />
            <EditableText
              contentKey="como_subtitulo"
              as="p"
              className="text-muted-foreground"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StepCard titleKey="passo1_titulo" textKey="passo1_texto" icon={<Truck className="h-6 w-6" />} />
            <StepCard titleKey="passo2_titulo" textKey="passo2_texto" icon={<Users className="h-6 w-6" />} />
            <StepCard titleKey="passo3_titulo" textKey="passo3_texto" icon={<ClipboardCheck className="h-6 w-6" />} />
            <StepCard titleKey="passo4_titulo" textKey="passo4_texto" icon={<Package className="h-6 w-6" />} />
            <StepCard titleKey="passo5_titulo" textKey="passo5_texto" icon={<LogOut className="h-6 w-6" />} />
          </div>
          <div className="text-center mt-8">
            <Link
              to="/como-funciona"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm bg-secondary text-secondary-foreground hover:brightness-95 transition"
            >
              Ver Passo a Passo Completo
              <ArrowDown className="h-4 w-4" />
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
            <CTAButton
              contentKey="atalho_grupo"
              href={content.link_grupo_wpp}
              icon={<MessageSquare className="h-5 w-5" />}
            />
            <CTAButton
              contentKey="atalho_suporte"
              href={content.link_suporte_wpp}
              variant="secondary"
              icon={<Headphones className="h-5 w-5" />}
            />
            <Link
              to="/como-funciona"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm border-2 border-border text-foreground hover:bg-background transition-colors"
            >
              <ClipboardCheck className="h-5 w-5" />
              {content.atalho_como}
            </Link>
            <Link
              to="/faq"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm border-2 border-border text-foreground hover:bg-background transition-colors"
            >
              <ArrowDown className="h-5 w-5" />
              {content.atalho_faq}
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
