interface SchoolStatusBadgeProps {
  isActive: boolean;
}

export function SchoolStatusBadge({ isActive }: SchoolStatusBadgeProps) {
  if (isActive) {
    return (
      <span className="inline-flex items-center rounded-sm bg-success-container px-2 py-0.5 text-label-sm font-label-sm text-on-success-container">
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-sm bg-surface-container-high px-2 py-0.5 text-label-sm font-label-sm text-on-surface-variant">
      Inactive
    </span>
  );
}
