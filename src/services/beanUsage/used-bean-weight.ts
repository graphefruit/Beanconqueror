import { Brew } from '../../classes/brew/brew';

// A brew uses its dose; without a dose it counts the ground weight.
function usedBeanWeight(brew: Brew): number {
  return brew.bean_weight_in > 0 ? brew.bean_weight_in : brew.grind_weight;
}

export function sumUsedBeanWeight(brews: Brew[]): number {
  let used = 0;
  for (const brew of brews) {
    used += usedBeanWeight(brew);
  }
  return used;
}

// Used weight of every bean in one pass, keyed by bean uuid.
export function getUsedBeanWeightPerBean(brews: Brew[]): Map<string, number> {
  const usedPerBean = new Map<string, number>();
  for (const brew of brews) {
    usedPerBean.set(
      brew.bean,
      (usedPerBean.get(brew.bean) ?? 0) + usedBeanWeight(brew),
    );
  }
  return usedPerBean;
}
