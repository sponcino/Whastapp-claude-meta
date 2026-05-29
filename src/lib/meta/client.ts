const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION ?? "v21.0"}`;

export async function sendTextMessage(
  phone: string,
  body: string
): Promise<{ wa_message_id: string }> {
  const phoneId = process.env.META_PHONE_NUMBER_ID;
  const token = process.env.META_ACCESS_TOKEN;
  if (!phoneId || !token) {
    throw new Error("META_PHONE_NUMBER_ID o META_ACCESS_TOKEN no configurados");
  }
  const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "text",
      text: { preview_url: false, body },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Graph API ${res.status}: ${errText}`);
  }
  const json = await res.json();
  const id = json?.messages?.[0]?.id;
  if (!id) throw new Error(`Respuesta Graph sin id: ${JSON.stringify(json)}`);
  return { wa_message_id: id };
}

export interface PhoneNumberInfo {
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
}

export async function getPhoneNumberInfo(): Promise<PhoneNumberInfo> {
  const phoneId = process.env.META_PHONE_NUMBER_ID;
  const token = process.env.META_ACCESS_TOKEN;
  const res = await fetch(
    `${GRAPH}/${phoneId}?fields=display_phone_number,verified_name,quality_rating`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Graph ${res.status}: ${await res.text()}`);
  return res.json();
}
