/**
 * https://legacy.sweetmarias.com/library/sweet-marias-spider-graphs/
 */

export interface ICupping {
  // Properties
  /**
   * Refers to the aroma of the dry ground coffee before hot water is added.
   */
  dry_fragrance: number;
  /**
   * The smell of wet coffee grinds, after the hot water is added.
   */
  wet_aroma: number;
  /**
   * Acidity is the taste of sharp high notes in the coffee caused by a set of chlorogenic, citric, quinic, acetic acids and others, sensed mostly in the front of the mouth and tongue. (It is a good quality; not related to bitterness in coffee, and not directly responsible for upset stomachs). Acidity is prized by many cuppers, and relates directly to the quality of the cup since acidity is the product of high altitude plantings.
   */
  brightness: number;
  /**
   * This is the overall impression in the mouth, including all the other ratings. There are 4 "primary taste" groupings (sour, sweet, salty, bitter) and many "secondary tastes".
   */
  flavor: number;
  /**
   * Often called "mouthfeel", body is the sense of weight and thickness of the brewed coffee, caused by the percentage of soluble solids in the cup including all organic compounds that are extracted (the brewing method and amount of ground coffee used influences this greatly). We rate Body on a lower scale because light bodied coffees are certainly not bad and in some origins the lighter body best suits to overall cup character.
   */
  body: number;
  /**
   * The lingering or emerging tastes that come after the mouth is cleared. This includes the time when the coffee leaves your mouth to minutes afterward...a reason that you will find a lot of cuppers revising aftertaste scores when they are still experiencing a positive flavor a minute or two later.
   */
  finish: number;
  /**
   * Sweetness is almost always a desirable quality in coffee, even if it is described in euphemistic ways such as "rustic sweetness" or "bittersweetness." You may notice that refined sweetness (think European pastries, fine candy, white sugar, pure sweetness) scores high, as well as complex sweetness from fruit sugars (fructose). Malty sweetness (maltose) is less traditional but quite desirable and honey can range from the very pure and clean to complex, rustic almost yeasty. Basically, if sweetness is a key to the cup, it will be rated well.
   */
  sweetness: number;
  /**
   * Note that "clean cup" does not literally mean that there isn't dirt on the coffee. It's just about flavor and raw, funky coffees that are "unclean" and the flavor can also be quite desirable, such as a wet-hulled Indonesia coffees from Sumatra, or dry-processed Ethiopia and Yemeni types.
   */
  clean_cup: number;
  /**
   * Complexity compliments "flavor" and "finish" scores, to communicate a multitude or layering of many flavors. It means that there's a lot to discover in the cup. Then again, simple coffees can be a relief after over-exposure to many powerful, intense, complex coffees.
   */
  complexity: number;
  /**
   * Uniformity refers to cup-to-cup differences. Dry-process coffees can be less uniform than wet-process coffees by nature. We would never avoid a lot that has fantastic flavors if occasionally it waivers. This is scored during the cupping protocol, where multiple cups are made of each lot being reviewed.
   */
  uniformity: number;

  /**
   * This is adapted from the SCAA system and Cup of Excellence scoring (they sometimes call it "Overall Points"). It allows a cupper to ensure that the total score correctly communicates the overall impression of the cup. You might criticize this approach and consider it "fudging" the total. In a way, you would be correct ... but it would be much worse to change the category scores to achieve the desired total (to give a coffee a 9 for acidity when you know it is a 7), or conversely to have a coffee that absolutely deserves a 90 end up at 84. The specific Cupper's Correction number matters naught, be it a 5 or an 8 ... the idea is that the total score gives a correct impression of the coffee quality.
   */
  cuppers_correction: number;


  /**
   * Extra notes
   */
  notes: string;

}
