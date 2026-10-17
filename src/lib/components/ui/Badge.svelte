<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cva, type VariantProps } from 'class-variance-authority';
  import { cn } from '$lib/utils';

  const badgeVariants = cva(
    'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors select-none',
    {
      variants: {
        status: {
          APPROVED: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
          PENDING: 'bg-amber-50 text-amber-700 border border-amber-200/60',
          REJECTED: 'bg-rose-50 text-rose-700 border border-rose-200/60',
          CANCELLED: 'bg-slate-100 text-slate-600 border border-slate-200',
          CHECKIN: 'bg-blue-50 text-blue-700 border border-blue-200/60',
          neutral: 'bg-slate-100 text-slate-700 border border-slate-200'
        },
        size: {
          sm: 'px-2 py-0.5 text-xs',
          default: 'px-2.5 py-1 text-xs',
          lg: 'px-3 py-1.5 text-sm'
        }
      },
      defaultVariants: {
        status: 'neutral',
        size: 'default'
      }
    }
  );

  interface Props extends HTMLAttributes<HTMLSpanElement> {
    status?: VariantProps<typeof badgeVariants>['status'];
    size?: VariantProps<typeof badgeVariants>['size'];
    class?: string;
    children?: Snippet;
  }

  let {
    status = 'neutral',
    size = 'default',
    class: className = '',
    children,
    ...rest
  }: Props = $props();
</script>

<span
  class={cn(badgeVariants({ status, size }), className)}
  {...rest}
>
  {@render children?.()}
</span>
