import type { Npc } from '@dracor/shared';

export const STARTER_NPCS: Npc[] = [
  {
    id: 'npc_mara_vale',
    name: 'Mara Vale',
    title: 'Contract Steward',
    role: 'quest_giver',
    zoneId: 'ironvale_town',
    dialogue: [
      'Another traveler on the Old Road. You look like you can handle yourself.',
      'I keep the contract board. Settlers post work that needs doing — wolves culled, supplies recovered, that sort of thing.',
      'Take a contract, finish the job, get paid. Simple as that.',
      'The board refreshes when new trouble rolls in. Check back often.',
    ],
    description:
      'A weathered woman in practical leathers who manages the town contract board. Her sharp eyes miss nothing, and she keeps meticulous records of every job taken and completed.',
  },
  {
    id: 'npc_orin_ash',
    name: 'Orin Ash',
    title: 'Blacksmith',
    role: 'merchant',
    zoneId: 'ironvale_town',
    dialogue: [
      'Steel and sweat — that is all I know.',
      'Bring me materials and I will make something worth carrying.',
      'That blade of yours has seen better days. I can help, for a price.',
      'The old mine had fine iron. Shame about what moved in after the miners left.',
    ],
    description:
      'A broad-shouldered smith with soot-stained hands and a perpetual squint from years at the forge. His work is sturdy and reliable, if not elegant.',
  },
  {
    id: 'npc_sela_fen',
    name: 'Sela Fen',
    title: 'Field Healer',
    role: 'healer',
    zoneId: 'ironvale_town',
    dialogue: [
      'Sit still. Let me look at those wounds.',
      'The woods provide what we need, if you know where to look.',
      'Ironroot tea mends bones. Wolfpine sap stops bleeding. Nature has an answer for everything.',
      'Rest here as long as you need. The road will still be there tomorrow.',
    ],
    description:
      'A calm woman with herb-stained fingers and kind eyes. She tends to the wounded and sick with quiet efficiency, asking no questions about how injuries were earned.',
  },
  {
    id: 'npc_renn',
    name: 'Renn',
    title: 'Roadwarden Scout',
    role: 'scout',
    zoneId: 'old_road',
    dialogue: [
      'Keep your wits about you. The road is not safe after dark.',
      'Wolves hunt in packs of three or four. Do not let them surround you.',
      'I have seen bandits camped near the old milestone. Hollow-eyed and desperate.',
      'If you hear something large in the brush — do not investigate. Just move.',
    ],
    description:
      'A lean, hooded figure who patrols the Old Road alone. Renn speaks in short, clipped sentences and never seems to fully relax. A shortbow hangs across their back.',
  },
];
