/* eslint-disable */
import Long from 'long';
import * as _m0 from 'protobufjs/minimal';

export const protobufPackage = 'beanconqueror';

export enum Roast {
  /** UNKNOWN_ROAST - UNKOWN */
  UNKNOWN_ROAST = 0,
  /** CINNAMON_ROAST - LIGHT */
  CINNAMON_ROAST = 1,
  AMERICAN_ROAST = 2,
  NEW_ENGLAND_ROAST = 3,
  HALF_CITY_ROAST = 4,
  MODERATE_LIGHT_ROAST = 5,
  /** CITY_ROAST - MEDIUM */
  CITY_ROAST = 6,
  CITY_PLUS_ROAST = 7,
  FULL_CITY_ROAST = 8,
  /** FULL_CITY_PLUS_ROAST - DARK */
  FULL_CITY_PLUS_ROAST = 9,
  ITALIAN_ROAST = 10,
  VIEANNA_ROAST = 11,
  FRENCH_ROAST = 12,
  CUSTOM_ROAST = 13,
  UNRECOGNIZED = -1,
}

export function roastFromJSON(object: any): Roast {
  switch (object) {
    case 0:
    case 'UNKNOWN_ROAST':
      return Roast.UNKNOWN_ROAST;
    case 1:
    case 'CINNAMON_ROAST':
      return Roast.CINNAMON_ROAST;
    case 2:
    case 'AMERICAN_ROAST':
      return Roast.AMERICAN_ROAST;
    case 3:
    case 'NEW_ENGLAND_ROAST':
      return Roast.NEW_ENGLAND_ROAST;
    case 4:
    case 'HALF_CITY_ROAST':
      return Roast.HALF_CITY_ROAST;
    case 5:
    case 'MODERATE_LIGHT_ROAST':
      return Roast.MODERATE_LIGHT_ROAST;
    case 6:
    case 'CITY_ROAST':
      return Roast.CITY_ROAST;
    case 7:
    case 'CITY_PLUS_ROAST':
      return Roast.CITY_PLUS_ROAST;
    case 8:
    case 'FULL_CITY_ROAST':
      return Roast.FULL_CITY_ROAST;
    case 9:
    case 'FULL_CITY_PLUS_ROAST':
      return Roast.FULL_CITY_PLUS_ROAST;
    case 10:
    case 'ITALIAN_ROAST':
      return Roast.ITALIAN_ROAST;
    case 11:
    case 'VIEANNA_ROAST':
      return Roast.VIEANNA_ROAST;
    case 12:
    case 'FRENCH_ROAST':
      return Roast.FRENCH_ROAST;
    case 13:
    case 'CUSTOM_ROAST':
      return Roast.CUSTOM_ROAST;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return Roast.UNRECOGNIZED;
  }
}

