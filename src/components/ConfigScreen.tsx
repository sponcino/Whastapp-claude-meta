"use client";

interface Props {
  status: "missing_config" | "error";
  missing?: string[];
  errorMessage?: string;
  onRetry: () => void;
  retrying: boolean;
}

const REQUIRED_VARS = [
  { key: "META_ACCESS_TOKEN", label: "System User Token permanente" },
  { key: "META_PHONE_NUMBER_ID", label: "Phone Number ID" },
  { key: "META_APP_SECRET", label: "App Secret" },
  { key: "META_VERIFY_TOKEN", label: "Verify Token (lo elegís vos)" },
];

export default function ConfigScreen({
  status,
  missing = [],
  errorMessage,
  onRetry,
  retrying,
}: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-lg p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-lg font-bold">
            W
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">Agente WhatsApp</h1>
            <p className="text-xs text-gray-500">Configura tu API de WhatsApp Cloud</p>
          </div>
        </div>

        {/* Estado */}
        {status === "error" && errorMessage && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            <span className="font-semibold">Error de conexión: </span>
            {errorMessage}
          </div>
        )}

        {/* Variables de entorno */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Variables en .env.local</p>
          <ul className="space-y-2">
            {REQUIRED_VARS.map(({ key, label }) => {
              const isMissing = missing.includes(key);
              return (
                <li key={key} className="flex items-center gap-2 text-sm">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isMissing
                        ? "bg-red-100 text-red-600"
                        : "bg-emerald-100 text-emerald-600"
                    }`}
                  >
                    {isMissing ? "✕" : "✓"}
                  </span>
                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">
                    {key}
                  </code>
                  <span className="text-gray-500 text-xs">{label}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Webhook info */}
        <div className="mb-6 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
            URL del Webhook
          </p>
          <code className="text-xs text-gray-800 break-all block">
            https://TU_DOMINIO/api/webhook
          </code>
          <p className="text-xs text-gray-400 mt-1">
            Para desarrollo local: usa ngrok http 3000 y copia la URL pública.
          </p>
        </div>

        {/* Pasos */}
        <ol className="space-y-2 mb-7 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-semibold flex items-center justify-center">1</span>
            <span>Crear app en <strong>developers.facebook.com</strong> y agregar el producto WhatsApp.</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-semibold flex items-center justify-center">2</span>
            <span>Copiar <strong>Phone Number ID</strong>, <strong>WABA ID</strong> y <strong>App Secret</strong> (Settings → Basic).</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-semibold flex items-center justify-center">3</span>
            <span>Generar un <strong>System User Token permanente</strong> desde Business Settings (no uses el token de prueba de 24h).</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-semibold flex items-center justify-center">4</span>
            <span>Configurar el webhook con la URL de arriba y el <code className="text-xs bg-gray-100 px-1 rounded">META_VERIFY_TOKEN</code> del .env.local.</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-semibold flex items-center justify-center">5</span>
            <span>Suscribir el webhook al campo <strong>messages</strong>.</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-semibold flex items-center justify-center">6</span>
            <span>Reiniciar <code className="text-xs bg-gray-100 px-1 rounded">npm run dev</code> después de editar .env.local.</span>
          </li>
        </ol>

        <button
          onClick={onRetry}
          disabled={retrying}
          className="w-full bg-emerald-500 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-emerald-600 disabled:opacity-50 transition-colors"
        >
          {retrying ? "Verificando conexión..." : "Reintentar conexión"}
        </button>
      </div>
    </div>
  );
}
