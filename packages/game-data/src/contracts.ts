import type { Contract } from '@dracor/shared';

export const STARTER_CONTRACTS: Contract[] = [
  {
    id: 'contract_clear_wolves',
    slug: 'clear_wolves',
    title: 'Clear Wolves from the Old Road',
    contractType: 'hunt',
    summary: 'The Road Wolves have grown bold. Thin their numbers.',
    description:
      'Road Wolves have been attacking travelers on the Old Road with increasing frequency. The Roadwarden scouts are stretched thin. Clear at least five wolves to make the route safer for merchants and settlers.',
    zoneId: 'old_road',
    requiredLevel: 1,
    rewardXp: 50,
    rewardGold: 20,
    rewardItems: [],
    objectives: [
      {
        id: 'obj_kill_wolves',
        description: 'Kill Road Wolves',
        targetCount: 5,
        currentCount: 0,
      },
    ],
  },
  {
    id: 'contract_ironroot_gathering',
    slug: 'ironroot_gathering',
    title: 'Ironroot for the Healer',
    contractType: 'gather',
    summary: 'Sela Fen needs Ironroot herbs from the Wolfpine Woods.',
    description:
      'The field healer Sela Fen is running low on Ironroot — a medicinal herb that only grows in the shaded groves of Wolfpine Woods. Gather enough to replenish her supplies before the next wave of injured settlers arrives.',
    zoneId: 'wolfpine_woods',
    requiredLevel: 2,
    rewardXp: 35,
    rewardGold: 15,
    rewardItems: ['simple_health_draught'],
    objectives: [
      {
        id: 'obj_gather_ironroot',
        description: 'Gather Ironroot Herbs',
        targetCount: 8,
        currentCount: 0,
      },
    ],
  },
  {
    id: 'contract_lost_tools',
    slug: 'lost_tools',
    title: 'Lost Tools of Ashroot',
    contractType: 'recover',
    summary: 'Recover the missing toolbox from Ashroot Mine.',
    description:
      'When the miners fled Ashroot Mine, they left behind a toolbox containing irreplaceable precision instruments. Orin Ash needs them for his forge work. Venture into the mine and bring the toolbox back — but beware of what drove the miners out.',
    zoneId: 'ashroot_mine',
    requiredLevel: 3,
    rewardXp: 75,
    rewardGold: 30,
    rewardItems: [],
    objectives: [
      {
        id: 'obj_recover_toolbox',
        description: 'Recover the Ashroot Toolbox',
        targetCount: 1,
        currentCount: 0,
      },
    ],
  },
];
