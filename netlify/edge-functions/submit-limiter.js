export default async (request, context) => {
  // Simpele logging om te zien dat het verkeer via de Edge loopt
  console.log(`[Sentinel Edge] Verzoek van ${request.headers.get("x-nf-client-connection-ip") || "Unknown IP"}`);
  
  // In een latere fase kunnen we hier custom rate limiting code toevoegen met Deno KV,
  // maar voor nu is de 'pass-through' voldoende om de architectuur correct te houden.
  return context.next();
};