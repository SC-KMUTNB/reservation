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
| **`Button`** | `$lib/components/ui/Button.svelte` | `variant`: `"primary"` \| `"secondary"` \| `"success"` \| `"destructive"` \| `"outline"` \| `"ghost"`<br>`size`: `"sm"` \| `"default"` \| `"lg"` \| `"icon"` |
| **`Badge`** | `$lib/components/ui/Badge.svelte` | `status`: `"APPROVED"` \| `"PENDING"` \| `"REJECTED"` \| `"CANCELLED"` \| `"CHECKIN"` \| `"neutral"`<br>`size`: `"sm"` \| `"default"` \| `"lg"` |
| **`Input`** | `$lib/components/ui/Input.svelte` | `intent`: `"default"` \| `"error"` |

---

## 3. Svelte 5 Runes Standard Pattern Snippet

When authoring or extending primitives in Svelte 5, use `cva` + `cn` (`clsx` + `tailwind-merge`):

```svelte
<script lang="ts">
  import { cva, type VariantProps } from 'class-variance-authority';
  import { cn } from '$lib/utils';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  const buttonVariants = cva(
    'inline-flex items-center justify-center font-medium transition active:scale-95 disabled:pointer-events-none',
    {
      variants: {
        variant: {
          primary: 'bg-orange-500 text-white hover:bg-orange-600',
          secondary: 'bg-slate-800 text-slate-200 hover:bg-slate-700',
        },
        size: {
          sm: 'h-8 px-3 text-xs rounded-lg',
          default: 'h-10 px-4 text-sm rounded-xl',
        }
      },
      defaultVariants: {
        variant: 'primary',
        size: 'default'
      }
    }
  );

  let {
    variant,
    size,
    class: className,
    children,
    ...restProps
  }: HTMLButtonAttributes & VariantProps<typeof buttonVariants> = $props();
</script>

<button class={cn(buttonVariants({ variant, size, className }))} {...restProps}>
  {@render children?.()}
</button>
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
