export class Visualizer {
  public version: string;
  public clock: string; //   "clock": "1654510335",
  public date: string; //  "date": "Mon Jun 06 12:12:15 CEST 2022",
  public timestamp: string; // "timestamp": "1654510335",
  public elapsed: Array<string>; // ["0.045","0.248",
  public timers: {};
  public pressure: {
    pressure: Array<string>;
    goal: Array<string>;
  };

  public flow: {
    flow: Array<string>;
    by_weight: Array<string>;
    by_weight_raw: Array<string>;
    goal: Array<string>;
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
  public resistance: {
    resistance: Array<string>;
    by_weight: Array<string>;
  };
  public state_change: Array<string>;

  public profile: {
    title: string;
    author: string;
    notes: string;
    beverage_type: string;
    steps: Array<any>;
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
      goal: [],
    };

    this.flow = {
      flow: [],
      by_weight: [],
      by_weight_raw: [],
      goal: [],
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
    this.resistance = {
      resistance: [],
      by_weight: [],
    };

    this.state_change = [];

    this.profile = {
      title: '',
      author: '',
      notes: '',
      beverage_type: '',
      steps: [],
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
      app_name: 'beanconqueror',
      app_version: '2',
    };
  }
}
