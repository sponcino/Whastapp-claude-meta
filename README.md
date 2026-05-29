# Agente WhatsApp

Dashboard local para gestionar conversaciones de WhatsApp via la API oficial de Meta (WhatsApp Cloud API). Responde mensajes automáticamente con un LLM (via OpenRouter) y permite intervención manual desde el dashboard.

## Requisitos

- Node.js 20+
- Cuenta de Meta for Developers con app WhatsApp configurada
- Cuenta de OpenRouter con créditos

## Quickstart local

```bash
# 1. Clonar e instalar
npm install

# 2. Copiar y completar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# 3. Levantar la app
npm run dev
# → http://localhost:3000

# 4. Exponer el webhook públicamente (en otra terminal)
ngrok http 3000
# Copiar la URL https://abc123.ngrok-free.app
```

## Configurar el webhook en Meta

1. Ir a [developers.facebook.com](https://developers.facebook.com/)
2. Abrir tu app → WhatsApp → Configuration → Webhook
3. Callback URL: `https://abc123.ngrok-free.app/api/webhook`
4. Verify token: el valor de `META_VERIFY_TOKEN` en tu `.env.local`
5. Clic en "Verify and Save"
6. Suscribir al campo **messages**

## Variables de entorno

| Variable | Descripción |
|---|---|
| `META_ACCESS_TOKEN` | System User Token permanente (NO el token de prueba de 24h) |
| `META_PHONE_NUMBER_ID` | ID del número de teléfono en Meta for Developers |
| `META_WABA_ID` | WhatsApp Business Account ID |
| `META_APP_SECRET` | App Dashboard → Settings → Basic |
| `META_VERIFY_TOKEN` | String aleatorio que vos elegís; debe coincidir con el webhook |
| `META_GRAPH_VERSION` | Versión de la API (ej. `v21.0`) — actualizar cada ~6 meses |
| `OPENROUTER_API_KEY` | API key de openrouter.ai |
| `OPENROUTER_MODEL` | Modelo a usar (ej. `openai/gpt-4o-mini`) |

### Token permanente vs. token de prueba

El panel de Meta for Developers ofrece un token temporal que caduca en 24h. Para producción **siempre** usá un System User Token permanente:

1. Business Settings → System Users → Agregar system user
2. Asignarle el activo WhatsApp y rol de Admin
3. Generar token → seleccionar los permisos `whatsapp_business_messaging` y `whatsapp_business_management`

## Personalizar el system prompt

Editá `src/lib/system-prompt.ts` con el prompt de tu negocio:

```typescript
export const SYSTEM_PROMPT = `
Sos el asistente virtual de [Tu Empresa].
Atendés consultas sobre [tu servicio].
Respondé siempre en tono amable y profesional.
`.trim();
```

## Limitación: ventana de 24h

WhatsApp Cloud API solo permite enviar texto libre dentro de las 24h posteriores al último mensaje del cliente. Si el cliente no escribió en las últimas 24h y el operador intenta responder en modo Humano, la API devuelve el error `131047` y el dashboard muestra un aviso. Para ese caso se necesitan Message Templates preaprobados (fuera del scope v1).

## Seguridad

- **Webhook firmado**: el endpoint `POST /api/webhook` verifica la firma HMAC-SHA256 con `META_APP_SECRET`. Sin esto cualquiera con la URL pública podría inyectar mensajes falsos.
- **Dashboard sin auth**: el dashboard no tiene autenticación. Si lo exponés a internet, protegelo con basic auth a nivel proxy (nginx, Caddy) o con Cloudflare Access.

## Deploy en EasyPanel (sin Docker)

1. Subir el código al repositorio
2. Crear un servicio de tipo **App** con nixpacks
3. Configurar las variables de entorno en EasyPanel
4. Agregar volumen persistente en `/app/data` (para el SQLite)
5. HTTPS es obligatorio — Meta rechaza webhooks HTTP

## Mejoras pendientes (fuera del scope v1)

- Soporte de mensajes multimedia (imágenes, audio, documentos)
- Message Templates para la ventana de 24h
- Autenticación del dashboard (basic auth o magic link)
- Cola persistente para el procesamiento de webhooks (reintentos)
- Webhooks de status (delivered/read) visible en UI
- Soporte de grupos de WhatsApp
- Búsqueda de conversaciones
- Function calling / herramientas externas para el LLM
