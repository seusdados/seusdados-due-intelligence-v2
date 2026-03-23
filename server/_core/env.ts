export const ENV = {
  appId: process.env.VITE_APP_ID || "seusdados-due-diligence",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",

  // DigitalOcean Spaces
  doSpacesKey: process.env.DO_SPACES_KEY ?? "",
  doSpacesSecret: process.env.DO_SPACES_SECRET ?? "",
  doSpacesRegion: process.env.DO_SPACES_REGION ?? "nyc3",
  doSpacesEndpoint: process.env.DO_SPACES_ENDPOINT ?? "https://nyc3.digitaloceanspaces.com",
  doSpacesBucket: process.env.DO_SPACES_BUCKET ?? "due-intelligence-storage",
  doSpacesCdnEndpoint: process.env.DO_SPACES_CDN_ENDPOINT ?? "https://due-intelligence-storage.nyc3.cdn.digitaloceanspaces.com",
};
