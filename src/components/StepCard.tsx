import EditableText from "@/components/EditableText";

interface StepCardProps {
  titleKey: string;
  textKey: string;
  icon?: React.ReactNode;
}

const StepCard: React.FC<StepCardProps> = ({ titleKey, textKey, icon }) => {
  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
      {icon && <div className="mb-3 text-primary">{icon}</div>}
      <EditableText
        contentKey={titleKey}
        as="h3"
        className="font-bold text-base mb-2 text-foreground"
      />
      <EditableText
        contentKey={textKey}
        as="p"
        className="text-sm text-muted-foreground leading-relaxed"
        multiline
      />
    </div>
  );
};

export default StepCard;
