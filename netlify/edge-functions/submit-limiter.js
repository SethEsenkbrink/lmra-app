export default async (request, context) => {
  // Dit is een 'pass-through' Edge Function.
  // De beveiliging (Rate Limiting) wordt toegepast door de Netlify Edge infrastructuur
  // op basis van de configuratie in netlify.toml.
  
  // Als de limiet NIET is bereikt, wordt dit uitgevoerd en mag het verzoek door.
  // Als de limiet WEL is bereikt, blokkeert Netlify dit verzoek automatisch met een 429 status.
  
  return context.next();
};