import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { m } from "@/paraglide/messages.js";

export interface InputDialogState {
  title: string;
  description?: string;
  label: string;
  initial?: string;
  multiline?: boolean;
  submit: string;
  onSubmit: (value: string) => void;
}

/** A small dialog with one field, for adding or editing trackers, web seeds and peers. */
export function InputDialog({ state, onClose }: { state: InputDialogState | null; onClose: () => void }) {
  const [value, setValue] = useState("");
  useEffect(() => {
    if (state) setValue(state.initial ?? "");
  }, [state]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!state || !value.trim()) return;
    state.onSubmit(value.trim());
    onClose();
  };
  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{state?.title}</DialogTitle>
            {state?.description && <DialogDescription>{state.description}</DialogDescription>}
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="input-dialog-field">{state?.label}</Label>
            {state?.multiline ? (
              <Textarea
                id="input-dialog-field"
                className="min-h-24 font-mono text-[13px]"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
              />
            ) : (
              <Input
                id="input-dialog-field"
                className="font-mono"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
              />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {m.cancel()}
            </Button>
            <Button type="submit" disabled={!value.trim()}>
              {state?.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
