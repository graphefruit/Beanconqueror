export class Visualizer {
  public version: string;
  public clock: string; //   "clock": "1654510335",
  public date: string; //  "date": "Mon Jun 06 12:12:15 CEST 2022",
  public timestamp: string; // "timestamp": "1654510335",
  public elapsed: Array<string>; // ["0.045","0.248",
  public timers: {};
  public pressure: {
    pressure: Array<string>;
  };

  public flow: {
    flow: Array<string>;
    by_weight: Array<string>;
  };

  public temperature: {
    basket: Array<string>;
    mix: Array<string>;
    goal: Array<string>;
  };
  public scale: {};
  public totals: {
    weight: Array<string>;
    water_dispensed: Array<string>;
  };
  public state_change: Array<string>;

  public profile: {
    title: string;
    author: string;
    notes: string;
    beverage_type: string;
    version: string;
  };

  public meta: {
    bean: {
      brand: string;
      type: string;
      notes: string;
      roast_level: string;
      roast_date: string;
    };
    shot: {
      enjoyment: string;
      notes: string;
      tds: string;
      ey: string;
    };
    grinder: {
      model: string;
      setting: string;
    };
    in: string;
    out: string;
    time: string;
  };

  public app: {
    app_name: string;
    app_version: string;
    data: {
      settings: {
        my_name: string;
        beverage_type: string;
        bean_brand: string;
        bean_type: string;
        roast_date: string;
        grinder_dose_weight: string;
        running_weight: string;
        drink_weight: string;
        preinfusion_stop_timeout: string;
        language: string;
        grinder_setting: string;
        drink_tds: string;
      };
    };
  };

  constructor() {
    this.initializeData();
  }
  public initializeData() {
    this.version = '0';
    this.clock = '0';
    this.date = '';
    this.timestamp = '';
    this.elapsed = [];
    this.timers = {};
    this.pressure = {
      pressure: [],
    };

    this.flow = {
      flow: [],
      by_weight: [],
    };

    this.temperature = {
      basket: [],
      mix: [],
      goal: [],
    };
    this.scale = {};
    this.totals = {
      weight: [],
      water_dispensed: [],
    };

    this.state_change = [];

    this.profile = {
      title: '',
      author: '',
      notes: '',
      beverage_type: '',
      version: '2',
    };
    this.meta = {
      bean: {
        brand: '',
        type: '',
        notes: '',
        roast_level: '',
        roast_date: '',
      },
      shot: {
        enjoyment: '',
        notes: '',
        tds: '',
        ey: '',
      },
      grinder: {
        model: '',
        setting: '',
      },
      in: '',
      out: '',
      time: '',
    };

    this.app = {
      app_name: 'Beanconqueror',
      app_version: '2',
      data: {
        settings: {
          my_name: 'Beanconqueror',
          beverage_type: '',
          bean_brand: '',
          bean_type: '',
          roast_date: '',
          grinder_dose_weight: '',
          running_weight: '',
          drink_weight: '',
          preinfusion_stop_timeout: '',
          language: '',
          grinder_setting: '',
          drink_tds: '',
        },
      },
    };
  }
}
