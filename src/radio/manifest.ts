/**
 * Radio catalog, static, hand-maintained, committed to the repo.
 *
 * Every client derives the same (song, second) from wall-clock time against
 * this data, so nothing here may be fetched at runtime. Durations are
 * hand-verified (oEmbed lacks reliable duration) and drive the prefix-sum
 * schedule; they must stay in sync with the published videos.
 */

export interface RadioManifestEntry {
  videoId: string;
  durationSec: number;
  title: string;
  author: string;
  /** Maintainer-confirmed embed-refused; substituted at schedule build. */
  blocked?: boolean;
}

/**
 * A single global evergreen video used to fill any slot whose scheduled track
 * is `blocked`. Because it is one committed constant, every client substitutes
 * the same slot with the same content, determinism across devices is preserved.
 */
export const RADIO_FALLBACK: RadioManifestEntry = {
  videoId: "jfKfPfyJRdk",
  durationSec: 212,
  title: "Lofi Study Beats",
  author: "Lofi Girl",
};

/**
 * Initial curated rotation. Durations are approximate hand-verified values;
 * if a duration drifts from the published video the schedule still works, it
 * just changes where the loop wraps.
 */
export const MANIFEST: RadioManifestEntry[] = [
  { videoId: "aDCcLQto5BM", durationSec: 206, title: "Danny Ocean - Me Rehúso (Official Audio)", author: "Danny Ocean" },
  { videoId: "PdAUi50J4-I", durationSec: 271, title: "Nino Bravo - Un Beso Y Una Flor (Letra/Lyrics) | al partir un beso y una flor", author: "sweetblue." },
  { videoId: "OdaIbTUGmHM", durationSec: 238, title: "Prince Royce - La Carretera (Official Video)", author: "PrinceRoyceVEVO" },
  { videoId: "1oeD2m2UQAI", durationSec: 238, title: "Morat, Juanes - Besos En Guerra (Video Oficial)", author: "MoratVEVO" },
  { videoId: "NqGl0OuLb4Q", durationSec: 229, title: "Tokyo (amb lletra) - Els Catarres - POSTALS (2013)", author: "Els Catarres" },
  { videoId: "xCkf2L7gFnI", durationSec: 279, title: "Jay Wheeler, Omar Courtz - De Lejitos (Remix) (Video Oficial)", author: "JayWheelerVEVO" },
  { videoId: "y0bx_PVZA8Y", durationSec: 195, title: "Els Catarres - Vull estar amb tu", author: "Els Catarres" },
  { videoId: "1idbbsdqM6Y", durationSec: 309, title: "Anuel - Sola (Remix) (AUDIO) ft. Farruko, Daddy Yankee, Wisin, Zion y Lennox", author: "AnuelVEVO" },
  { videoId: "5eP8vMbFbQA", durationSec: 259, title: "Jay Wheeler, Mora - Textos Fríos (Video Oficial)", author: "JayWheelerVEVO" },
  { videoId: "iE-eNQTGvpo", durationSec: 157, title: "Alleh - DesOrden (Official Video)", author: "Alleh" },
  { videoId: "Wr5moiWHj9o", durationSec: 188, title: "Mora - VOLANDO | PRIMER DIA DE CLASES", author: "Mora" },
  { videoId: "OO3kH9mlEMk", durationSec: 184, title: "Invencibles - Els Catarres - POSTALS (2013)", author: "Els Catarres" },
  { videoId: "NdYWuo9OFAw", durationSec: 216, title: "Goo Goo Dolls – Iris [Official Music Video] [4K Remaster]", author: "Goo Goo Dolls" },
  { videoId: "XFkzRNyygfk", durationSec: 237, title: "Radiohead - Creep", author: "Radiohead" },
  { videoId: "gFZfwWZV074", durationSec: 258, title: "Anuel AA, KAROL G - Secreto", author: "AnuelVEVO" },
  { videoId: "K3GKgfe3-tQ", durationSec: 212, title: "Anuel AA - Keii (Audio Oficial)", author: "Anuel AA" },
  { videoId: "w-e5sFmbyHo", durationSec: 274, title: "Rauw Alejandro, Anuel AA, Natti Natasha Ft. Farruko y Lunay - Fantasías Remix (Video Oficial)", author: "Rauw Alejandro" },
  { videoId: "hBvJyi3fbtA", durationSec: 261, title: "Green Day - Boulevard of Broken Dreams (Official Audio)", author: "Green Day" },
  { videoId: "cjVQ36NhbMk", durationSec: 267, title: "The Fray - How To Save A Life (Official Video)", author: "thefrayVEVO" },
  { videoId: "5vy1e4tOXZ0", durationSec: 240, title: "Don Omar - Virtual Diva (Visualizer)", author: "DonOmarVEVO" },
  { videoId: "X2Fil9BTUEM", durationSec: 241, title: "Rauw Alejandro, Laura Pausini - Se Fue (Official Lyric Video)", author: "RauwAlejandroVEVO" },
  { videoId: "7iKEPVPSMcA", durationSec: 179, title: "IGUALES - Quevedo (Visualizer) | BUENAS NOCHES", author: "Quevedo" },
  { videoId: "SVjs5DYDWt0", durationSec: 247, title: "Jose De Rico feat. Henry Mendez \"Rayos De Sol\" (Official Video)", author: "Roster Music" },
  { videoId: "_EvqmOIXGN0", durationSec: 211, title: "Jose De Rico & Henry Mendez feat. Jay Santos \"Noche De Estrellas\" (Official Video)", author: "Roster Music" },
  { videoId: "_gmtKSiJt2g", durationSec: 188, title: "Juan Magán - Mal De Amores", author: "JuanMaganVEVO" },
  { videoId: "bW4nKN0QL5A", durationSec: 160, title: "BAD BUNNY - SOLÍA | YHLQMDLG [Visualizer]", author: "Bad Bunny" },
  { videoId: "W6fme7tcweQ", durationSec: 233, title: "Myke Towers x @JuhnTV  - BANDIDO (Video Oficial)", author: "Myke Towers" },
  { videoId: "7T_09ueky2o", durationSec: 207, title: "Nicky Jam - Voy a Beber | Vídeo Oficial", author: "NickyJamTV" },
  { videoId: "tw2lJYRBO3s", durationSec: 232, title: "Yo Voy (feat. Daddy Yankee)", author: "Zion & Lennox - Topic" },
  { videoId: "Z1ZKaR-9Kt4", durationSec: 204, title: "Gusttavo Lima - Balada (Tchê Tchê Rere) (Gusttavo Lima e Você - Ao Vivo)", author: "Som Livre" },
  { videoId: "EB7G3fUUaeA", durationSec: 174, title: "BAD BUNNY - SI ESTUVIÉSEMOS JUNTOS | X100PRE (Video Oficial)", author: "Bad Bunny" },
  { videoId: "ApXoWvfEYVU", durationSec: 162, title: "Post Malone, Swae Lee - Sunflower (Spider-Man: Into the Spider-Verse)", author: "PostMaloneVEVO" },
  { videoId: "ljMiXbl5Mrk", durationSec: 173, title: "OQUES GRASSES - MOLTA TRALLA", author: "Oques Grasses" },
  { videoId: "ScB1hjKMrTk", durationSec: 206, title: "The Tyets - Menorca (Videoclip Oficial)", author: "The Tyets" },
  { videoId: "YmThOnFXM0E", durationSec: 215, title: "Anuel AA - Tu No Lo Amas", author: "AnuelVEVO" },
  { videoId: "HjjtM3EV0Jk", durationSec: 191, title: "Anuel AA - Bandolera", author: "AnuelVEVO" },
  { videoId: "r3BOr0Fs_r4", durationSec: 227, title: "Ozuna - Dile Que Tu Me Quieres (Audio Oficial)", author: "Ozuna" },
  { videoId: "kQKGI24aydk", durationSec: 215, title: "Danny Ocean - Dembow (Official Audio)", author: "Danny Ocean" },
  { videoId: "LefQdEMJP1I", durationSec: 205, title: "Pitbull - Hey Baby (Drop It To The Floor) ft. T-Pain", author: "PitbullVEVO" },
  { videoId: "N9hazmsUxrM", durationSec: 212, title: "David Guetta Feat. Akon - Sexy Chick (Official Video)", author: "David Guetta", blocked: true },
  { videoId: "4fndeDfaWCg", durationSec: 220, title: "Backstreet Boys - I Want It That Way (Official HD Video)", author: "BackstreetBoysVEVO" },
  { videoId: "4F_RCWVoL4s", durationSec: 201, title: "Neil Diamond - Sweet Caroline (Audio)", author: "neildiamondVEVO" },
  { videoId: "4MB0CmrADaU", durationSec: 237, title: "La Oreja de Van Gogh - Puedes Contar Conmigo (Vídeo Oficial)", author: "LODVGVEVO" },
  { videoId: "o2tdLOK7-PE", durationSec: 181, title: "Zzoilo & Aitana - Mon Amour Remix (Letra/Lyrics)", author: "LatinHype" },
  { videoId: "7csX6CfgMoo", durationSec: 191, title: "Aitana - 6 DE FEBRERO (Video Oficial)", author: "AitanaVEVO" },
  { videoId: "vz_vU53JvvI", durationSec: 182, title: "Aitana - SUPERESTRELLA", author: "AitanaVEVO" },
  { videoId: "TmKh7lAwnBI", durationSec: 214, title: "BAD BUNNY x JHAY CORTEZ - DÁKITI (Video Oficial)", author: "Bad Bunny" },
  { videoId: "9bkmwk4-eEg", durationSec: 202, title: "Comando Tiburon - Pasado Pisado ft. Mach & Daddy", author: "ComandoTiburonVEVO" },
  { videoId: "uSD4vsh1zDA", durationSec: 292, title: "The Black Eyed Peas - I Gotta Feeling (Official Music Video)", author: "BlackEyedPeasVEVO" },
  { videoId: "bAVKp0X9JnQ", durationSec: 232, title: "Sasha Lopez & Andrea D Ft Broono - All My People OFFICIAL VIDEO HD", author: "Scorpio Music" },
  { videoId: "y_SI2EDM6Lo", durationSec: 192, title: "Taio Cruz - Break Your Heart (Official Video) ft. Ludacris", author: "TaioCruzVEVO" },
  { videoId: "hFoxg4IFtqc", durationSec: 241, title: "PITBULL - I know you want me (calle ocho) [Official video HD]", author: "DO IT YOURSELF" },
  { videoId: "2_f5Os7mKqM", durationSec: 215, title: "Myke Towers - Diosa (Video Oficial)", author: "Myke Towers" },
  { videoId: "mmRBXjVENDQ", durationSec: 183, title: "TINI, Maria Becerra - Miénteme (Video Oficial)", author: "TiniVEVO" },
  { videoId: "-_RBJvfoszk", durationSec: 202, title: "Smash Mouth - All Star", author: "AlbumsAreUs" },
  { videoId: "0mYBSayCsH0", durationSec: 185, title: "Smash Mouth - I'm A Believer", author: "SmashMouthVEVO" },
  { videoId: "nNUiVCKu_9Y", durationSec: 242, title: "Grupo Frontera, Fuerza Regida - COQUETA (Letra Oficial)", author: "FUERZA REGIDA" },
  { videoId: "NFary9e9jo0", durationSec: 247, title: "Amaral - El universo sobre mi (Videoclip Oficial)", author: "Warner Music Spain Archivos" },
  { videoId: "OS3pz1vGPro", durationSec: 235, title: "MARISOLA REMIX - CRIS MJ x STANDLY x NICKI NICOLE x DUKI 🔥(LETRA)", author: "LETRAS4K" },
  { videoId: "xfdG6vwIGGU", durationSec: 232, title: "KAROL G, Anuel AA - Culpables (Official Video)", author: "KarolGVEVO" },
  { videoId: "UdztftsoybQ", durationSec: 188, title: "Fuego - Una Vaina Loca (Letra/Lyrics)", author: "LatinHype" },
  { videoId: "h6Yx7IIl8iY", durationSec: 278, title: "Chris Jedi - Ahora Dice (Remix) ft. J Balvin, Ozuna, Anuel AA, Cardi B, Offset, Arcángel", author: "ChrisJediVEVO" },
  { videoId: "TarQP-rtabI", durationSec: 200, title: "Romeo Santos - Sobredosis (Audio) ft. Ozuna", author: "RomeoSantosVEVO" },
  { videoId: "tFyxfKPmvAU", durationSec: 246, title: "¿Qué Nos Pasó? - Anuel AA", author: "Music " },
  { videoId: "oh2LWWORoiM", durationSec: 209, title: "Tove Lo - Habits (Stay High)", author: "ToveLoVEVO" },
  { videoId: "pu5PZugNiJU", durationSec: 265, title: "Don Omar | Zumba 🧲", author: "Don Omar" },
  { videoId: "DRoKTP5xkTU", durationSec: 228, title: "Sean Paul - She Doesn't Mind | Lyrics", author: "Dark City Sounds" },
  { videoId: "HmjFrZ5oOQw", durationSec: 210, title: "KASSANDRA - Quevedo (Official Video) | BUENAS NOCHES", author: "Quevedo" },
  { videoId: "InWLCcI3tD0", durationSec: 222, title: "Pepe y Vizio - Cosas Bonitas (Vídeo Oficial)", author: "Pepe y Vizio" },
  { videoId: "WsmJ2P3fCkw", durationSec: 214, title: "GRAN VÍA - Quevedo ft. Aitana (Official Video)", author: "Quevedo" },
  { videoId: "N79cL5n_xnc", durationSec: 165, title: "Clarent - LOVE (Video Oficial)", author: "Clarent" },
  { videoId: "gZv8Wu9BVBQ", durationSec: 194, title: "8belial x Bad Gyal - ORILLA (Prod. Virtual Flavor) [Official Music Video]", author: "8Belial" },
  { videoId: "yzTuBuRdAyA", durationSec: 235, title: "The Weeknd - The Hills", author: "TheWeekndVEVO" },
  { videoId: "Rif-RTvmmss", durationSec: 231, title: "The Weeknd - Starboy (Audio) ft. Daft Punk", author: "TheWeekndVEVO" },
  { videoId: "3Vzrr64ZrVU", durationSec: 261, title: "Lady Gaga - Born This Way (Audio)", author: "GagaTube GagaTube" },
  { videoId: "kGhnoECBKBs", durationSec: 179, title: "Figa Flawas - a la freSka (Videoclip Oficial)", author: "Figa Flawas" },
  { videoId: "iFImB0TOKP4", durationSec: 208, title: "Myke Towers - La Playa (Video Oficial)", author: "Myke Towers" },
  { videoId: "gUyeDnATsAs", durationSec: 247, title: "Delaossa, Quevedo - Still Luvin", author: "DELAOSSA" },
  { videoId: "bEIH0jLkBnM", durationSec: 207, title: "MALA", author: "6ix9ine - Topic" },
  { videoId: "SlPhMPnQ58k", durationSec: 196, title: "Maroon 5 - Memories (Official Video)", author: "Maroon5VEVO" },
  { videoId: "YB52nMJx4gA", durationSec: 205, title: "Juan Magán - Angelito Sin Alas ft DCS (Completa) Descargar HQ", author: "Javier PD" },
  { videoId: "trOGNQFiPWE", durationSec: 203, title: "Daddy Yankee - La Despedida", author: "AnonyThex" },
  { videoId: "qExd-3oCTl4", durationSec: 235, title: "Carlos Baute - Colgando en tus manos (con Marta Sanchez)", author: "Carlos Baute" },
  { videoId: "nHxam-MQg-o", durationSec: 172, title: "El Canto del Loco - Zapatillas (Videoclip)", author: "elcantodellocoVEVO" },
  { videoId: "NPpELzyP4rw", durationSec: 272, title: "Paulo Londra - Tal Vez (Official Video)", author: "Paulo Londra" },
  { videoId: "-Oz04H-If9c", durationSec: 229, title: "Jhayco - Dile (Homenaje) (Audio)", author: "JhayCortezVEVO" },
  { videoId: "CdXesX6mYUE", durationSec: 249, title: "Pitbull - International Love (Official Video) ft. Chris Brown", author: "PitbullVEVO" },
  { videoId: "KEI4qSrkPAs", durationSec: 219, title: "The Weeknd - Can't Feel My Face (Official Video)", author: "TheWeekndVEVO" },
  { videoId: "OrTyD7rjBpw", durationSec: 236, title: "The Black Eyed Peas - Just Can't Get Enough (Official Music Video)", author: "BlackEyedPeasVEVO" },
  { videoId: "PRpiBpDy7MQ", durationSec: 513, title: "Don McLean - American Pie (Lyric Video)", author: "DonMcLeanVEVO" },
  { videoId: "ycV6cnK3SIs", durationSec: 218, title: "6ix9ine - BEBE ft. Anuel AA", author: "6ix9ineVEVO" },
  { videoId: "J8gcGyYxDbo", durationSec: 193, title: "Anuel AA - Hipócrita feat. Zion (Audio)", author: "AnuelVEVO" },
  { videoId: "RrCpwpt1MVE", durationSec: 160, title: "CANO - Se Pone Las Nike (Lyric Video Oficial) TRIANA", author: "CANO" },
  { videoId: "E0S5CuLILtY", durationSec: 209, title: "WOS LAS PALMAS, QUEVEDO | ESTÁS CON ÉL", author: "Wos Las Palmas" },
  { videoId: "wAjHQXrIj9o", durationSec: 274, title: "Bad Bunny ft. Bomba Estéreo - Ojitos Lindos (Video Oficial) | Un Verano Sin Ti", author: "Bad Bunny" },
  { videoId: "tXHhgLkBml4", durationSec: 266, title: "Jhay Cortez, Anuel AA - Ley Seca (Official Video)", author: "JhayCortezVEVO" },
  { videoId: "Qr6kE403zKU", durationSec: 221, title: "Omar Montes & JC Reyes - GOTERAS", author: "OMAR MONTES" },
  { videoId: "Es4u6GrV7hw", durationSec: 294, title: "ZOO - TOBOGAN (Llepolies, 2021)", author: "ZOO POSSE" },
  { videoId: "7-PrttBWT24", durationSec: 200, title: "ALEX BROWN X THE LAWLESS - ESTRELLA (VIDEOCLIP OFICIAL)", author: "Alex Brown" },
  { videoId: "u6sWBpIW6kE", durationSec: 181, title: "Summercat", author: "The Tyets - Topic" },
  { videoId: "b1kbLwvqugk", durationSec: 310, title: "Taylor Swift - Anti-Hero (Official Music Video)", author: "Taylor Swift" },
  { videoId: "wRKXAAV6jh4", durationSec: 209, title: "Taylor Swift - My Boy Only Breaks His Favorite Toys (Official Lyric Video)", author: "Taylor Swift" },
  { videoId: "irrPUyetKoA", durationSec: 256, title: "Manel - Benvolgut (Videoclip oficial)", author: "Manel" },
  { videoId: "0khvHCjn0AE", durationSec: 185, title: "EN PEU DE GUERRA (amb lletra) - ELS CATARRES (BIG BANG)", author: "Els Catarres" },
  { videoId: "FhJR6OO1X8Y", durationSec: 246, title: "Jenifer - Els Catarres", author: "Els Catarres" },
  { videoId: "GY72K6ncwpk", durationSec: 354, title: "Boig Per Tu", author: "Sau - Topic" },
  { videoId: "G3rql0y9Sv8", durationSec: 171, title: "The Tyets - Olívia (Visualizer Oficial) [Èpic Solete]", author: "The Tyets" },
  { videoId: "kJNyjdpT1vo", durationSec: 203, title: "Taio Cruz - Dynamite (Lyrics)", author: "7th Heaven" },
  { videoId: "m18ABiFlZss", durationSec: 244, title: "Rihanna - S&M (Lyrics)", author: "Latin City" },
  { videoId: "OnT58cIJSpw", durationSec: 227, title: "Corona - The Rhythm of the Night (Official Music Video)", author: "RHINO" },
  { videoId: "-Os5wzo_da0", durationSec: 234, title: "Volverá- El Canto de Loco (letra)", author: "Colchonera Fiel 95" },
  { videoId: "5donCggZzMc", durationSec: 187, title: "Juan Magán - Se Vuelve Loca (Explicit Version)", author: "MaganVEVO" },
  { videoId: "QBgl4rVz3Ks", durationSec: 225, title: "Owl City - Fireflies (Lyrics)", author: "AweLyrics" },
  { videoId: "YE5zqyasWqk", durationSec: 249, title: "Ozuna, Cardi B - La Modelo (Letra/Lyrics)", author: "Dino Music" },
  { videoId: "sIaduFfwGW4", durationSec: 186, title: "Si No Te Quisiera - Juan Magan ft. Belinda, Lapiz Conciente (Letra/Lyrics)", author: "Shelly Rodriquez" },
  { videoId: "ZA7ZKB8Mo9k", durationSec: 197, title: "Feid, ATL Jacob - Luna (Visualizer)", author: "FeidVEVO" },
  { videoId: "AG-erEMhumc", durationSec: 169, title: "Tate McRae - you broke me first (Official Video)", author: "TateMcRaeVEVO" },
  { videoId: "jDdXdEsOzUI", durationSec: 250, title: "Por Fin Te Encontré - Cali & El Dandee, Sebastián Yatra, Juan Magán (Lyrics/Letra)", author: "Jrojas Lyrics" },
  { videoId: "lIe4VHXpftg", durationSec: 219, title: "Juan Magán - Te Voy A Esperar (BSO Tadeo Jones) ft. Belinda", author: "JuanMaganVEVO" },
  { videoId: "CSfvsWh4kg0", durationSec: 184, title: "JC REYES FT DE LA GHETTO - FARDOS", author: "JC REYES" },
  { videoId: "sy7HTezsNZk", durationSec: 230, title: "Starships - Nicki Minaj (Lyrics) 🎵", author: "Pillow" },
  { videoId: "6GiQIh8CfTE", durationSec: 212, title: "Taylor Swift - Bad Blood (Lyrics)", author: "Latin City" },
  { videoId: "VKmyYEozgac", durationSec: 213, title: "Kesha - Die Young (Lyrics)", author: "Vibe Music" },
  { videoId: "VOgc2fjxZqU", durationSec: 207, title: "Becky G - Shower (Letra / Lyrics)", author: "7clouds Latin" },
  { videoId: "iRYvuS9OxdA", durationSec: 188, title: "Amy Macdonald - This is the Life", author: "AmyMacdonaldVEVO" },
  { videoId: "KSbwHzlcgs8", durationSec: 229, title: "Katy Perry - Firework (Lyrics)", author: "7th Heaven" },
  { videoId: "bnVUHWCynig", durationSec: 225, title: "Beyoncé - Halo", author: "BeyoncéVEVO" },
]; // Up to track 420 in liked songs spoty


/** A station's look while no user background is active behind it (legacy view only). */
export interface RadioBackground {
  id: string;
  /** Tailwind classes for a flat/gradient fill, standing in for a real asset. */
  className: string;
}

export interface RadioStation {
  id: string;
  manifest: RadioManifestEntry[];
  fallback: RadioManifestEntry;
  background: RadioBackground;
}

/**
 * Registry of radio stations, keyed by id.
 *
 * Only one station exists today, but scheduling/session code is written
 * against this registry rather than the bare `MANIFEST`/`RADIO_FALLBACK`
 * constants, so a second station is a new entry here, not a refactor of
 * `schedule.ts`/`position.ts`/`controller.ts`.
 */
export const RADIO_STATIONS = {
  default: {
    id: "default",
    manifest: MANIFEST,
    fallback: RADIO_FALLBACK,
    background: {
      id: "radio-default",
      className: "bg-gradient-to-b from-surface via-background to-background",
    },
  },
} satisfies Record<string, RadioStation>;

export type RadioStationId = keyof typeof RADIO_STATIONS;

export const DEFAULT_RADIO_STATION: RadioStationId = "default";
