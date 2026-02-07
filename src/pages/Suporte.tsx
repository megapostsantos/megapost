import { useState } from "react";
import { useContent } from "@/contexts/ContentContext";
import EditableText from "@/components/EditableText";
import CTAButton from "@/components/CTAButton";
import { MessageSquare, Headphones, Phone } from "lucide-react";
import { toast } from "sonner";

const Suporte = () => {
  const { content } = useContent();
  const [formData, setFormData] = useState({
    nome: "",
    placa: "",
    tipo: "",
    descricao: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const tipos = (content.sup_tipos || "").split(",").map((t) => t.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success("Ocorrência registrada!");
  };

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

        {/* Contact Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <CTAButton
            contentKey="sup_btn_wpp"
            href={content.link_suporte_wpp}
            icon={<Headphones className="h-5 w-5" />}
          />
          <CTAButton
            contentKey="sup_btn_grupo"
            href={content.link_grupo_wpp}
            variant="secondary"
            icon={<MessageSquare className="h-5 w-5" />}
          />
          <CTAButton
            contentKey="sup_btn_tel"
            href={`tel:+55${content.telefone_suporte?.replace(/\D/g, "")}`}
            variant="outline"
            icon={<Phone className="h-5 w-5" />}
          />
        </div>

        {/* Formulário de Ocorrência */}
        <section className="bg-card border border-border rounded-lg p-6 md:p-8">
          <EditableText
            contentKey="sup_form_titulo"
            as="h2"
            className="text-xl font-bold text-foreground mb-6"
          />

          {submitted ? (
            <div className="text-center py-8">
              <EditableText
                contentKey="sup_form_sucesso"
                as="p"
                className="text-lg text-foreground font-medium"
              />
              <button
                onClick={() => {
                  setSubmitted(false);
                  setFormData({ nome: "", placa: "", tipo: "", descricao: "" });
                }}
                className="mt-4 text-sm text-primary underline hover:no-underline"
              >
                Registrar nova ocorrência
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {content.sup_form_nome}
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {content.sup_form_placa}
                </label>
                <input
                  type="text"
                  required
                  value={formData.placa}
                  onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {content.sup_form_tipo}
                </label>
                <select
                  required
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  {tipos.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {content.sup_form_descricao}
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none resize-none"
                />
              </div>
              <CTAButton contentKey="sup_form_btn" type="submit" />
            </form>
          )}
        </section>
      </div>
    </main>
  );
};

export default Suporte;
