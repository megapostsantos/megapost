import { useContent } from "@/contexts/ContentContext";
import { Pencil, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const EditToggle = () => {
  const { isEditMode, toggleEditMode, resetContent } = useContent();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex gap-2">
      {isEditMode && (
        <Button
          onClick={resetContent}
          size="sm"
          variant="outline"
          className="shadow-lg bg-background"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Resetar
        </Button>
      )}
      <Button
        onClick={toggleEditMode}
        size="sm"
        className={
          isEditMode
            ? "bg-green-600 hover:bg-green-700 text-white shadow-lg"
            : "bg-secondary text-secondary-foreground shadow-lg hover:bg-secondary/90"
        }
      >
        {isEditMode ? (
          <>
            <Check className="h-4 w-4 mr-1" />
            Salvar
          </>
        ) : (
          <>
            <Pencil className="h-4 w-4 mr-1" />
            Editar
          </>
        )}
      </Button>
    </div>
  );
};

export default EditToggle;
