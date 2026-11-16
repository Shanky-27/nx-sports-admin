import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  change?: string;
  note?: string;
  icon: LucideIcon;
  trend?: "positive" | "negative" | "neutral";
};

export default function StatCard({
  label,
  value,
  change,
  note,
  icon: Icon,
  trend = "neutral",
}: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div className="stat-card-label">{label}</div>

        <div className="stat-card-icon">
          <Icon size={18} />
        </div>
      </div>

      <div className="stat-card-value">{value}</div>

      {(change || note) && (
        <div className={`stat-card-change ${trend}`}>
          {change && <span>{change}</span>}
          {note && <span className="stat-card-note">{note}</span>}
        </div>
      )}
    </div>
  );
}