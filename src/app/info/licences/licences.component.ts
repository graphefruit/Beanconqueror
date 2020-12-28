import {Component, OnInit} from '@angular/core';
import {UIHelper} from '../../../services/uiHelper';

@Component({
  selector: 'licences',
  templateUrl: './licences.component.html',
  styleUrls: ['./licences.component.scss'],
})
export class LicencesComponent implements OnInit {
  public licences: any = {
    ionic: {
      TITLE: 'Ionic Framework',
      LINK: 'https://ionicframework.com/',
      ACTIVE: false,
      DESCRIPTION: `Copyright 2015-present Drifty Co.
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
    chartjs: {
      TITLE: 'Chart.js',
      LINK: 'https://github.com/chartjs/Chart.js',
      ACTIVE: false,
      DESCRIPTION: `The MIT License (MIT)

Copyright (c) 2018 Chart.js Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`
    },
    icons8: {
      TITLE: 'Icons 8',
      LINK: 'https://icons8.com/license',
      ACTIVE: false,
      DESCRIPTION: `For smartphone apps, please set a link to https://icons8.com in the About dialog or settings.

Also, please credit our work in your App Store or Google Play description (something like "Icons by Icons8" is fine).`
    },
    font_karla_licence: {
      TITLE: 'Font Karla',
      LINK: 'https://fonts.google.com/specimen/Karla#standard-styles',
      ACTIVE: false,
      DESCRIPTION: `These fonts are licensed under the Open Font License.

You can use them freely in your products & projects - print or digital, commercial or otherwise. However, you can't sell the fonts on their own.

This isn't legal advice, please consider consulting a lawyer and see the full license for all details.`
    },
    font_baloo_tamma_licence: {
      TITLE: 'Font Baloo Tamma 2',
      LINK: 'https://fonts.google.com/specimen/Baloo+Tamma+2',
      ACTIVE: false,
      DESCRIPTION: `These fonts are licensed under the Open Font License.

You can use them freely in your products & projects - print or digital, commercial or otherwise. However, you can't sell the fonts on their own.

This isn't legal advice, please consider consulting a lawyer and see the full license for all details.`
    }


  };
  constructor(private readonly uiHelper: UIHelper) { }

  public ngOnInit() {}

  public openLink(event, _link: string): void {
    event.cancelBubble = true;
    event.preventDefault();
    this.uiHelper.openExternalWebpage(_link);

  }

}
