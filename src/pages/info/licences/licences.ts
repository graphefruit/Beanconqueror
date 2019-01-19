/**Core**/
import {Component} from '@angular/core';
/**Services**/
import {UIHelper} from '../../../services/uiHelper';
@Component({
  templateUrl: 'licences.html',
})
export class LicencesPage {

  licences: any = {
    "ionic": {
      "TITLE": "Ionic Framework V2",
      "LINK": "http://ionicframework.com/",
      "ACTIVE": false,
      "DESCRIPTION": `Copyright 2015-present Drifty Co.
http://drifty.com/

MIT License

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`
    },
    "fontawesome": {
      "TITLE": "Font Awesome",
      "LINK": "https://github.com/FortAwesome/Font-Awesome",
      "ACTIVE": false,
      "DESCRIPTION": `
      The Font Awesome font is licensed under the SIL OFL 1.1:<br/>
      http://scripts.sil.org/OFL<br/>
      Font Awesome CSS, LESS, and Sass files are licensed under the MIT License:<br/>
      https://opensource.org/licenses/mit-license.html<br/>
      The Font Awesome documentation is licensed under the CC BY 3.0 License:<br/>
      http://creativecommons.org/licenses/by/3.0/<br/>
      Attribution is no longer required as of Font Awesome 3.0, but much appreciated:<br/>
      Font Awesome by Dave Gandy - http://fontawesome.io<br/>
      Full details: http://fontawesome.io/license/
      `

    },
    "weihnachtsmuetze":{
      "TITLE":"Weihnachtsmütze",
      "LINK":"https://de.vector.me/browse/134790/clothing_santa_hat_clip_art",
      "ACTIVE":false,
      "DESCRIPTION":`Für kommerzielle und private Nutzung freigegeben. `
    }
  }

  constructor(private uiHelper:UIHelper) {
  }

  public openLink(event, _link: string) {
    event.cancelBubble = true;
    event.preventDefault();
    this.uiHelper.openExternalWebpage(_link);

  }
}

