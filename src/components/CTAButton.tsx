import { useContent } from "@/contexts/ContentContext";
import { cn } from "@/lib/utils";

interface CTAButtonProps {
  contentKey: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "outline" | "secondary";
  icon?: React.ReactNode;
  className?: string;
  type?: "button" | "submit";
}

const CTAButton: React.FC<CTAButtonProps> = ({
  contentKey,
  href,
  onClick,
  variant = "primary",
  icon,
  className,
  type = "button",
}) => {
  const { content } = useContent();
  const text = content[contentKey] || contentKey;

  const baseStyles =
    "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 w-full sm:w-auto";

  const variants = {
    primary: "bg-secondary text-secondary-foreground hover:brightness-95 shadow-sm",
    outline: "border-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground",
    secondary: "bg-primary text-primary-foreground hover:bg-primary/90",
  };

  const classes = cn(baseStyles, variants[variant], className);

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {icon}
        {text}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={classes} type={type}>
      {icon}
      {text}
    </button>
  );
};

export default CTAButton;
