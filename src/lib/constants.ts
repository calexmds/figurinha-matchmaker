export const APP_NAME = "Figurinha Matchmaker";
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://figurinhamatchmaker.com.br";
export const TOTAL_STICKERS = 980;

export const TEAMS = [
  "MEX", "RSA", "KOR", "CZE",
  "CAN", "BIH", "QAT", "SUI",
  "BRA", "MAR", "HAI", "SCO",
  "USA", "PAR", "AUS", "TUR",
  "CUW", "CIV", "ECU", "NED",
  "JPN", "SWE", "TUN", "BEL",
  "EGY", "IRN", "NZL", "ESP",
  "CPV", "GER", "KSA", "URU",
  "FRA", "SEN", "IRQ", "NOR",
  "ARG", "ALG", "AUT", "JOR",
  "POR", "COD", "UZB", "COL",
  "ENG", "CRO", "GHA", "PAN",
] as const;

export const SPECIAL_STICKERS = [
  { code: "00", name: "Panini Logo" },
  { code: "FWC1", name: "WC Logo" },
  { code: "FWC2", name: "WC Logo" },
  { code: "FWC3", name: "Official Mascots" },
  { code: "FWC4", name: "Official Slogan" },
  { code: "FWC5", name: "Official Ball" },
  { code: "FWC6", name: "Canada Host Emblem" },
  { code: "FWC7", name: "Mexico Host Emblem" },
  { code: "FWC8", name: "USA Host Emblem" },
  { code: "FWC9", name: "Italy 1934" },
  { code: "FWC10", name: "Uruguay 1950" },
  { code: "FWC11", name: "Germany 1974" },
  { code: "FWC12", name: "Brazil 1962" },
  { code: "FWC13", name: "Germany 1974" },
  { code: "FWC14", name: "Argentina 1986" },
  { code: "FWC15", name: "Brazil 1994" },
  { code: "FWC16", name: "Brazil 2002" },
  { code: "FWC17", name: "Italy 2006" },
  { code: "FWC18", name: "Germany 2014" },
  { code: "FWC19", name: "Argentina 2022" },
] as const;
