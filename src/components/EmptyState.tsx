interface EmptyStateProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function EmptyState({ eyebrow, title, description }: EmptyStateProps) {
  return (
    <section className="empty-state">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
