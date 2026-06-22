export type TeamInfo = {
  code: string;
  name: string;
  flag: string;
};

export const TEAM_INFO: Record<string, { name: string; flag: string }> = {
  MEX: { name: "México", flag: "🇲🇽" },
  RSA: { name: "África do Sul", flag: "🇿🇦" },
  KOR: { name: "Coreia do Sul", flag: "🇰🇷" },
  CZE: { name: "Rep. Tcheca", flag: "🇨🇿" },
  CAN: { name: "Canadá", flag: "🇨🇦" },
  BIH: { name: "Bósnia", flag: "🇧🇦" },
  QAT: { name: "Catar", flag: "🇶🇦" },
  SUI: { name: "Suíça", flag: "🇨🇭" },
  BRA: { name: "Brasil", flag: "🇧🇷" },
  MAR: { name: "Marrocos", flag: "🇲🇦" },
  HAI: { name: "Haiti", flag: "🇭🇹" },
  SCO: { name: "Escócia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  USA: { name: "Estados Unidos", flag: "🇺🇸" },
  PAR: { name: "Paraguai", flag: "🇵🇾" },
  AUS: { name: "Austrália", flag: "🇦🇺" },
  TUR: { name: "Turquia", flag: "🇹🇷" },
  CUW: { name: "Curaçao", flag: "🇨🇼" },
  CIV: { name: "Costa do Marfim", flag: "🇨🇮" },
  ECU: { name: "Equador", flag: "🇪🇨" },
  NED: { name: "Holanda", flag: "🇳🇱" },
  JPN: { name: "Japão", flag: "🇯🇵" },
  SWE: { name: "Suécia", flag: "🇸🇪" },
  TUN: { name: "Tunísia", flag: "🇹🇳" },
  BEL: { name: "Bélgica", flag: "🇧🇪" },
  EGY: { name: "Egito", flag: "🇪🇬" },
  IRN: { name: "Irã", flag: "🇮🇷" },
  NZL: { name: "Nova Zelândia", flag: "🇳🇿" },
  ESP: { name: "Espanha", flag: "🇪🇸" },
  CPV: { name: "Cabo Verde", flag: "🇨🇻" },
  GER: { name: "Alemanha", flag: "🇩🇪" },
  KSA: { name: "Arábia Saudita", flag: "🇸🇦" },
  URU: { name: "Uruguai", flag: "🇺🇾" },
  FRA: { name: "França", flag: "🇫🇷" },
  SEN: { name: "Senegal", flag: "🇸🇳" },
  IRQ: { name: "Iraque", flag: "🇮🇶" },
  NOR: { name: "Noruega", flag: "🇳🇴" },
  ARG: { name: "Argentina", flag: "🇦🇷" },
  ALG: { name: "Argélia", flag: "🇩🇿" },
  AUT: { name: "Áustria", flag: "🇦🇹" },
  JOR: { name: "Jordânia", flag: "🇯🇴" },
  POR: { name: "Portugal", flag: "🇵🇹" },
  COD: { name: "Congo (RDC)", flag: "🇨🇩" },
  UZB: { name: "Uzbequistão", flag: "🇺🇿" },
  COL: { name: "Colômbia", flag: "🇨🇴" },
  ENG: { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  CRO: { name: "Croácia", flag: "🇭🇷" },
  GHA: { name: "Gana", flag: "🇬🇭" },
  PAN: { name: "Panamá", flag: "🇵🇦" },
};

export function getTeamInfo(code: string): TeamInfo {
  const info = TEAM_INFO[code];
  return {
    code,
    name: info?.name ?? code,
    flag: info?.flag ?? "🏳️",
  };
}
