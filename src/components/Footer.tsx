import { Link } from "react-router-dom";
import EditableText from "@/components/EditableText";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-8 mt-auto">
      <div className="container text-center space-y-3">
        <EditableText
          contentKey="footer_texto"
          as="p"
          className="text-sm opacity-90 max-w-2xl mx-auto"
        />
        <EditableText
          contentKey="footer_contato"
          as="p"
          className="text-sm font-medium"
        />
        <EditableText
          contentKey="footer_copy"
          as="p"
          className="text-xs opacity-70"
        />
        <Link
          to="/admin/login"
          className="inline-block text-xs opacity-40 hover:opacity-70 transition-opacity mt-2"
        >
          Sistema Interno
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
