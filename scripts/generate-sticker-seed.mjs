const TEAMS = [
  "MEX", "RSA", "KOR", "CZE", "CAN", "BIH", "QAT", "SUI", "BRA", "MAR", "HAI", "SCO",
  "USA", "PAR", "AUS", "TUR", "CUW", "CIV", "ECU", "NED", "JPN", "SWE", "TUN", "BEL",
  "EGY", "IRN", "NZL", "ESP", "CPV", "GER", "KSA", "URU", "FRA", "SEN", "IRQ", "NOR",
  "ARG", "ALG", "AUT", "JOR", "POR", "COD", "UZB", "COL", "ENG", "CRO", "GHA", "PAN",
];

const SPECIALS = [
  ["00", "Panini Logo"],
  ["FWC1", "WC Logo"], ["FWC2", "WC Logo"], ["FWC3", "Official Mascots"],
  ["FWC4", "Official Slogan"], ["FWC5", "Official Ball"],
  ["FWC6", "Canada Host Emblem"], ["FWC7", "Mexico Host Emblem"], ["FWC8", "USA Host Emblem"],
  ["FWC9", "Italy 1934"], ["FWC10", "Uruguay 1950"], ["FWC11", "Germany 1974"],
  ["FWC12", "Brazil 1962"], ["FWC13", "Germany 1974"], ["FWC14", "Argentina 1986"],
  ["FWC15", "Brazil 1994"], ["FWC16", "Brazil 2002"], ["FWC17", "Italy 2006"],
  ["FWC18", "Germany 2014"], ["FWC19", "Argentina 2022"],
];

const stickers = [];
let sortOrder = 1;

for (const [code, name] of SPECIALS) {
  stickers.push({ code, team: null, type: "special", number: null, sortOrder: sortOrder++, name });
}

for (const team of TEAMS) {
  for (let i = 1; i <= 20; i++) {
    const code = `${team}${String(i).padStart(2, "0")}`;
    const name = i === 1 ? "Escudo" : i === 13 ? "Foto do time" : null;
    stickers.push({ code, team, type: "team", number: i, sortOrder: sortOrder++, name });
  }
}

const values = stickers
  .map((s) => {
    const team = s.team ? `'${s.team}'` : "NULL";
    const number = s.number ?? "NULL";
    const name = s.name ? `'${s.name.replace(/'/g, "''")}'` : "NULL";
    return `('${s.code}', ${team}, '${s.type}', ${number}, ${s.sortOrder}, ${name})`;
  })
  .join(",\n  ");

const sql = `-- ${stickers.length} figurinhas Copa 2026
INSERT INTO stickers (code, team, type, number, sort_order, name) VALUES
  ${values}
ON CONFLICT (code) DO NOTHING;
`;

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(__dirname, "../supabase/seed.sql"), sql, "utf8");
console.log(`Generated supabase/seed.sql with ${stickers.length} stickers`);
