"use client";

import { Check, Edit3, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReviewActionButtonsProps {
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
}

export function ReviewActionButtons({ onApprove, onReject, onEdit }: ReviewActionButtonsProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Button size="sm" variant="success" onClick={onApprove}>
        <Check className="h-3.5 w-3.5" />
        Approve
      </Button>
      <Button size="sm" variant="outline" onClick={onEdit}>
        <Edit3 className="h-3.5 w-3.5" />
        Edit
      </Button>
      <Button size="sm" variant="destructive" onClick={onReject}>
        <X className="h-3.5 w-3.5" />
        Reject
      </Button>
    </div>
  );
}
