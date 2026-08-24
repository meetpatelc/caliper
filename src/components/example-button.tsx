import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ExampleButton({ onRestore }: { onRestore: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-10 min-h-10"
      onClick={() => {
        onRestore();
        toast.success("Example restored.");
      }}
    >
      <RotateCcw size={13} />
      Example
    </Button>
  );
}
