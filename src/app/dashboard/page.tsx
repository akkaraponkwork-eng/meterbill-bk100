'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale/th';
import {
  Droplets,
  MapPin,
  RefreshCw,
  Calendar,
  Calculator,
  Building2,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';

type HistoryRecord = {
  location: string;
  month: string;
  prevReading: string;
  currReading: string;
  totalUsage: string;
};

function formatThaiMonth(monthStr: string): string {
  try {
    const d = new Date(monthStr + '-01');
    const m = format(d, 'MMM', { locale: th });
    const y = (d.getFullYear() + 543).toString().slice(-2);
    return `${m} ${y}`;
  } catch {
    return monthStr;
  }
}

export default function DashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.success) {
        setHistoryData(data.data);
        setLastRefreshed(new Date());
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    setIsMounted(true);
    fetchData();
  }, []);

  // Initialize selectedMonth with the most recent month in the data
  useEffect(() => {
    if (historyData.length > 0 && !selectedMonth) {
      const months = Array.from(new Set(historyData.map(r => r.month))).sort().reverse();
      if (months.length > 0) {
        setSelectedMonth(months[0]);
      }
    }
  }, [historyData, selectedMonth]);

  // Computed Stats for the selected month
  const { availableMonths, locationUsages, totalLocationsRecorded } = useMemo(() => {
    const months = Array.from(new Set(historyData.map(r => r.month))).sort().reverse();
    
    if (!selectedMonth || historyData.length === 0) {
      return { availableMonths: months, locationUsages: [], totalLocationsRecorded: 0 };
    }

    const monthData = historyData.filter(r => r.month === selectedMonth);
    
    // Group by location (take the most recent record if duplicates exist)
    const locMap = new Map<string, HistoryRecord>();
    for (const r of monthData) {
      if (!locMap.has(r.location)) {
        locMap.set(r.location, r);
      }
    }
    
    const usages = Array.from(locMap.values()).sort((a, b) => Number(b.totalUsage) - Number(a.totalUsage));

    return {
      availableMonths: months,
      locationUsages: usages,
      totalLocationsRecorded: usages.length
    };
  }, [historyData, selectedMonth]);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(180deg, #e8edf5 0%, #f0f3fa 40%, #f8f9fc 100%)' }}>
      
      {/* HEADER */}
      <div className="px-5 pt-10 pb-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-slate-400 text-xs font-medium">Meter Bill App</p>
            <h1 className="text-xl font-bold text-slate-800">Water Dashboard</h1>
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 hover:shadow-md transition-all disabled:opacity-50"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {lastRefreshed && (
          <p className="text-[10px] text-slate-400">อัปเดตล่าสุด {format(lastRefreshed, 'HH:mm:ss')}</p>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 flex flex-col gap-5">
        
        {/* Month Selector */}
        {availableMonths.length > 0 && (
          <div className="bg-white/50 backdrop-blur rounded-2xl p-2 shadow-sm border border-slate-100 flex items-center gap-3 pl-4">
            <Calendar className="w-5 h-5 text-blue-500" />
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">ประจำเดือน</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>{formatThaiMonth(m)}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/80 p-5 rounded-3xl animate-pulse shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
                  <div className="h-4 bg-slate-200 rounded-full w-24" />
                </div>
                <div className="h-6 bg-slate-200 rounded-full w-12" />
              </div>
            ))}
          </div>
        ) : historyData.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 flex flex-col items-center gap-3 text-center shadow-sm">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
              <Droplets className="w-8 h-8 text-blue-300" />
            </div>
            <h3 className="font-bold text-slate-700">ยังไม่มีข้อมูล</h3>
            <p className="text-slate-400 text-sm">เริ่มต้นบันทึกมิเตอร์ครั้งแรกของคุณ</p>
            <Link
              href="/calculate"
              className="mt-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-2xl text-sm hover:bg-blue-700 transition-colors"
            >
              บันทึกมิเตอร์
            </Link>
          </div>
        ) : (
          <>
            {/* Summary Header */}
            <div className="flex items-end justify-between px-2">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                แยกยอดรายสถานที่
              </h2>
              <span className="text-xs font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">
                บันทึกแล้ว {totalLocationsRecorded} แห่ง
              </span>
            </div>

            {/* Individual Location Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {locationUsages.length > 0 ? (
                locationUsages.map((loc, idx) => (
                  <div key={idx} className="bg-white rounded-3xl p-4 flex items-center gap-4 shadow-sm border border-slate-100/80 hover:shadow-md transition-shadow group">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-800 truncate">{loc.location}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                          หลังสุด: {loc.currReading}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-400 font-medium mb-0.5">ยอดใช้</p>
                      <p className="text-lg font-black text-blue-600 tracking-tight">
                        {loc.totalUsage} <span className="text-[10px] font-bold text-slate-400 ml-0.5">หน่วย</span>
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center text-center">
                  <MapPin className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">ยังไม่มีการบันทึกของเดือนนี้</p>
                  <p className="text-xs text-slate-400 mt-1">กรุณาเลือกเดือนอื่น หรือเริ่มบันทึกมิเตอร์</p>
                </div>
              )}
            </div>

            {/* CTA Button */}
            <Link
              href="/calculate"
              className="w-full mt-4 py-4 flex items-center justify-center gap-2 text-base font-bold rounded-2xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 text-white"
              style={{ background: 'linear-gradient(135deg, #4f7df5 0%, #6e5ce7 100%)' }}
            >
              <Calculator className="w-5 h-5" />
              บันทึก / คำนวณมิเตอร์
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
