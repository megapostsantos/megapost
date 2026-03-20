import EditableText from "@/components/EditableText";
import { useContent } from "@/contexts/ContentContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Link } from "react-router-dom";
import {
  Truck, Package, RotateCcw, Zap, MapPin, Smartphone,
  CheckCircle2, ArrowRight, MessageCircle, Users, ShieldCheck,
  Clock, Building2, Target, Star, Phone, Mail, ChevronRight,
} from "lucide-react";

const serviceIcons = [
  <Truck className="h-7 w-7" />,
  <Package className="h-7 w-7" />,
  <RotateCcw className="h-7 w-7" />,
  <Zap className="h-7 w-7" />,
  <MapPin className="h-7 w-7" />,
  <Smartphone className="h-7 w-7" />,
];

const porqueIcons = [
  <ShieldCheck className="h-6 w-6" />,
  <Clock className="h-6 w-6" />,
  <Building2 className="h-6 w-6" />,
  <Users className="h-6 w-6" />,
  <Target className="h-6 w-6" />,
  <Zap className="h-6 w-6" />,
];

const LandingPage = () => {
  const { content } = useContent();
  const { settings } = useSiteSettings();
  const wppLink = settings.whatsapp_megapost
    ? `https://wa.me/${settings.whatsapp_megapost}`
    : content.link_suporte_wpp;

  return (
    <main className="min-h-screen">
      {/* ===== HERO ===== */}
      <section className="relative bg-primary overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, hsl(var(--primary-foreground)) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }} />
        </div>
        <div className="container relative z-10 py-16 md:py-28 text-center">
          <div className="max-w-4xl mx-auto space-y-6">
            <EditableText
              contentKey="lp_hero_titulo"
              as="h1"
              className="text-3xl md:text-5xl lg:text-6xl font-black text-primary-foreground leading-tight tracking-tight"
            />
            <EditableText
              contentKey="lp_hero_subtitulo"
              as="p"
              className="text-base md:text-xl text-primary-foreground/85 max-w-3xl mx-auto leading-relaxed"
            />
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <a
                href={wppLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-base bg-secondary text-secondary-foreground hover:brightness-110 shadow-lg transition-all"
              >
                <ArrowRight className="h-5 w-5" />
                {content.lp_hero_btn1}
              </a>
              <a
                href={wppLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-base bg-primary-foreground/15 text-primary-foreground border-2 border-primary-foreground/30 hover:bg-primary-foreground/25 transition-all"
              >
                <MessageCircle className="h-5 w-5" />
                {content.lp_hero_btn2}
              </a>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ===== FLEX DESTAQUE ===== */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <div className="max-w-5xl mx-auto bg-gradient-to-br from-secondary/10 via-secondary/5 to-transparent rounded-3xl p-8 md:p-14 border border-secondary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-secondary text-secondary-foreground">
                <Zap className="h-6 w-6" />
              </div>
              <EditableText
                contentKey="lp_flex_titulo"
                as="h2"
                className="text-2xl md:text-4xl font-black text-foreground"
              />
            </div>
            <EditableText
              contentKey="lp_flex_texto"
              as="p"
              className="text-muted-foreground text-base md:text-lg mb-8 max-w-3xl leading-relaxed"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-sm border border-border">
                  <CheckCircle2 className="h-5 w-5 text-secondary shrink-0" />
                  <EditableText
                    contentKey={`lp_flex_b${i}`}
                    as="span"
                    className="text-sm font-medium text-foreground"
                  />
                </div>
              ))}
            </div>
            <a
              href={wppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base bg-secondary text-secondary-foreground hover:brightness-110 shadow-lg transition-all"
            >
              <ChevronRight className="h-5 w-5" />
              {content.lp_flex_btn}
            </a>
          </div>
        </div>
      </section>

      {/* ===== SERVIÇOS ===== */}
      <section className="py-16 md:py-24 bg-muted">
        <div className="container">
          <EditableText
            contentKey="lp_servicos_titulo"
            as="h2"
            className="text-2xl md:text-4xl font-black text-foreground text-center mb-12"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-card rounded-2xl p-6 shadow-sm border border-border hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {serviceIcons[i - 1]}
                </div>
                <EditableText
                  contentKey={`lp_srv${i}_nome`}
                  as="h3"
                  className="text-lg font-bold text-foreground mb-2"
                />
                <EditableText
                  contentKey={`lp_srv${i}_desc`}
                  as="p"
                  className="text-sm text-muted-foreground leading-relaxed"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== POR QUE MEGA POST ===== */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <EditableText
            contentKey="lp_porque_titulo"
            as="h2"
            className="text-2xl md:text-4xl font-black text-foreground text-center mb-12"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-xl bg-muted">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-primary-foreground shrink-0">
                  {porqueIcons[i - 1]}
                </div>
                <EditableText
                  contentKey={`lp_porque${i}`}
                  as="p"
                  className="text-sm font-semibold text-foreground pt-2"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SELLERS ===== */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container text-center">
          <EditableText
            contentKey="lp_sellers_titulo"
            as="h2"
            className="text-2xl md:text-4xl font-black mb-4"
          />
          <EditableText
            contentKey="lp_sellers_texto"
            as="p"
            className="text-base md:text-lg opacity-85 mb-10 max-w-2xl mx-auto"
          />
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="px-5 py-3 rounded-full bg-primary-foreground/15 border border-primary-foreground/25 text-sm font-semibold"
              >
                <EditableText contentKey={`lp_sellers_p${i}`} as="span" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MOTORISTAS / OPERAÇÃO ===== */}
      <section className="py-16 md:py-24 bg-muted">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Truck className="h-8 w-8 text-primary" />
              <EditableText
                contentKey="lp_motor_titulo"
                as="h2"
                className="text-2xl md:text-4xl font-black text-foreground"
              />
            </div>
            <EditableText
              contentKey="lp_motor_texto"
              as="p"
              className="text-muted-foreground text-base md:text-lg mb-8 max-w-2xl mx-auto leading-relaxed"
            />
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/motorista"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                {content.lp_motor_btn1}
              </Link>
              <Link
                to="/op/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border-2 border-border text-foreground hover:bg-background transition-colors"
              >
                {content.lp_motor_btn2}
              </Link>
              <a
                href={wppLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border-2 border-border text-foreground hover:bg-background transition-colors"
              >
                {content.lp_motor_btn3}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PROCESSO ===== */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <EditableText
            contentKey="lp_processo_titulo"
            as="h2"
            className="text-2xl md:text-4xl font-black text-foreground text-center mb-12"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center group">
                <div className="flex items-center justify-center h-14 w-14 rounded-full bg-secondary text-secondary-foreground font-black text-xl mx-auto mb-4 group-hover:scale-110 transition-transform">
                  {i}
                </div>
                <EditableText
                  contentKey={`lp_processo_p${i}_titulo`}
                  as="h3"
                  className="text-base font-bold text-foreground mb-2"
                />
                <EditableText
                  contentKey={`lp_processo_p${i}_desc`}
                  as="p"
                  className="text-sm text-muted-foreground leading-relaxed"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DEPOIMENTOS ===== */}
      <section className="py-16 md:py-24 bg-muted">
        <div className="container">
          <EditableText
            contentKey="lp_depo_titulo"
            as="h2"
            className="text-2xl md:text-4xl font-black text-foreground text-center mb-12"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-card rounded-2xl p-6 shadow-sm border border-border flex flex-col"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-secondary text-secondary" />
                  ))}
                </div>
                <EditableText
                  contentKey={`lp_depo${i}_texto`}
                  as="p"
                  className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1 italic"
                />
                <div>
                  <EditableText
                    contentKey={`lp_depo${i}_nome`}
                    as="p"
                    className="text-sm font-bold text-foreground"
                  />
                  <EditableText
                    contentKey={`lp_depo${i}_cargo`}
                    as="p"
                    className="text-xs text-muted-foreground"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container text-center">
          <EditableText
            contentKey="lp_cta_titulo"
            as="h2"
            className="text-2xl md:text-4xl font-black mb-4"
          />
          <EditableText
            contentKey="lp_cta_texto"
            as="p"
            className="text-base md:text-lg opacity-85 mb-8 max-w-2xl mx-auto"
          />
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={wppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-base bg-secondary text-secondary-foreground hover:brightness-110 shadow-lg transition-all"
            >
              <MessageCircle className="h-5 w-5" />
              {content.lp_cta_btn1}
            </a>
            <a
              href="#servicos"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-base bg-primary-foreground/15 text-primary-foreground border-2 border-primary-foreground/30 hover:bg-primary-foreground/25 transition-all"
            >
              {content.lp_cta_btn2}
            </a>
          </div>
        </div>
      </section>

      {/* ===== FOOTER LANDING ===== */}
      <footer className="bg-foreground text-background py-12">
        <div className="container">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo-megapost.jpg" alt="Mega POST" className="h-10 w-auto rounded" />
                <span className="font-bold text-lg">Mega POST</span>
              </div>
              <EditableText
                contentKey="lp_footer_texto"
                as="p"
                className="text-sm opacity-70 leading-relaxed"
              />
            </div>
            <div>
              <h4 className="font-bold text-sm mb-3 uppercase tracking-wider opacity-60">Contato</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm opacity-80">
                  <Phone className="h-4 w-4" />
                  <EditableText contentKey="lp_footer_telefone" as="span" />
                </div>
                <div className="flex items-center gap-2 text-sm opacity-80">
                  <Mail className="h-4 w-4" />
                  <EditableText contentKey="lp_footer_email" as="span" />
                </div>
                <div className="flex items-center gap-2 text-sm opacity-80">
                  <MapPin className="h-4 w-4" />
                  <EditableText contentKey="lp_footer_endereco" as="span" />
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-3 uppercase tracking-wider opacity-60">Links</h4>
              <div className="space-y-2 text-sm opacity-80">
                <Link to="/motorista" className="block hover:opacity-100 transition-opacity">Área do Motorista</Link>
                <Link to="/como-funciona" className="block hover:opacity-100 transition-opacity">Como Funciona</Link>
                <Link to="/seja-parceiro" className="block hover:opacity-100 transition-opacity">Seja Parceiro</Link>
                <Link to="/suporte" className="block hover:opacity-100 transition-opacity">Suporte</Link>
                <Link to="/admin/login" className="block hover:opacity-100 transition-opacity text-xs opacity-40">Sistema Interno</Link>
              </div>
            </div>
          </div>
          <div className="max-w-5xl mx-auto mt-8 pt-6 border-t border-background/10 text-center">
            <EditableText
              contentKey="lp_footer_copy"
              as="p"
              className="text-xs opacity-50"
            />
          </div>
        </div>
      </footer>
    </main>
  );
};

export default LandingPage;
