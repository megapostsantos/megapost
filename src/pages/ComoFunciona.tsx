import { useContent } from "@/contexts/ContentContext";
import EditableText from "@/components/EditableText";
import StepCard from "@/components/StepCard";
import CTAButton from "@/components/CTAButton";
import { Copy, QrCode, Truck, UserCheck, ArrowRightCircle, Dock, ClipboardCheck, Package, LogOut } from "lucide-react";
import { toast } from "sonner";

const ComoFunciona = () => {
  const { content } = useContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(content.cf_msg_texto || "");
    toast.success("Mensagem copiada!");
  };

  const steps = [
    { title: "cf_passo1_titulo", text: "cf_passo1_texto", icon: <Truck className="h-6 w-6" /> },
    { title: "cf_passo2_titulo", text: "cf_passo2_texto", icon: <UserCheck className="h-6 w-6" /> },
    { title: "cf_passo3_titulo", text: "cf_passo3_texto", icon: <ArrowRightCircle className="h-6 w-6" /> },
    { title: "cf_passo4_titulo", text: "cf_passo4_texto", icon: <Dock className="h-6 w-6" /> },
    { title: "cf_passo5_titulo", text: "cf_passo5_texto", icon: <ClipboardCheck className="h-6 w-6" /> },
    { title: "cf_passo6_titulo", text: "cf_passo6_texto", icon: <Package className="h-6 w-6" /> },
    { title: "cf_passo7_titulo", text: "cf_passo7_texto", icon: <LogOut className="h-6 w-6" /> },
  ];

  return (
    <main className="min-h-screen py-10 md:py-16">
      <div className="container">
        <div className="text-center mb-12">
          <EditableText
            contentKey="cf_titulo"
            as="h1"
            className="text-3xl md:text-4xl font-black text-foreground mb-3"
          />
          <EditableText
            contentKey="cf_subtitulo"
            as="p"
            className="text-muted-foreground max-w-2xl mx-auto"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-16">
          {steps.map((step) => (
            <StepCard
              key={step.title}
              titleKey={step.title}
              textKey={step.text}
              icon={step.icon}
            />
          ))}
        </div>

        {/* Mensagem Pronta */}
        <section className="max-w-2xl mx-auto mb-16">
          <EditableText
            contentKey="cf_msg_titulo"
            as="h2"
            className="text-xl md:text-2xl font-bold text-foreground mb-4 text-center"
          />
          <div className="bg-muted border border-border rounded-lg p-5">
            <EditableText
              contentKey="cf_msg_texto"
              as="p"
              className="text-sm text-foreground whitespace-pre-line mb-4 font-mono leading-relaxed"
              multiline
            />
            <CTAButton
              contentKey="cf_msg_btn"
              onClick={handleCopy}
              icon={<Copy className="h-4 w-4" />}
            />
          </div>
        </section>

        {/* QR Code */}
        <section className="max-w-md mx-auto text-center">
          <EditableText
            contentKey="cf_qr_titulo"
            as="h2"
            className="text-xl md:text-2xl font-bold text-foreground mb-3"
          />
          <EditableText
            contentKey="cf_qr_texto"
            as="p"
            className="text-muted-foreground mb-6 text-sm"
          />
          <div className="bg-muted border border-border rounded-lg p-8 flex flex-col items-center gap-4">
            <QrCode className="h-32 w-32 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Substitua esta imagem pelo QR Code real do grupo.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default ComoFunciona;
