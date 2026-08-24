import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FavouriteButton({
  favourited,
  onToggle,
  compact = false,
  className,
}: {
  favourited: boolean;
  onToggle: () => void;
  compact?: boolean;
  className?: string;
}) {
  const label = favourited ? "Remove from favourites" : "Add to favourites";
  if (compact) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        aria-pressed={favourited}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggle();
        }}
        className={cn(
          "size-8 shrink-0 text-mark hover:text-mark",
          favourited ? "opacity-100" : "text-muted opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100",
          className,
        )}
      >
        <Star size={14} fill={favourited ? "currentColor" : "none"} />
      </Button>
    );
  }
  return (
    <Button type="button" variant={favourited ? "mark" : "outline"} aria-pressed={favourited} onClick={onToggle} className={className}>
      <Star size={14} fill={favourited ? "currentColor" : "none"} />
      {favourited ? "Favourited" : "Favourite"}
    </Button>
  );
}
