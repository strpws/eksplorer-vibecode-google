import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { Search, RotateCcw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProdiData, Filters, SortConfig } from './types.ts';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default function App() {
  const [data, setData] = useState<ProdiData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({
    Provinsi: '',
    Universitas: '',
    BidangIlmu: '',
    Jenjang: '',
    Search: '',
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: 'asc',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/data.txt');
        if (!response.ok) throw new Error('Gagal memuat data.');
        const text = await response.text();

        Papa.parse(text, {
          header: true,
          delimiter: "\t",
          skipEmptyLines: true,
          complete: (results) => {
            const parsedData: ProdiData[] = results.data.map((row: any) => ({
              ...row,
              'Daya Tampung 2026': parseInt(row['Daya Tampung 2026']) || 0,
              'Peminat 2025 (Num)': row['Peminat 2025 (Num)'] ? parseInt(row['Peminat 2025 (Num)']) : null,
            }));
            setData(parsedData);
            setIsLoading(false);
          },
          error: (err: any) => {
            setError('Error parsing data: ' + err.message);
            setIsLoading(false);
          }
        });
      } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filterOptions = useMemo(() => {
    return {
      Provinsi: [...new Set(data.map(d => d.Provinsi))].sort(),
      Universitas: [...new Set(data.filter(d => !filters.Provinsi || d.Provinsi === filters.Provinsi).map(d => d.Universitas))].sort(),
      BidangIlmu: [...new Set(data.map(d => d['Bidang Ilmu']))].sort(),
      Jenjang: [...new Set(data.map(d => d.Jenjang))].sort(),
    };
  }, [data, filters.Provinsi]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchProvinsi = !filters.Provinsi || item.Provinsi === filters.Provinsi;
      const matchUniversitas = !filters.Universitas || item.Universitas === filters.Universitas;
      const matchBidang = !filters.BidangIlmu || item['Bidang Ilmu'] === filters.BidangIlmu;
      const matchJenjang = !filters.Jenjang || item.Jenjang === filters.Jenjang;
      const matchSearch = !filters.Search || 
        item['Program Studi'].toLowerCase().includes(filters.Search.toLowerCase()) ||
        item.Universitas.toLowerCase().includes(filters.Search.toLowerCase());
      
      return matchProvinsi && matchUniversitas && matchBidang && matchJenjang && matchSearch;
    });
  }, [data, filters]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];

        // Handle null values (new programs)
        if (aVal === null || aVal === undefined || aVal === '') return 1;
        if (bVal === null || bVal === undefined || bVal === '') return -1;

        // Custom sort for Rasio string "1:X"
        if (sortConfig.key === 'Rasio') {
          const aRatio = parseFloat(aVal.toString().split(':')[1]) || 0;
          const bRatio = parseFloat(bVal.toString().split(':')[1]) || 0;
          return sortConfig.direction === 'asc' ? aRatio - bRatio : bRatio - aRatio;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage]);

  const summary = useMemo(() => {
    const ptnSet = new Set(filteredData.map(d => d.Universitas));
    const totalDayaTampung = filteredData.reduce((sum, d) => sum + d['Daya Tampung 2026'], 0);
    const totalPeminat = filteredData.reduce((sum, d) => sum + (d['Peminat 2025 (Num)'] || 0), 0);
    
    return {
      prodi: filteredData.length,
      ptn: ptnSet.size,
      dayaTampung: totalDayaTampung,
      peminat: totalPeminat,
    };
  }, [filteredData]);

  const handleSort = (key: keyof ProdiData) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      Provinsi: '',
      Universitas: '',
      BidangIlmu: '',
      Jenjang: '',
      Search: '',
    });
    setCurrentPage(1);
  };

  const getRatioLabel = (rasio: string) => {
    if (!rasio || rasio.trim() === '') return { text: 'Prodi baru', color: 'bg-gray-100 text-gray-500 italic' };
    const val = parseFloat(rasio.split(':')[1]);
    if (val >= 10) return { text: 'ketat', color: 'bg-[#00599A]/10 text-[#00599A] border border-[#00599A]/20' };
    if (val >= 3) return { text: 'sedang', color: 'bg-[#F3C727]/10 text-brand-gold-darker border border-[#F3C727]/30' };
    return { text: 'rendah', color: 'bg-green-100 text-green-700 border border-green-200' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white font-serif">
        <div className="text-xl animate-pulse">Memuat data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white font-serif p-4 text-center">
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-[#c92b2c] mb-4">Waduh! Terjadi Kesalahan</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#00599A] text-white rounded hover:bg-opacity-90 transition-all font-sans font-bold"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-serif selection:bg-[#F3C727]/30">
      {/* Header Section */}
      <header className="max-w-7xl mx-auto px-4 py-12 md:py-16 text-center border-b border-gray-100">
        <span className="keyword mb-4 block">Eksklusif Kompas</span>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
          Jelajahi Daya Tampung & Peminat <span className="text-[#00599A]">SNBT-UTBK 2026</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Gunakan alat interaktif ini untuk mencari jurusan impian di Perguruan Tinggi Negeri (PTN) pilihan Anda. Data mencakup daya tampung terkini, riwayat peminat, dan tingkat keketatan persaingan.
        </p>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filter Panel */}
        <div className="bg-gray-50 border border-gray-200 p-6 md:p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold tracking-wider text-gray-500 font-sans">Provinsi</label>
              <select 
                value={filters.Provinsi}
                onChange={(e) => handleFilterChange('Provinsi', e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#00599A] font-sans text-sm"
              >
                <option value="">Semua Provinsi</option>
                {filterOptions.Provinsi.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold tracking-wider text-gray-500 font-sans">PTN (Universitas)</label>
              <select 
                value={filters.Universitas}
                onChange={(e) => handleFilterChange('Universitas', e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#00599A] font-sans text-sm"
              >
                <option value="">Semua PTN</option>
                {filterOptions.Universitas.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold tracking-wider text-gray-500 font-sans">Bidang Ilmu</label>
              <select 
                value={filters.BidangIlmu}
                onChange={(e) => handleFilterChange('BidangIlmu', e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#00599A] font-sans text-sm"
              >
                <option value="">Semua Bidang</option>
                {filterOptions.BidangIlmu.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold tracking-wider text-gray-500 font-sans">Jenjang</label>
              <select 
                value={filters.Jenjang}
                onChange={(e) => handleFilterChange('Jenjang', e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#00599A] font-sans text-sm"
              >
                <option value="">Semua Jenjang</option>
                {filterOptions.Jenjang.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold tracking-wider text-gray-500 font-sans">Cari Program Studi</label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Ketik nama prodi..."
                  value={filters.Search}
                  onChange={(e) => handleFilterChange('Search', e.target.value)}
                  className="w-full p-2.5 pl-10 bg-white border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#00599A] font-sans text-sm"
                />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button 
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-2 text-[#c92b2c] hover:bg-[#c92b2c]/5 font-sans font-bold transition-colors"
            >
              <RotateCcw size={16} />
              Reset Filter
            </button>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 mb-8 border border-gray-100 shadow-sm overflow-hidden rounded-lg">
          <div className="p-4 bg-white border-r border-b lg:border-b-0 border-gray-100 text-center">
            <div className="text-xs uppercase font-bold text-gray-500 font-sans tracking-tight mb-1">Total Program Studi</div>
            <div className="text-3xl font-sans font-bold text-[#00599A]">{summary.prodi.toLocaleString('id-ID')}</div>
          </div>
          <div className="p-4 bg-white lg:border-r border-b lg:border-b-0 border-gray-100 text-center">
            <div className="text-xs uppercase font-bold text-gray-500 font-sans tracking-tight mb-1">Total PTN</div>
            <div className="text-3xl font-sans font-bold text-[#00599A]">{summary.ptn.toLocaleString('id-ID')}</div>
          </div>
          <div className="p-4 bg-white border-r border-gray-100 text-center">
            <div className="text-xs uppercase font-bold text-gray-500 font-sans tracking-tight mb-1">Daya Tampung 2026</div>
            <div className="text-3xl font-sans font-bold text-[#F3C727]">{summary.dayaTampung.toLocaleString('id-ID')}</div>
          </div>
          <div className="p-4 bg-white text-center">
            <div className="text-xs uppercase font-bold text-gray-500 font-sans tracking-tight mb-1">Total Peminat 2025</div>
            <div className="text-3xl font-sans font-bold text-[#c92b2c]">{summary.peminat.toLocaleString('id-ID')}</div>
          </div>
        </div>

        {/* Action Info */}
        <div className="mb-4 flex flex-col md:flex-row justify-between items-center text-sm font-sans text-gray-500 gap-2">
          <div className="bg-[#F3C727]/10 px-3 py-1 rounded-full text-brand-gold-darker font-medium">
            💡 Tip: Klik judul kolom untuk mengurutkan data
          </div>
          <div className="font-medium">
            Menampilkan {Math.min(filteredData.length, (currentPage - 1) * itemsPerPage + 1).toLocaleString('id-ID')}–{Math.min(currentPage * itemsPerPage, filteredData.length).toLocaleString('id-ID')} dari {filteredData.length.toLocaleString('id-ID')} baris
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-gray-200 overflow-x-auto shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-600 font-sans border-b border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors whitespace-nowrap" onClick={() => handleSort('Universitas')}>
                  PTN {sortConfig.key === 'Universitas' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-600 font-sans border-b border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors whitespace-nowrap" onClick={() => handleSort('Program Studi')}>
                  Program Studi {sortConfig.key === 'Program Studi' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-600 font-sans border-b border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors whitespace-nowrap hidden md:table-cell" onClick={() => handleSort('Bidang Ilmu')}>
                  Bidang Ilmu {sortConfig.key === 'Bidang Ilmu' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-600 font-sans border-b border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors whitespace-nowrap" onClick={() => handleSort('Jenjang')}>
                  Jenjang {sortConfig.key === 'Jenjang' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-600 font-sans border-b border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors text-right whitespace-nowrap" onClick={() => handleSort('Daya Tampung 2026')}>
                  Kuota 2026 {sortConfig.key === 'Daya Tampung 2026' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-600 font-sans border-b border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors text-right whitespace-nowrap" onClick={() => handleSort('Peminat 2025 (Num)')}>
                  Minat 2025 {sortConfig.key === 'Peminat 2025 (Num)' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-600 font-sans border-b border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors text-right whitespace-nowrap" onClick={() => handleSort('Rasio')}>
                  Rasio {sortConfig.key === 'Rasio' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="font-sans">
              <AnimatePresence mode="popLayout">
                {paginatedData.map((item, idx) => (
                  <motion.tr 
                    key={`${item.Universitas}-${item['Program Studi']}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    layout
                    className={`border-b border-gray-100 hover:bg-[#00599A]/5 transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                  >
                    <td className="p-4 text-sm font-medium">
                      <div className="text-gray-900 group-hover:text-[#00599A] transition-colors">{item.Universitas}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-widest">{item.Provinsi}</div>
                    </td>
                    <td className="p-4 text-sm font-bold text-gray-800">
                      <div className="flex items-center gap-2">
                        {item['Program Studi']}
                        <a href={item.Situs} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-[#00599A]">
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-gray-500 hidden md:table-cell">{item['Bidang Ilmu']}</td>
                    <td className="p-4 text-xs text-gray-500">{item.Jenjang}</td>
                    <td className="p-4 text-sm font-bold text-right text-gray-900 tabular-nums">{item['Daya Tampung 2026'].toLocaleString('id-ID')}</td>
                    <td className="p-4 text-sm font-medium text-right text-gray-900 tabular-nums">
                      {item['Peminat 2025 (Num)']?.toLocaleString('id-ID') || '—'}
                    </td>
                    <td className="p-4 text-right">
                      {(() => {
                        const label = getRatioLabel(item.Rasio);
                        return (
                          <div className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tight ${label.color}`}>
                            {label.text === 'Prodi baru' ? <span><i>Prodi baru</i></span> : <span>{item.Rasio} • {label.text}</span>}
                          </div>
                        );
                      })()}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {paginatedData.length === 0 && (
            <div className="py-20 text-center font-serif text-gray-400">
              <div className="text-4xl mb-4">🔍</div>
              <p>Tidak ada data yang cocok dengan kriteria filter Anda.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-gray-100 pt-8">
            <div className="text-sm font-sans text-gray-500">
              Halaman {currentPage.toLocaleString('id-ID')} dari {totalPages.toLocaleString('id-ID')}
            </div>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-30 transition-all text-gray-600"
                title="Halaman Pertama"
              >
                <ChevronsLeft size={16} />
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-30 transition-all font-sans text-xs font-bold px-3 flex items-center gap-1 text-gray-600"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              
              <div className="flex gap-1 mx-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = currentPage;
                  if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  
                  if (pageNum <= 0 || pageNum > totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 border font-sans text-xs font-bold transition-all ${
                        currentPage === pageNum 
                        ? 'bg-[#00599A] text-white border-[#00599A] shadow-lg shadow-[#00599A]/20' 
                        : 'bg-white border-gray-200 text-gray-600 hover:border-[#00599A] hover:text-[#00599A]'
                      }`}
                    >
                      {pageNum.toLocaleString('id-ID')}
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-30 transition-all font-sans text-xs font-bold px-3 flex items-center gap-1 text-gray-600"
              >
                Next <ChevronRight size={16} />
              </button>
              <button 
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-30 transition-all text-gray-600"
                title="Halaman Terakhir"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer Section */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-20 py-12 px-4 shadow-inner">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="font-sans font-bold uppercase tracking-widest text-gray-400 text-xs text-center md:text-left">Tentang Data Ini</h3>
            <div className="space-y-4 text-sm leading-loose text-gray-600">
              <p>
                <b>Sumber Data:</b> Diolah dari portal resmi Seleksi Nasional Penerimaan Mahasiswa Baru (SNPMB) 2026.
              </p>
              <p>
                <b>Prodi Baru:</b> Merupakan program studi yang baru dibuka tahun ini atau mengalami restrukturisasi sehingga data peminat tahun 2025 belum tersedia. Rasio keketatan dihitung dengan membagi jumlah peminat tahun 2025 dengan daya tampung tahun 2026.
              </p>
              <p>
                <b>Tingkat Keketatan:</b> 
                <span className="inline-block ml-1 px-1.5 py-0.5 rounded text-[10px] bg-[#00599A]/10 text-[#00599A] font-bold uppercase mr-1">Ketat (1:10+)</span>
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-[#F3C727]/10 text-brand-gold-darker font-bold uppercase mr-1">Sedang (1:3-10)</span>
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-700 font-bold uppercase">Rendah (1:0-3)</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end justify-center md:justify-end gap-6 border-t md:border-t-0 md:border-l border-gray-200 pt-8 md:pt-0 md:pl-12">
            <div className="text-center md:text-right">
              <div className="text-4xl font-serif font-bold text-[#c92b2c] mb-1">kompas.id</div>
              <div className="text-xs font-sans font-bold uppercase tracking-tight text-gray-400">Amanat Hati Nurani Rakyat</div>
            </div>
            <div className="text-xs font-sans text-gray-500 italic">
              Diolah: Kompas/ST
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