export function roastToJSON(object: Roast): string {
  switch (object) {
    case Roast.UNKNOWN_ROAST:
      return 'UNKNOWN_ROAST';
    case Roast.CINNAMON_ROAST:
      return 'CINNAMON_ROAST';
    case Roast.AMERICAN_ROAST:
      return 'AMERICAN_ROAST';
    case Roast.NEW_ENGLAND_ROAST:
      return 'NEW_ENGLAND_ROAST';
    case Roast.HALF_CITY_ROAST:
      return 'HALF_CITY_ROAST';
    case Roast.MODERATE_LIGHT_ROAST:
      return 'MODERATE_LIGHT_ROAST';
    case Roast.CITY_ROAST:
      return 'CITY_ROAST';
    case Roast.CITY_PLUS_ROAST:
      return 'CITY_PLUS_ROAST';
    case Roast.FULL_CITY_ROAST:
      return 'FULL_CITY_ROAST';
    case Roast.FULL_CITY_PLUS_ROAST:
      return 'FULL_CITY_PLUS_ROAST';
    case Roast.ITALIAN_ROAST:
      return 'ITALIAN_ROAST';
    case Roast.VIEANNA_ROAST:
      return 'VIEANNA_ROAST';
    case Roast.FRENCH_ROAST:
      return 'FRENCH_ROAST';
    case Roast.CUSTOM_ROAST:
      return 'CUSTOM_ROAST';
    case Roast.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}

export enum BeanMix {
  UNKNOWN_BEAN_MIX = 0,
  SINGLE_ORIGIN = 1,
  BLEND = 2,
  UNRECOGNIZED = -1,
}

export function beanMixFromJSON(object: any): BeanMix {
  switch (object) {
    case 0:
    case 'UNKNOWN_BEAN_MIX':
      return BeanMix.UNKNOWN_BEAN_MIX;
    case 1:
    case 'SINGLE_ORIGIN':
      return BeanMix.SINGLE_ORIGIN;
    case 2:
    case 'BLEND':
      return BeanMix.BLEND;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return BeanMix.UNRECOGNIZED;
  }
}

export function beanMixToJSON(object: BeanMix): string {
  switch (object) {
    case BeanMix.UNKNOWN_BEAN_MIX:
      return 'UNKNOWN_BEAN_MIX';
    case BeanMix.SINGLE_ORIGIN:
      return 'SINGLE_ORIGIN';
    case BeanMix.BLEND:
      return 'BLEND';
    case BeanMix.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}

export enum BeanRoastingType {
  UNKNOWN_BEAN_ROASTING_TYPE = 0,
  FILTER = 1,
  ESPRESSO = 2,
  OMNI = 3,
  UNRECOGNIZED = -1,
}

export function beanRoastingTypeFromJSON(object: any): BeanRoastingType {
  switch (object) {
    case 0:
    case 'UNKNOWN_BEAN_ROASTING_TYPE':
      return BeanRoastingType.UNKNOWN_BEAN_ROASTING_TYPE;
    case 1:
    case 'FILTER':
      return BeanRoastingType.FILTER;
    case 2:
    case 'ESPRESSO':
      return BeanRoastingType.ESPRESSO;
    case 3:
    case 'OMNI':
      return BeanRoastingType.OMNI;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return BeanRoastingType.UNRECOGNIZED;
  }
}

export function beanRoastingTypeToJSON(object: BeanRoastingType): string {
  switch (object) {
    case BeanRoastingType.UNKNOWN_BEAN_ROASTING_TYPE:
      return 'UNKNOWN_BEAN_ROASTING_TYPE';
    case BeanRoastingType.FILTER:
      return 'FILTER';
    case BeanRoastingType.ESPRESSO:
      return 'ESPRESSO';
    case BeanRoastingType.OMNI:
      return 'OMNI';
    case BeanRoastingType.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}

export interface BeanProto {
  name: string;
  buyDate?: string | undefined;
  roastingDate?: string | undefined;
  note?: string | undefined;
  roaster?: string | undefined;
  config?: Config | undefined;
  roast?: Roast | undefined;
  roast_range?: number | undefined;
  beanMix?: BeanMix | undefined;
  roast_custom?: string | undefined;
  aromatics?: string | undefined;
  weight?: number | undefined;
  finished?: boolean | undefined;
  cost?: number | undefined;
  attachments: string[];
  cupping_points?: string | undefined;
  decaffeinated?: boolean | undefined;
  url?: string | undefined;
  ean_article_number?: string | undefined;
  rating?: number | undefined;
  bean_information: BeanInformation[];
  bean_roasting_type?: BeanRoastingType | undefined;
  bean_roast_information?: BeanRoastInformation | undefined;
  qr_code?: string | undefined;
  favourite?: boolean | undefined;
  shared?: boolean | undefined;
}

export interface Config {
  uuid: string;
  unix_timestamp: number;
}

export interface BeanInformation {
  country?: string | undefined;
  region?: string | undefined;
  farm?: string | undefined;
  farmer?: string | undefined;
  elevation?: string | undefined;
  harvest_time?: string | undefined;
  variety?: string | undefined;
  processing?: string | undefined;
  certification?: string | undefined;
  percentage?: number | undefined;
  purchasing_price?: number | undefined;
  fob_price?: number | undefined;
}

export interface BeanRoastInformation {
  drop_temperature?: number | undefined;
  roast_length?: number | undefined;
  roaster_machine?: string | undefined;
  green_bean_weight?: number | undefined;
  outside_temperature?: number | undefined;
  humidity?: number | undefined;
  bean_uuid?: string | undefined;
  first_crack_minute?: number | undefined;
  first_crack_temperature?: number | undefined;
  second_crack_minute?: number | undefined;
  second_crack_temperature?: number | undefined;
}

function createBaseBeanProto(): BeanProto {
  return {
    name: '',
    buyDate: undefined,
    roastingDate: undefined,
    note: undefined,
    roaster: undefined,
    config: undefined,
    roast: undefined,
    roast_range: undefined,
    beanMix: undefined,
    roast_custom: undefined,
    aromatics: undefined,
    weight: undefined,
    finished: undefined,
    cost: undefined,
    attachments: [],
    cupping_points: undefined,
    decaffeinated: undefined,
    url: undefined,
    ean_article_number: undefined,
    rating: undefined,
    bean_information: [],
    bean_roasting_type: undefined,
    bean_roast_information: undefined,
    qr_code: undefined,
    favourite: undefined,
    shared: undefined,
  };
}

export const BeanProto = {
  encode(
    message: BeanProto,
    writer: _m0.Writer = _m0.Writer.create()
  ): _m0.Writer {
    if (message.name !== '') {
      writer.uint32(10).string(message.name);
    }
    if (message.buyDate !== undefined) {
      writer.uint32(18).string(message.buyDate);
    }
    if (message.roastingDate !== undefined) {
      writer.uint32(26).string(message.roastingDate);
    }
    if (message.note !== undefined) {
      writer.uint32(34).string(message.note);
    }
    if (message.roaster !== undefined) {
      writer.uint32(42).string(message.roaster);
    }
    if (message.config !== undefined) {
      Config.encode(message.config, writer.uint32(50).fork()).ldelim();
    }
    if (message.roast !== undefined) {
      writer.uint32(56).int32(message.roast);
    }
    if (message.roast_range !== undefined) {
      writer.uint32(64).uint64(message.roast_range);
    }
    if (message.beanMix !== undefined) {
      writer.uint32(72).int32(message.beanMix);
    }
    if (message.roast_custom !== undefined) {
      writer.uint32(82).string(message.roast_custom);
    }
    if (message.aromatics !== undefined) {
      writer.uint32(90).string(message.aromatics);
    }
    if (message.weight !== undefined) {
      writer.uint32(96).uint64(message.weight);
    }
    if (message.finished !== undefined) {
      writer.uint32(104).bool(message.finished);
    }
    if (message.cost !== undefined) {
      writer.uint32(112).uint64(message.cost);
    }
    for (const v of message.attachments) {
      writer.uint32(122).string(v!);
    }
    if (message.cupping_points !== undefined) {
      writer.uint32(130).string(message.cupping_points);
    }
    if (message.decaffeinated !== undefined) {
      writer.uint32(136).bool(message.decaffeinated);
    }
    if (message.url !== undefined) {
      writer.uint32(146).string(message.url);
    }
    if (message.ean_article_number !== undefined) {
      writer.uint32(154).string(message.ean_article_number);
    }
    if (message.rating !== undefined) {
      writer.uint32(160).uint32(message.rating);
    }
    for (const v of message.bean_information) {
      BeanInformation.encode(v!, writer.uint32(170).fork()).ldelim();
    }
    if (message.bean_roasting_type !== undefined) {
      writer.uint32(176).int32(message.bean_roasting_type);
    }
    if (message.bean_roast_information !== undefined) {
      BeanRoastInformation.encode(
        message.bean_roast_information,
        writer.uint32(186).fork()
      ).ldelim();
    }
    if (message.qr_code !== undefined) {
      writer.uint32(194).string(message.qr_code);
    }
    if (message.favourite !== undefined) {
      writer.uint32(200).bool(message.favourite);
    }
    if (message.shared !== undefined) {
      writer.uint32(208).bool(message.shared);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): BeanProto {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBeanProto();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string();
          break;
        case 2:
          message.buyDate = reader.string();
          break;
        case 3:
          message.roastingDate = reader.string();
          break;
        case 4:
          message.note = reader.string();
          break;
        case 5:
          message.roaster = reader.string();
          break;
        case 6:
          message.config = Config.decode(reader, reader.uint32());
          break;
        case 7:
          message.roast = reader.int32() as any;
          break;
        case 8:
          message.roast_range = longToNumber(reader.uint64() as Long);
          break;
        case 9:
          message.beanMix = reader.int32() as any;
          break;
        case 10:
          message.roast_custom = reader.string();
          break;
        case 11:
          message.aromatics = reader.string();
          break;
        case 12:
          message.weight = longToNumber(reader.uint64() as Long);
          break;
        case 13:
          message.finished = reader.bool();
          break;
        case 14:
          message.cost = longToNumber(reader.uint64() as Long);
          break;
        case 15:
          message.attachments.push(reader.string());
          break;
        case 16:
          message.cupping_points = reader.string();
          break;
        case 17:
          message.decaffeinated = reader.bool();
          break;
        case 18:
          message.url = reader.string();
          break;
        case 19:
          message.ean_article_number = reader.string();
          break;
        case 20:
          message.rating = reader.uint32();
          break;
        case 21:
          message.bean_information.push(
            BeanInformation.decode(reader, reader.uint32())
          );
          break;
        case 22:
          message.bean_roasting_type = reader.int32() as any;
          break;
        case 23:
          message.bean_roast_information = BeanRoastInformation.decode(
            reader,
            reader.uint32()
          );
          break;
        case 24:
          message.qr_code = reader.string();
          break;
        case 25:
          message.favourite = reader.bool();
          break;
        case 26:
          message.shared = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): BeanProto {
    return {
      name: isSet(object.name) ? String(object.name) : '',
      buyDate: isSet(object.buyDate) ? String(object.buyDate) : undefined,
      roastingDate: isSet(object.roastingDate)
        ? String(object.roastingDate)
        : undefined,
      note: isSet(object.note) ? String(object.note) : undefined,
      roaster: isSet(object.roaster) ? String(object.roaster) : undefined,
      config: isSet(object.config) ? Config.fromJSON(object.config) : undefined,
      roast: isSet(object.roast) ? roastFromJSON(object.roast) : undefined,
      roast_range: isSet(object.roast_range)
        ? Number(object.roast_range)
        : undefined,
      beanMix: isSet(object.beanMix)
        ? beanMixFromJSON(object.beanMix)
        : undefined,
      roast_custom: isSet(object.roast_custom)
        ? String(object.roast_custom)
        : undefined,
      aromatics: isSet(object.aromatics) ? String(object.aromatics) : undefined,
      weight: isSet(object.weight) ? Number(object.weight) : undefined,
      finished: isSet(object.finished) ? Boolean(object.finished) : undefined,
      cost: isSet(object.cost) ? Number(object.cost) : undefined,
      attachments: Array.isArray(object?.attachments)
        ? object.attachments.map((e: any) => String(e))
        : [],
      cupping_points: isSet(object.cupping_points)
        ? String(object.cupping_points)
        : undefined,
      decaffeinated: isSet(object.decaffeinated)
        ? Boolean(object.decaffeinated)
        : undefined,
      url: isSet(object.url) ? String(object.url) : undefined,
      ean_article_number: isSet(object.ean_article_number)
        ? String(object.ean_article_number)
        : undefined,
      rating: isSet(object.rating) ? Number(object.rating) : undefined,
      bean_information: Array.isArray(object?.bean_information)
        ? object.bean_information.map((e: any) => BeanInformation.fromJSON(e))
        : [],
      bean_roasting_type: isSet(object.bean_roasting_type)
        ? beanRoastingTypeFromJSON(object.bean_roasting_type)
        : undefined,
      bean_roast_information: isSet(object.bean_roast_information)
        ? BeanRoastInformation.fromJSON(object.bean_roast_information)
        : undefined,
      qr_code: isSet(object.qr_code) ? String(object.qr_code) : undefined,
      favourite: isSet(object.favourite)
        ? Boolean(object.favourite)
        : undefined,
      shared: isSet(object.shared) ? Boolean(object.shared) : undefined,
    };
  },

  toJSON(message: BeanProto): unknown {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    message.buyDate !== undefined && (obj.buyDate = message.buyDate);
    message.roastingDate !== undefined &&
      (obj.roastingDate = message.roastingDate);
    message.note !== undefined && (obj.note = message.note);
    message.roaster !== undefined && (obj.roaster = message.roaster);
    message.config !== undefined &&
      (obj.config = message.config ? Config.toJSON(message.config) : undefined);
    message.roast !== undefined &&
      (obj.roast =
        message.roast !== undefined ? roastToJSON(message.roast) : undefined);
    message.roast_range !== undefined &&
      (obj.roast_range = Math.round(message.roast_range));
    message.beanMix !== undefined &&
      (obj.beanMix =
        message.beanMix !== undefined
          ? beanMixToJSON(message.beanMix)
          : undefined);
    message.roast_custom !== undefined &&
      (obj.roast_custom = message.roast_custom);
    message.aromatics !== undefined && (obj.aromatics = message.aromatics);
    message.weight !== undefined && (obj.weight = Math.round(message.weight));
    message.finished !== undefined && (obj.finished = message.finished);
    message.cost !== undefined && (obj.cost = Math.round(message.cost));
    if (message.attachments) {
      obj.attachments = message.attachments.map((e) => e);
    } else {
      obj.attachments = [];
    }
    message.cupping_points !== undefined &&
      (obj.cupping_points = message.cupping_points);
    message.decaffeinated !== undefined &&
      (obj.decaffeinated = message.decaffeinated);
    message.url !== undefined && (obj.url = message.url);
    message.ean_article_number !== undefined &&
      (obj.ean_article_number = message.ean_article_number);
    message.rating !== undefined && (obj.rating = Math.round(message.rating));
    if (message.bean_information) {
      obj.bean_information = message.bean_information.map((e) =>
        e ? BeanInformation.toJSON(e) : undefined
      );
    } else {
      obj.bean_information = [];
    }
    message.bean_roasting_type !== undefined &&
      (obj.bean_roasting_type =
        message.bean_roasting_type !== undefined
          ? beanRoastingTypeToJSON(message.bean_roasting_type)
          : undefined);
    message.bean_roast_information !== undefined &&
      (obj.bean_roast_information = message.bean_roast_information
        ? BeanRoastInformation.toJSON(message.bean_roast_information)
        : undefined);
    message.qr_code !== undefined && (obj.qr_code = message.qr_code);
    message.favourite !== undefined && (obj.favourite = message.favourite);
    message.shared !== undefined && (obj.shared = message.shared);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<BeanProto>, I>>(
    object: I
  ): BeanProto {
    const message = createBaseBeanProto();
    message.name = object.name ?? '';
    message.buyDate = object.buyDate ?? undefined;
    message.roastingDate = object.roastingDate ?? undefined;
    message.note = object.note ?? undefined;
    message.roaster = object.roaster ?? undefined;
    message.config =
      object.config !== undefined && object.config !== null
        ? Config.fromPartial(object.config)
        : undefined;
    message.roast = object.roast ?? undefined;
    message.roast_range = object.roast_range ?? undefined;
    message.beanMix = object.beanMix ?? undefined;
    message.roast_custom = object.roast_custom ?? undefined;
    message.aromatics = object.aromatics ?? undefined;
    message.weight = object.weight ?? undefined;
    message.finished = object.finished ?? undefined;
    message.cost = object.cost ?? undefined;
    message.attachments = object.attachments?.map((e) => e) || [];
    message.cupping_points = object.cupping_points ?? undefined;
    message.decaffeinated = object.decaffeinated ?? undefined;
    message.url = object.url ?? undefined;
    message.ean_article_number = object.ean_article_number ?? undefined;
    message.rating = object.rating ?? undefined;
    message.bean_information =
      object.bean_information?.map((e) => BeanInformation.fromPartial(e)) || [];
    message.bean_roasting_type = object.bean_roasting_type ?? undefined;
    message.bean_roast_information =
      object.bean_roast_information !== undefined &&
      object.bean_roast_information !== null
        ? BeanRoastInformation.fromPartial(object.bean_roast_information)
        : undefined;
    message.qr_code = object.qr_code ?? undefined;
    message.favourite = object.favourite ?? undefined;
    message.shared = object.shared ?? undefined;
    return message;
  },
};

function createBaseConfig(): Config {
  return { uuid: '', unix_timestamp: 0 };
}

export const Config = {
  encode(
    message: Config,
    writer: _m0.Writer = _m0.Writer.create()
  ): _m0.Writer {
    if (message.uuid !== '') {
      writer.uint32(10).string(message.uuid);
    }
    if (message.unix_timestamp !== 0) {
      writer.uint32(16).uint64(message.unix_timestamp);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Config {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseConfig();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.uuid = reader.string();
          break;
        case 2:
          message.unix_timestamp = longToNumber(reader.uint64() as Long);
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): Config {
    return {
      uuid: isSet(object.uuid) ? String(object.uuid) : '',
      unix_timestamp: isSet(object.unix_timestamp)
        ? Number(object.unix_timestamp)
        : 0,
    };
  },

  toJSON(message: Config): unknown {
    const obj: any = {};
    message.uuid !== undefined && (obj.uuid = message.uuid);
    message.unix_timestamp !== undefined &&
      (obj.unix_timestamp = Math.round(message.unix_timestamp));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<Config>, I>>(object: I): Config {
    const message = createBaseConfig();
    message.uuid = object.uuid ?? '';
    message.unix_timestamp = object.unix_timestamp ?? 0;
    return message;
  },
};

function createBaseBeanInformation(): BeanInformation {
  return {
    country: undefined,
    region: undefined,
    farm: undefined,
    farmer: undefined,
    elevation: undefined,
    harvest_time: undefined,
    variety: undefined,
    processing: undefined,
    certification: undefined,
    percentage: undefined,
    purchasing_price: undefined,
    fob_price: undefined,
  };
}

export const BeanInformation = {
  encode(
    message: BeanInformation,
    writer: _m0.Writer = _m0.Writer.create()
  ): _m0.Writer {
    if (message.country !== undefined) {
      writer.uint32(10).string(message.country);
    }
    if (message.region !== undefined) {
      writer.uint32(18).string(message.region);
    }
    if (message.farm !== undefined) {
      writer.uint32(26).string(message.farm);
    }
    if (message.farmer !== undefined) {
      writer.uint32(34).string(message.farmer);
    }
    if (message.elevation !== undefined) {
      writer.uint32(42).string(message.elevation);
    }
    if (message.harvest_time !== undefined) {
      writer.uint32(50).string(message.harvest_time);
    }
    if (message.variety !== undefined) {
      writer.uint32(58).string(message.variety);
    }
    if (message.processing !== undefined) {
      writer.uint32(66).string(message.processing);
    }
    if (message.certification !== undefined) {
      writer.uint32(74).string(message.certification);
    }
    if (message.percentage !== undefined) {
      writer.uint32(80).uint32(message.percentage);
    }
    if (message.purchasing_price !== undefined) {
      writer.uint32(88).uint32(message.purchasing_price);
    }
    if (message.fob_price !== undefined) {
      writer.uint32(96).uint32(message.fob_price);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): BeanInformation {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBeanInformation();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.country = reader.string();
          break;
        case 2:
          message.region = reader.string();
          break;
        case 3:
          message.farm = reader.string();
          break;
        case 4:
          message.farmer = reader.string();
          break;
        case 5:
          message.elevation = reader.string();
          break;
        case 6:
          message.harvest_time = reader.string();
          break;
        case 7:
          message.variety = reader.string();
          break;
        case 8:
          message.processing = reader.string();
          break;
        case 9:
          message.certification = reader.string();
          break;
        case 10:
          message.percentage = reader.uint32();
          break;
        case 11:
          message.purchasing_price = reader.uint32();
          break;
        case 12:
          message.fob_price = reader.uint32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): BeanInformation {
    return {
      country: isSet(object.country) ? String(object.country) : undefined,
      region: isSet(object.region) ? String(object.region) : undefined,
      farm: isSet(object.farm) ? String(object.farm) : undefined,
      farmer: isSet(object.farmer) ? String(object.farmer) : undefined,
      elevation: isSet(object.elevation) ? String(object.elevation) : undefined,
      harvest_time: isSet(object.harvest_time)
        ? String(object.harvest_time)
        : undefined,
      variety: isSet(object.variety) ? String(object.variety) : undefined,
      processing: isSet(object.processing)
        ? String(object.processing)
        : undefined,
      certification: isSet(object.certification)
        ? String(object.certification)
        : undefined,
      percentage: isSet(object.percentage)
        ? Number(object.percentage)
        : undefined,
      purchasing_price: isSet(object.purchasing_price)
        ? Number(object.purchasing_price)
        : undefined,
      fob_price: isSet(object.fob_price) ? Number(object.fob_price) : undefined,
    };
  },

  toJSON(message: BeanInformation): unknown {
    const obj: any = {};
    message.country !== undefined && (obj.country = message.country);
    message.region !== undefined && (obj.region = message.region);
    message.farm !== undefined && (obj.farm = message.farm);
    message.farmer !== undefined && (obj.farmer = message.farmer);
    message.elevation !== undefined && (obj.elevation = message.elevation);
    message.harvest_time !== undefined &&
      (obj.harvest_time = message.harvest_time);
    message.variety !== undefined && (obj.variety = message.variety);
    message.processing !== undefined && (obj.processing = message.processing);
    message.certification !== undefined &&
      (obj.certification = message.certification);
    message.percentage !== undefined &&
      (obj.percentage = Math.round(message.percentage));
    message.purchasing_price !== undefined &&
      (obj.purchasing_price = Math.round(message.purchasing_price));
    message.fob_price !== undefined &&
      (obj.fob_price = Math.round(message.fob_price));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<BeanInformation>, I>>(
    object: I
  ): BeanInformation {
    const message = createBaseBeanInformation();
    message.country = object.country ?? undefined;
    message.region = object.region ?? undefined;
    message.farm = object.farm ?? undefined;
    message.farmer = object.farmer ?? undefined;
    message.elevation = object.elevation ?? undefined;
    message.harvest_time = object.harvest_time ?? undefined;
    message.variety = object.variety ?? undefined;
    message.processing = object.processing ?? undefined;
    message.certification = object.certification ?? undefined;
    message.percentage = object.percentage ?? undefined;
    message.purchasing_price = object.purchasing_price ?? undefined;
    message.fob_price = object.fob_price ?? undefined;
    return message;
  },
};

function createBaseBeanRoastInformation(): BeanRoastInformation {
  return {
    drop_temperature: undefined,
    roast_length: undefined,
    roaster_machine: undefined,
    green_bean_weight: undefined,
    outside_temperature: undefined,
    humidity: undefined,
    bean_uuid: undefined,
    first_crack_minute: undefined,
    first_crack_temperature: undefined,
    second_crack_minute: undefined,
    second_crack_temperature: undefined,
  };
}

export const BeanRoastInformation = {
  encode(
    message: BeanRoastInformation,
    writer: _m0.Writer = _m0.Writer.create()
  ): _m0.Writer {
    if (message.drop_temperature !== undefined) {
      writer.uint32(8).uint32(message.drop_temperature);
    }
    if (message.roast_length !== undefined) {
      writer.uint32(16).uint64(message.roast_length);
    }
    if (message.roaster_machine !== undefined) {
      writer.uint32(26).string(message.roaster_machine);
    }
    if (message.green_bean_weight !== undefined) {
      writer.uint32(32).uint64(message.green_bean_weight);
    }
    if (message.outside_temperature !== undefined) {
      writer.uint32(40).uint32(message.outside_temperature);
    }
    if (message.humidity !== undefined) {
      writer.uint32(48).uint32(message.humidity);
    }
    if (message.bean_uuid !== undefined) {
      writer.uint32(58).string(message.bean_uuid);
    }
    if (message.first_crack_minute !== undefined) {
      writer.uint32(64).uint32(message.first_crack_minute);
    }
    if (message.first_crack_temperature !== undefined) {
      writer.uint32(72).uint32(message.first_crack_temperature);
    }
    if (message.second_crack_minute !== undefined) {
      writer.uint32(80).uint32(message.second_crack_minute);
    }
    if (message.second_crack_temperature !== undefined) {
      writer.uint32(88).uint32(message.second_crack_temperature);
    }
    return writer;
  },

  decode(
    input: _m0.Reader | Uint8Array,
    length?: number
  ): BeanRoastInformation {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBeanRoastInformation();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.drop_temperature = reader.uint32();
          break;
        case 2:
          message.roast_length = longToNumber(reader.uint64() as Long);
          break;
        case 3:
          message.roaster_machine = reader.string();
          break;
        case 4:
          message.green_bean_weight = longToNumber(reader.uint64() as Long);
          break;
        case 5:
          message.outside_temperature = reader.uint32();
          break;
        case 6:
          message.humidity = reader.uint32();
          break;
        case 7:
          message.bean_uuid = reader.string();
          break;
        case 8:
          message.first_crack_minute = reader.uint32();
          break;
        case 9:
          message.first_crack_temperature = reader.uint32();
          break;
        case 10:
          message.second_crack_minute = reader.uint32();
          break;
        case 11:
          message.second_crack_temperature = reader.uint32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): BeanRoastInformation {
    return {
      drop_temperature: isSet(object.drop_temperature)
        ? Number(object.drop_temperature)
        : undefined,
      roast_length: isSet(object.roast_length)
        ? Number(object.roast_length)
        : undefined,
      roaster_machine: isSet(object.roaster_machine)
        ? String(object.roaster_machine)
        : undefined,
      green_bean_weight: isSet(object.green_bean_weight)
        ? Number(object.green_bean_weight)
        : undefined,
      outside_temperature: isSet(object.outside_temperature)
        ? Number(object.outside_temperature)
        : undefined,
      humidity: isSet(object.humidity) ? Number(object.humidity) : undefined,
      bean_uuid: isSet(object.bean_uuid) ? String(object.bean_uuid) : undefined,
      first_crack_minute: isSet(object.first_crack_minute)
        ? Number(object.first_crack_minute)
        : undefined,
      first_crack_temperature: isSet(object.first_crack_temperature)
        ? Number(object.first_crack_temperature)
        : undefined,
      second_crack_minute: isSet(object.second_crack_minute)
        ? Number(object.second_crack_minute)
        : undefined,
      second_crack_temperature: isSet(object.second_crack_temperature)
        ? Number(object.second_crack_temperature)
        : undefined,
    };
  },

  toJSON(message: BeanRoastInformation): unknown {
    const obj: any = {};
    message.drop_temperature !== undefined &&
      (obj.drop_temperature = Math.round(message.drop_temperature));
    message.roast_length !== undefined &&
      (obj.roast_length = Math.round(message.roast_length));
    message.roaster_machine !== undefined &&
      (obj.roaster_machine = message.roaster_machine);
    message.green_bean_weight !== undefined &&
      (obj.green_bean_weight = Math.round(message.green_bean_weight));
    message.outside_temperature !== undefined &&
      (obj.outside_temperature = Math.round(message.outside_temperature));
    message.humidity !== undefined &&
      (obj.humidity = Math.round(message.humidity));
    message.bean_uuid !== undefined && (obj.bean_uuid = message.bean_uuid);
    message.first_crack_minute !== undefined &&
      (obj.first_crack_minute = Math.round(message.first_crack_minute));
    message.first_crack_temperature !== undefined &&
      (obj.first_crack_temperature = Math.round(
        message.first_crack_temperature
      ));
    message.second_crack_minute !== undefined &&
      (obj.second_crack_minute = Math.round(message.second_crack_minute));
    message.second_crack_temperature !== undefined &&
      (obj.second_crack_temperature = Math.round(
        message.second_crack_temperature
      ));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<BeanRoastInformation>, I>>(
    object: I
  ): BeanRoastInformation {
    const message = createBaseBeanRoastInformation();
    message.drop_temperature = object.drop_temperature ?? undefined;
    message.roast_length = object.roast_length ?? undefined;
    message.roaster_machine = object.roaster_machine ?? undefined;
    message.green_bean_weight = object.green_bean_weight ?? undefined;
    message.outside_temperature = object.outside_temperature ?? undefined;
    message.humidity = object.humidity ?? undefined;
    message.bean_uuid = object.bean_uuid ?? undefined;
    message.first_crack_minute = object.first_crack_minute ?? undefined;
    message.first_crack_temperature =
      object.first_crack_temperature ?? undefined;
    message.second_crack_minute = object.second_crack_minute ?? undefined;
    message.second_crack_temperature =
      object.second_crack_temperature ?? undefined;
    return message;
  },
};

declare var self: any | undefined;
declare var window: any | undefined;
declare var global: any | undefined;
var globalThis: any = (() => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  throw 'Unable to locate global object';
})();

type Builtin =
  | Date
  | Function
  | Uint8Array
  | string
  | number
  | boolean
  | undefined;

export type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U>
  ? ReadonlyArray<DeepPartial<U>>
  : T extends {}
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin
  ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & {
      [K in Exclude<keyof I, KeysOfUnion<P>>]: never;
    };

function longToNumber(long: Long): number {
  if (long.gt(Number.MAX_SAFE_INTEGER)) {
    throw new globalThis.Error('Value is larger than Number.MAX_SAFE_INTEGER');
  }
  return long.toNumber();
}

// If you get a compile-error about 'Constructor<Long> and ... have no overlap',
// add '--ts_proto_opt=esModuleInterop=true' as a flag when calling 'protoc'.
if (_m0.util.Long !== Long) {
  _m0.util.Long = Long as any;
  _m0.configure();
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
