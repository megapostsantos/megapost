import { useSiteSettings } from "@/hooks/useSiteSettings";
import EditableText from "@/components/EditableText";
import { QrCode } from "lucide-react";

const ComoFunciona = () => {
  const { settings, loading } = useSiteSettings();
  const texto = settings.texto_como_funciona || "";
  const qrImageUrl = settings.qr_code_image_url || "";

  return (
    <main className="min-h-screen py-10 md:py-16">
      <div className="container max-w-3xl">
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

        {/* Single text box */}
        <section className="max-w-2xl mx-auto mb-16">
          <div className="bg-card border border-border rounded-lg p-6 md:p-8">
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-4 bg-muted rounded w-full" />
                ))}
              </div>
            ) : (
              <div className="text-foreground text-sm md:text-base leading-relaxed whitespace-pre-line">
                {texto || "Conteúdo será configurado pelo administrador."}
              </div>
            )}
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
            {qrImageUrl ? (
              <img
                src={qrImageUrl}
                alt="QR Code do Grupo Operacional"
                className="max-w-[250px] w-full rounded-lg"
              />
            ) : (
              <>
                <QrCode className="h-32 w-32 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  O QR Code será exibido quando configurado pelo administrador.
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default ComoFunciona;
