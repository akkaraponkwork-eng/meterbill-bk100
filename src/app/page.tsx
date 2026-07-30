'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getDaysInMonth, format, startOfMonth, addDays } from 'date-fns';
import { Save, Download, ImageIcon, Activity, Share2, Calculator, History, Plus, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import { jsPDF } from 'jspdf';

type HistoryRecord = {
  location: string;
  month: string;
  prevReading: string;
  currReading: string;
  totalUsage: string;
};

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'calculate' | 'history'>('calculate');

  // Calculate States
  const [location, setLocation] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [prevReading, setPrevReading] = useState<string>('');
  const [currReading, setCurrReading] = useState<string>('');
  
  // Locations Management
  const [locationsList, setLocationsList] = useState<string[]>([]);
  const [isAddingLocation, setIsAddingLocation] = useState(false);

  // Operation States
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  // History States
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 10;

  const exportSlipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    fetchLocations();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      if (data.success) setLocationsList(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.success) setHistoryData(data.data);
    } catch (e) {
      console.error(e);
    }
    setIsLoadingHistory(false);
  };

  const handleAddLocation = async () => {
    const newLoc = prompt('ป้อนชื่อสถานที่ใหม่ (เช่น บ้านผบ., ห้อง 101):');
    if (!newLoc || !newLoc.trim()) return;
    setIsAddingLocation(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: newLoc.trim() }),
      });
      if (res.ok) {
        await fetchLocations();
        setLocation(newLoc.trim());
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการเพิ่มสถานที่');
    }
    setIsAddingLocation(false);
  };

  const handleLoadHistory = (record: HistoryRecord) => {
    setLocation(record.location);
    setSelectedDate(record.month);
    setPrevReading(record.prevReading);
    setCurrReading(record.currReading);
    setActiveTab('calculate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isCalculable = selectedDate && prevReading && currReading && Number(currReading) >= Number(prevReading);

  const results = useMemo(() => {
    if (!isCalculable || !isMounted) return null;

    const prev = Number(prevReading);
    const curr = Number(currReading);
    
    const [year, month] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1);
    const daysInMonth = getDaysInMonth(dateObj);

    const totalUsage = Math.round(curr - prev);
    const baseUsage = Math.floor(totalUsage / daysInMonth);
    const remainder = totalUsage % daysInMonth;

    const start = startOfMonth(dateObj);
    let runningTotal = prev;

    const dailyList = Array.from({ length: daysInMonth }).map((_, i) => {
      const currentDayDate = addDays(start, i);
      const dailyUsage = i < remainder ? baseUsage + 1 : baseUsage;
      runningTotal += dailyUsage;

      return {
        date: format(currentDayDate, 'yyyy-MM-dd'),
        displayDate: format(currentDayDate, 'dd/MM/yyyy'),
        dailyUsage,
        meterReading: Math.round(runningTotal)
      };
    });

    return {
      totalUsage,
      dailyAverage: (totalUsage / daysInMonth),
      dailyList,
      prev,
      curr,
      month: selectedDate
    };
  }, [prevReading, currReading, selectedDate, isCalculable, isMounted]);

  const handleSaveToSheets = async () => {
    if (!results) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/meter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location.trim(),
          month: results.month,
          prevReading: results.prev,
          currReading: results.curr,
          totalUsage: results.totalUsage
        }),
      });

      if (res.ok) {
        alert('✅ บันทึกข้อมูลสำเร็จ!');
      } else {
        alert('❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (e) {
      alert('❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
    setIsSaving(false);
  };

  const handleExportPDF = async () => {
    if (!results || !exportSlipRef.current) return;
    setIsExporting(true);
    
    setTimeout(async () => {
      try {
        const dataUrl = await toPng(exportSlipRef.current!, { quality: 1, pixelRatio: 2 });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          const imgProps = pdf.getImageProperties(img);
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          pdf.addImage(img, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`meter-bill-${selectedDate || 'export'}.pdf`);
          setIsExporting(false);
        };
      } catch (err) {
        console.error('Error exporting PDF', err);
        setIsExporting(false);
      }
    }, 150);
  };

  const handleShare = async () => {
    if (!results || !exportSlipRef.current) return;
    setIsExporting(true);

    setTimeout(async () => {
      try {
        const blob = await toBlob(exportSlipRef.current!, { quality: 1, pixelRatio: 2 });
        if (!blob) throw new Error('Could not generate image blob');

        const file = new File([blob], `meter-bill-${selectedDate || 'export'}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'บิลค่าน้ำประปา',
            text: `บิลค่าน้ำประจำเดือน ${selectedDate} ${location ? `(สถานที่: ${location})` : ''}`
          });
        } else {
          alert('เบราว์เซอร์นี้ไม่รองรับการแชร์ไฟล์ภาพโดยตรง กรุณาใช้ปุ่ม Save as Image แทนครับ');
        }
      } catch (err) {
        console.error('Error sharing image', err);
        alert('เกิดข้อผิดพลาดในการแชร์');
      } finally {
        setIsExporting(false);
      }
    }, 150);
  };

  const handleExportImage = async () => {
    if (!results || !exportSlipRef.current) return;
    setIsExporting(true);
    
    setTimeout(async () => {
      try {
        const dataUrl = await toPng(exportSlipRef.current!, { quality: 1, pixelRatio: 2 });
        const link = document.createElement('a');
        link.download = `meter-bill-${selectedDate || 'export'}.png`;
        link.href = dataUrl;
        link.click();
        setIsExporting(false);
      } catch (err) {
        console.error('Error exporting Image', err);
        setIsExporting(false);
      }
    }, 150);
  };

  const handleSetupSheet = async () => {
    if (!confirm('ระบบจะทำการตรวจสอบและสร้างหน้า WaterMeterLogs, Locations พร้อมเขียนหัวตารางให้ คุณต้องการดำเนินการต่อหรือไม่?')) return;
    setIsSettingUp(true);
    try {
      const res = await fetch('/api/setup-sheet');
      const data = await res.json();
      if (res.ok) {
        alert('✅ ' + (data.message || 'ตั้งค่า Sheet สำเร็จ!'));
        fetchLocations();
      } else {
        alert('❌ เกิดข้อผิดพลาด: ' + (data.error || 'ไม่สามารถตั้งค่าได้'));
      }
    } catch {
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
    setIsSettingUp(false);
  };

  if (!isMounted) return null;

  const totalPages = Math.ceil(historyData.length / itemsPerPage);
  const currentHistory = historyData.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage);

  return (
    <div className="min-h-screen p-4 md:p-8 pb-24 max-w-2xl mx-auto flex flex-col gap-6 font-sans relative">
      
      <header className="flex flex-col items-center gap-2 pb-2 pt-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-2">
          <Activity className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Meter Bill App</h1>
      </header>

      {/* CALCULATOR TAB */}
      <div className={activeTab === 'calculate' ? 'flex flex-col gap-6' : 'hidden'}>
        
        {/* Locations Manager */}
        <div className="glass-panel p-5 bg-white flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
              <MapPin className="w-4 h-4 text-blue-500" /> สถานที่ / ห้อง / บ้านเลขที่
            </label>
            <button 
              onClick={handleAddLocation}
              disabled={isAddingLocation}
              className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-full font-medium transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> เพิ่มสถานที่
            </button>
          </div>
          
          {locationsList.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {locationsList.map((loc, idx) => (
                <button
                  key={idx}
                  onClick={() => setLocation(loc)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                    location === loc 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">ยังไม่มีสถานที่ที่บันทึกไว้ กดปุ่ม + เพื่อเพิ่ม</p>
          )}

          <input
            type="text"
            placeholder="หรือพิมพ์ชื่อสถานที่ตรงนี้..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="clean-input w-full p-3 text-base mt-2"
          />
        </div>

        {/* INTERACTIVE UI PANEL */}
        <div className="glass-panel p-6 flex flex-col gap-5 bg-white">
          <div className="flex flex-col gap-2">
            <label htmlFor="month" className="text-sm font-semibold text-slate-700">เลือกเดือน</label>
            <input
              id="month"
              type="month"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="clean-input w-full p-3 text-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="prev" className="text-sm font-semibold text-slate-700">เลขเดือนก่อน</label>
              <input
                id="prev"
                type="number"
                placeholder="0"
                value={prevReading}
                onChange={(e) => setPrevReading(e.target.value)}
                className="clean-input w-full p-3 text-lg"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="curr" className="text-sm font-semibold text-slate-700">เลขเดือนนี้</label>
              <input
                id="curr"
                type="number"
                placeholder="0"
                value={currReading}
                onChange={(e) => setCurrReading(e.target.value)}
                className="clean-input w-full p-3 text-lg"
              />
            </div>
          </div>
        </div>

        {results && (
          <div className="glass-panel p-6 bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex flex-col items-center gap-1 shadow-lg shadow-blue-900/20">
            <span className="text-blue-100 text-sm font-medium">ยอดใช้งานทั้งหมด</span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tight">{results.totalUsage}</span>
              <span className="text-lg font-medium text-blue-100">หน่วย</span>
            </div>
            <span className="text-blue-200 text-sm mt-2 font-medium bg-white/10 px-3 py-1 rounded-full">
              เฉลี่ยใช้วันละ {results.dailyAverage.toFixed(2)} หน่วย
            </span>
          </div>
        )}

        {results && (
          <div className="glass-panel p-6 bg-white flex flex-col gap-4 border-2 border-blue-50">
            {!isExporting && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSaveToSheets}
                  disabled={isSaving}
                  className="primary-button w-full py-4 flex items-center justify-center gap-2 text-lg shadow-md"
                >
                  <Save className="w-5 h-5" />
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึกลง Google Sheets'}
                </button>

                <button
                  onClick={handleShare}
                  disabled={isSaving}
                  className="bg-[#06C755] hover:bg-[#05b34c] text-white font-semibold rounded-lg w-full py-4 flex items-center justify-center gap-2 text-lg shadow-md transition-all"
                >
                  <Share2 className="w-5 h-5" />
                  แชร์ไปยัง LINE (มือถือ)
                </button>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleExportImage}
                    className="secondary-button py-3 flex items-center justify-center gap-2 text-sm shadow-sm"
                  >
                    <ImageIcon className="w-4 h-4" /> Save as Image
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="secondary-button py-3 flex items-center justify-center gap-2 text-sm shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Save as PDF
                  </button>
                </div>
              </div>
            )}

            <div className="mt-2">
              <h3 className="text-sm font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2">สรุปมิเตอร์รายวัน</h3>
              <div className="overflow-x-auto rounded border border-slate-200 shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="p-3 font-semibold">วันที่</th>
                      <th className="p-3 font-semibold text-right">ยอดใช้ (หน่วย)</th>
                      <th className="p-3 font-semibold text-right">เลขบนมิเตอร์</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.dailyList.map((day, idx) => (
                      <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-slate-700">{day.displayDate}</td>
                        <td className="p-3 text-right font-medium text-blue-600">{day.dailyUsage}</td>
                        <td className="p-3 text-right font-semibold text-slate-800">{day.meterReading}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* DASHBOARD TAB */}
      <div className={activeTab === 'history' ? 'flex flex-col gap-6' : 'hidden'}>
        <div className="glass-panel p-6 bg-white flex flex-col gap-4 min-h-[400px]">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <History className="w-5 h-5 text-blue-600" /> ประวัติการจดมิเตอร์
          </h2>

          {isLoadingHistory ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">กำลังโหลดข้อมูล...</div>
          ) : historyData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-2 mt-8">
              <Activity className="w-8 h-8 text-slate-200" />
              ยังไม่มีประวัติการบันทึก
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200">
                      <th className="pb-2 font-semibold px-2">สถานที่</th>
                      <th className="pb-2 font-semibold px-2">เดือน</th>
                      <th className="pb-2 font-semibold px-2 text-right">ยอดใช้รวม</th>
                      <th className="pb-2 font-semibold px-2 text-center">แอคชัน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentHistory.map((record, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-3 px-2 font-medium text-slate-800">{record.location}</td>
                        <td className="py-3 px-2 text-slate-600">{record.month}</td>
                        <td className="py-3 px-2 text-right font-bold text-blue-600">{record.totalUsage}</td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => handleLoadHistory(record)}
                            className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-medium hover:bg-blue-600 hover:text-white transition-all opacity-80 group-hover:opacity-100"
                          >
                            เปิดบิล
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
                  <button
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="p-2 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <span className="text-sm font-medium text-slate-500">
                    หน้า {historyPage} จาก {totalPages}
                  </span>
                  <button
                    onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                    disabled={historyPage === totalPages}
                    className="p-2 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 text-center pb-8">
        <button
          onClick={handleSetupSheet}
          disabled={isSettingUp}
          className="text-xs text-slate-400 hover:text-blue-600 underline underline-offset-2 transition-colors"
        >
          {isSettingUp ? 'กำลังเตรียม Google Sheets...' : 'ตั้งค่าหน้า Google Sheets ครั้งแรก'}
        </button>
      </div>

      {/* HIDDEN PROFESSIONAL EXPORT SLIP */}
      {results && (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <div ref={exportSlipRef} className="w-[600px] bg-white p-8 text-slate-800 flex flex-col gap-6">
            <div className="flex justify-between items-end border-b-2 border-slate-800 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">Water Meter Report</h1>
                <p className="text-sm font-medium text-slate-500 mt-2">สถานที่: <span className="text-slate-800 font-bold">{location || 'ไม่ระบุสถานที่'}</span></p>
                <p className="text-sm font-medium text-slate-500 mt-1">ประจำเดือน: <span className="text-slate-800 font-bold">{selectedDate}</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-400">วันที่พิมพ์เอกสาร</p>
                <p className="text-sm font-bold text-slate-800">{format(new Date(), 'dd/MM/yyyy')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-1">เลขมิเตอร์เดือนก่อน</p>
                <p className="text-xl font-bold text-slate-800">{results.prev} <span className="text-sm font-medium text-slate-500">หน่วย</span></p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-1">เลขมิเตอร์เดือนนี้</p>
                <p className="text-xl font-bold text-slate-800">{results.curr} <span className="text-sm font-medium text-slate-500">หน่วย</span></p>
              </div>
            </div>

            <div className="bg-blue-50 p-5 rounded-lg border border-blue-200 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-blue-900">ยอดการใช้น้ำรวมทั้งหมด</p>
                <p className="text-xs font-medium text-blue-700 mt-1">เฉลี่ยวันละ {results.dailyAverage.toFixed(2)} หน่วย</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black text-blue-700">{results.totalUsage} <span className="text-lg font-bold text-blue-600">หน่วย</span></p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">ตารางแจกแจงการใช้น้ำรายวัน</h3>
              <table className="w-full text-sm text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-3 font-semibold text-slate-800 border border-slate-200">วันที่</th>
                    <th className="p-3 font-semibold text-slate-800 text-right border border-slate-200">ยอดใช้ (หน่วย)</th>
                    <th className="p-3 font-semibold text-slate-800 text-right border border-slate-200">เลขบนมิเตอร์</th>
                  </tr>
                </thead>
                <tbody>
                  {results.dailyList.map((day, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="p-3 text-slate-800 border border-slate-200">{day.displayDate}</td>
                      <td className="p-3 text-right font-medium text-slate-700 border border-slate-200">{day.dailyUsage}</td>
                      <td className="p-3 text-right font-bold text-slate-800 border border-slate-200">{day.meterReading}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-center text-xs text-slate-400">
              <p>เอกสารฉบับนี้ถูกสร้างขึ้นอัตโนมัติโดย Meter Bill App</p>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 pb-safe shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-50">
        <button
          onClick={() => setActiveTab('calculate')}
          className={`flex flex-col items-center gap-1 w-full py-2 rounded-xl transition-colors ${
            activeTab === 'calculate' ? 'text-blue-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
          }`}
        >
          <div className={`${activeTab === 'calculate' ? 'bg-blue-100 p-1.5 rounded-lg' : 'p-1.5'}`}>
            <Calculator className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold">คำนวณ</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 w-full py-2 rounded-xl transition-colors ${
            activeTab === 'history' ? 'text-blue-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
          }`}
        >
          <div className={`${activeTab === 'history' ? 'bg-blue-100 p-1.5 rounded-lg' : 'p-1.5'}`}>
            <History className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold">ประวัติ</span>
        </button>
      </div>
    </div>
  );
}
