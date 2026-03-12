import { cn } from '@/lib/utils';

export function Card({ className, children, hover = false, glow = false, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card text-card-foreground p-6 transition-all duration-300',
        hover && 'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1',
        glow && 'animate-pulse-glow',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }) {
  return <div className={cn('space-y-1.5 mb-4', className)}>{children}</div>;
}

export function CardTitle({ className, children }) {
  return <h3 className={cn('text-lg font-semibold', className)}>{children}</h3>;
}

export function CardDescription({ className, children }) {
  return <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>;
}

export function CardContent({ className, children }) {
  return <div className={cn('', className)}>{children}</div>;
}