import {Pipe, PipeTransform} from '@angular/core';

// see this SO answer: https://stackoverflow.com/a/44764070/1629640
@Pipe({
  name: 'searchBrews'
})
export class SearchPipe implements PipeTransform {
  public transform(brews: Array<Brew>, query: string) {

    if (!query) {
      return brews;
    }

    const matchesQuery = prop => new RegExp(query, 'gi').test(prop);
    const relevantProperties = (brew: Brew) => [brew.getBean().name, brew.getMill().name, brew.getPreparation().name];

    return (brews || []).filter(
      brew => relevantProperties(brew).some(matchesQuery)
    )
  }
}
