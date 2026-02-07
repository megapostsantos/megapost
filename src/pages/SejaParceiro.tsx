import { useState } from "react";
import { useContent } from "@/contexts/ContentContext";
import EditableText from "@/components/EditableText";
import CTAButton from "@/components/CTAButton";
import { toast } from "sonner";

const SejaParceiro = () => {
  const { content } = useContent();
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    veiculo: "",
    cidade: "",
    msg: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success("Cadastro enviado com sucesso!");
  };

  return (
    <main className="min-h-screen py-10 md:py-16">
      <div className="container max-w-3xl">
        <div className="text-center mb-10">
          <EditableText
            contentKey="parceiro_titulo"
            as="h1"
            className="text-3xl md:text-4xl font-black text-foreground mb-3"
          />
          <EditableText
            contentKey="parceiro_subtitulo"
            as="p"
            className="text-muted-foreground mb-6"
          />
          <EditableText
            contentKey="parceiro_texto"
            as="p"
            className="text-foreground max-w-2xl mx-auto leading-relaxed"
            multiline
          />
        </div>

        <section className="bg-card border border-border rounded-lg p-6 md:p-8">
          {submitted ? (
            <div className="text-center py-8">
              <EditableText
                contentKey="parceiro_sucesso"
                as="p"
                className="text-lg text-foreground font-medium"
              />
              <button
                onClick={() => {
                  setSubmitted(false);
                  setFormData({ nome: "", email: "", telefone: "", veiculo: "", cidade: "", msg: "" });
                }}
                className="mt-4 text-sm text-primary underline hover:no-underline"
              >
                Enviar outro cadastro
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { key: "parceiro_nome", field: "nome", type: "text" },
                { key: "parceiro_email", field: "email", type: "email" },
                { key: "parceiro_telefone", field: "telefone", type: "tel" },
                { key: "parceiro_veiculo", field: "veiculo", type: "text" },
                { key: "parceiro_cidade", field: "cidade", type: "text" },
              ].map(({ key, field, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {content[key]}
                  </label>
                  <input
                    type={type}
                    required
                    value={formData[field as keyof typeof formData]}
                    onChange={(e) =>
                      setFormData({ ...formData, [field]: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {content.parceiro_msg}
                </label>
                <textarea
                  rows={3}
                  value={formData.msg}
                  onChange={(e) =>
                    setFormData({ ...formData, msg: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none resize-none"
                />
              </div>
              <CTAButton contentKey="parceiro_btn" type="submit" />
            </form>
          )}
        </section>
      </div>
    </main>
  );
};

export default SejaParceiro;
