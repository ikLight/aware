import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ProficiencyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewGraph: () => void
  onSetProficiency: () => void
  onTakeTest: () => void
}

export function ProficiencyDialog({
  open,
  onOpenChange,
  onViewGraph,
  onSetProficiency,
  onTakeTest,
}: ProficiencyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choose Your Path</DialogTitle>
          <DialogDescription>
            You can either set your proficiency levels directly, take a test to determine them, or view the knowledge graph first.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button 
            variant="outline" 
            onClick={onViewGraph}
            className="w-full"
          >
            View Knowledge Graph
          </Button>
          <Button 
            onClick={onSetProficiency}
            className="w-full"
          >
            Set Proficiency Levels
          </Button>
          <Button 
            onClick={onTakeTest}
            className="w-full"
          >
            Take Proficiency Test
          </Button>
        </div>
        <DialogFooter>
          <p className="text-sm text-muted-foreground">
            You can always change your proficiency levels later.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}