# Frontend Architecture & UI Design System Law

All AI agents and developers working on this project MUST strictly adhere to this specification.

---

## 1. Zero-Tolerance Rule: No Inline Utility Bloat

- **FORBIDDEN**: Writing 15+ raw Tailwind utility strings inline for common controls (`<button className="px-5 py-2.5 bg-orange-600 ...">`, raw inputs, status badges).
- **MANDATORY**: Use primitives from `@/components/ui/*`.
- **EXCEPTION**: `className` passed to a primitive is strictly scoped to layout placement (`flex-1`, `w-full`, margins, positioning). Never override core tokens (colors, hover/active states, borders) inline.

---

## 2. Primitive Catalog

| Component | Path | Variants / Props |
| :--- | :--- | :--- |
| **`Button`** | `@/components/ui/button.tsx` | `variant`: `"primary"` \| `"secondary"` \| `"success"` \| `"destructive"` \| `"outline"` \| `"ghost"`<br>`size`: `"sm"` \| `"default"` \| `"lg"` \| `"icon"` |
| **`Badge`** | `@/components/ui/badge.tsx` | `status`: `"APPROVED"` \| `"PENDING"` \| `"REJECTED"` \| `"CANCELLED"` \| `"CHECKIN"` \| `"neutral"`<br>`size`: `"sm"` \| `"default"` \| `"lg"` |
| **`Input`** | `@/components/ui/input.tsx` | `intent`: `"default"` \| `"error"` |

---

## 3. CVA Standard Pattern Snippet

When authoring or extending primitives, use `cva` + `cn` (`clsx` + `twMerge`):

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const componentVariants = cva("base-styles", {
  variants: {
    variant: { default: "...", custom: "..." },
    size: { sm: "...", default: "...", lg: "..." },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export interface ComponentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof componentVariants> {}

export const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div ref={ref} className={cn(componentVariants({ variant, size, className }))} {...props} />
  )
);
Component.displayName = "Component";
```

---

## 4. Remaining Debt & Backlog (Batch 2+)

1. **`Card` Primitive** (`@/components/ui/card.tsx`):
   - Unify modal and section containers (`bg-white rounded-3xl p-6 border border-slate-200/90 shadow-warm`).
2. **`Select` / `Dropdown` Primitive** (`@/components/ui/select.tsx`):
   - Replace inconsistent `<select>` tags across dashboard and booking filter panels.
3. **`Textarea` Primitive** (`@/components/ui/textarea.tsx`):
   - Standardize rejection notes and booking description inputs.
4. **`Table` Primitive** (`@/components/ui/table.tsx`):
   - Abstract `<Table>`, `<TableHeader>`, `<TableRow>`, `<TableCell>` with density variants (`compact`, `normal`, `spacious`).
