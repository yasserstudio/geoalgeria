export interface Wilaya {
  code: number;
  name_fr: string;
  name_ar: string;
  phone_code: string | null;
  postal_code: string;
  latitude: number;
  longitude: number;
  created: "original" | "2019" | "2025";
  parent_wilaya?: string;
}

export interface WilayaDetailed {
  code: number;
  name_fr: string;
  name_ar: string;
  name_en: string;
  created: number;
  dairas_count: number;
  communes_count: number;
  law?: string;
  mother_wilaya_code?: number;
  note?: string;
  dairas_source?: string;
  dairas?: DairaDetail[];
  communes?: CommuneBasic[];
}

export interface DairaDetail {
  name_ar: string;
  name_fr: string;
  communes?: CommuneBasic[];
}

export interface CommuneBasic {
  name_ar: string;
  name_fr: string;
}

export interface WilayaDataset {
  metadata: DatasetMetadata;
  wilayas: WilayaDetailed[];
}

export interface DatasetMetadata {
  title: string;
  total_wilayas: number;
  total_communes: number;
  total_dairas: number;
  reforms: Reform[];
  sources: string[];
  last_updated: string;
  notes: string[];
}

export interface Reform {
  year: number;
  law: string;
  journal_officiel?: string;
  description: string;
  wilayas_added?: string;
}

export interface Commune {
  name_fr: string;
  name_ar: string;
  wilaya_code: number;
  daira: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  code_commune: number | null;
}

export interface Daira {
  id: number;
  wilaya_code: number;
  name_fr: string;
  commune_count: number;
}

export interface CommuneEcommerce {
  id: number;
  commune_name_fr: string;
  commune_name_ar: string;
  daira_name_fr: string | null;
  wilaya_code: number;
  wilaya_name_fr: string;
  wilaya_name_ar: string;
  postal_code: string | null;
}

export interface WilayaWithCommunes extends Wilaya {
  communes: Commune[];
}

export interface DeliveryZone {
  wilaya_code: number;
  wilaya_name_fr: string;
  zone: string | null;
  home_delivery: boolean | null;
  desk_delivery: boolean | null;
  estimated_days: number | null;
}

export interface DeliveryProvider {
  provider: string;
  provider_name: string;
  last_updated: string | null;
  zones: DeliveryZone[];
}

declare const algeriaGeodata: {
  readonly wilayas: Wilaya[];
  readonly communes: Commune[];
  readonly dairas: Daira[];
  readonly ecommerce: CommuneEcommerce[];
  readonly all: WilayaWithCommunes[];
  getWilaya(code: number): Wilaya | undefined;
  getCommunesByWilaya(wilayaCode: number): Commune[];
  getDairasByWilaya(wilayaCode: number): Daira[];
  findCommune(name: string): Commune[];
  findByPostalCode(postalCode: string): Commune[];
};

export = algeriaGeodata;
