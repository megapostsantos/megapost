import { useContent } from "@/contexts/ContentContext";
import EditableText from "@/components/EditableText";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqKeys = [
  { q: "faq1_pergunta", a: "faq1_resposta" },
  { q: "faq2_pergunta", a: "faq2_resposta" },
  { q: "faq3_pergunta", a: "faq3_resposta" },
  { q: "faq4_pergunta", a: "faq4_resposta" },
  { q: "faq5_pergunta", a: "faq5_resposta" },
  { q: "faq6_pergunta", a: "faq6_resposta" },
];

const FAQ = () => {
  return (
    <main className="min-h-screen py-10 md:py-16">
      <div className="container max-w-3xl">
        <div className="text-center mb-10">
          <EditableText
            contentKey="faq_titulo"
            as="h1"
            className="text-3xl md:text-4xl font-black text-foreground mb-3"
          />
          <EditableText
            contentKey="faq_subtitulo"
            as="p"
            className="text-muted-foreground"
          />
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {faqKeys.map((faq, index) => (
            <AccordionItem
              key={faq.q}
              value={`item-${index}`}
              className="bg-card border border-border rounded-lg px-5 data-[state=open]:shadow-sm"
            >
              <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
                <EditableText contentKey={faq.q} as="span" />
              </AccordionTrigger>
              <AccordionContent>
                <EditableText
                  contentKey={faq.a}
                  as="p"
                  className="text-muted-foreground leading-relaxed"
                  multiline
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </main>
  );
};

export default FAQ;
