<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { cva, type VariantProps } from 'class-variance-authority';
  import { cn } from '$lib/utils';

  const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active-press select-none cursor-pointer',
    {
      variants: {
        variant: {
          primary: 'bg-orange-600 text-white shadow-warm-xs hover:bg-orange-700',
          secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
          success: 'bg-emerald-600 text-white shadow-warm-xs hover:bg-emerald-700',
          destructive: 'bg-rose-600 text-white shadow-warm-xs hover:bg-rose-700',
          outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
          ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active-press-none'
        },
        size: {
          sm: 'h-8 px-3 text-xs rounded-lg',
          default: 'h-10 px-4 py-2',
          lg: 'h-12 px-6 text-base rounded-2xl',
          icon: 'h-10 w-10 p-0 rounded-xl'
        }
      },
      defaultVariants: {
        variant: 'primary',
        size: 'default'
      }
    }
  );

  interface Props extends HTMLButtonAttributes {
    variant?: VariantProps<typeof buttonVariants>['variant'];
    size?: VariantProps<typeof buttonVariants>['size'];
    class?: string;
    children?: Snippet;
  }

  let {
    variant = 'primary',
    size = 'default',
    class: className = '',
    children,
    type = 'button',
    ...rest
  }: Props = $props();
</script>

<button
  type={type}
  class={cn(buttonVariants({ variant, size }), className)}
  {...rest}
>
  {@render children?.()}
</button>
