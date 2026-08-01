import type { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
}

export function PageShell({ eyebrow, title, description, children }: Props) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
      {eyebrow && (
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-primary">
          {eyebrow}
        </p>
      )}
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      {description && (
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{description}</p>
      )}
      <div className="prose prose-neutral dark:prose-invert mt-10 max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-10 prose-h2:text-2xl prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground">
        {children}
      </div>
    </div>
  );
}
