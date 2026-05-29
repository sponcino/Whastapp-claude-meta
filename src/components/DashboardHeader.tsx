"use client";

interface Props {
  phone: string;
  verifiedName: string;
  quality: string;
  onRefresh: () => void;
  refreshing: boolean;
}

const qualityColor: Record<string, string> = {
  GREEN: "text-emerald-600",
  YELLOW: "text-amber-500",
  RED: "text-red-500",
};

export default function DashboardHeader({
  phone,
  verifiedName,
  quality,
  onRefresh,
  refreshing,
}: Props) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
          W
        </div>
        <div>
          <p className="font-semibold text-gray-900 leading-tight">{verifiedName}</p>
          <p className="text-xs text-gray-500">{phone}</p>
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 ${
            qualityColor[quality] ?? "text-gray-600"
          }`}
        >
          {quality}
        </span>
      </div>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50 transition-colors"
      >
        {refreshing ? "Verificando..." : "Probar conexión"}
      </button>
    </header>
  );
}
