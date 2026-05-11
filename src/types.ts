import { useMemo, useState } from 'react';

export type ProdiData = {
  Universitas: string;
  Provinsi: string;
  Kota: string;
  'Program Studi': string;
  'Bidang Ilmu': string;
  Jenjang: string;
  'Daya Tampung 2026': number;
  'Peminat 2025': string;
  'Peminat 2025 (Num)': number | null;
  Rasio: string;
  Situs: string;
};

export type Filters = {
  Provinsi: string;
  Universitas: string;
  BidangIlmu: string;
  Jenjang: string;
  Search: string;
};

export type SortConfig = {
  key: keyof ProdiData | null;
  direction: 'asc' | 'desc';
};
