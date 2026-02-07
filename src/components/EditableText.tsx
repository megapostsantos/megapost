import React, { useRef, useEffect } from "react";
import { useContent } from "@/contexts/ContentContext";
import { cn } from "@/lib/utils";

interface EditableTextProps {
  contentKey: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  multiline?: boolean;
}

const EditableText: React.FC<EditableTextProps> = ({
  contentKey,
  as: Tag = "span",
  className,
  multiline = false,
}) => {
  const { content, updateContent, isEditMode } = useContent();
  const ref = useRef<HTMLElement>(null);
  const text = content[contentKey] || "";

  useEffect(() => {
    if (ref.current && ref.current.textContent !== text) {
      ref.current.textContent = text;
    }
  }, [text, isEditMode]);

  if (!isEditMode) {
    const Component = Tag as any;
    return (
      <Component className={className}>
        {multiline
          ? text.split("\n").map((line: string, i: number) => (
              <React.Fragment key={i}>
                {line}
                {i < text.split("\n").length - 1 && <br />}
              </React.Fragment>
            ))
          : text}
      </Component>
    );
  }

  const Component = Tag as any;
  return (
    <Component
      ref={ref}
      className={cn("editable-field", className)}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const newText = e.currentTarget.textContent || "";
        if (newText !== text) {
          updateContent(contentKey, newText);
        }
      }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
      }}
    />
  );
};

export default EditableText;
