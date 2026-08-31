# 💧 Meter Bill App (ระบบคำนวณและบันทึกสถิติมิเตอร์น้ำประปา)

แอปพลิเคชันเว็บแบบ **Progressive Web App (PWA)** สำหรับบันทึก คำนวณกระจายยอดใช้น้ำประปารายวัน และออกเอกสารรายงานสรุปมิเตอร์ พร้อมเชื่อมต่อ **Google Sheets** เพื่อจัดเก็บข้อมูลอย่างเป็นระบบ

---

## ✨ ฟีเจอร์หลัก (Key Features)

### 1. 📍 จัดการสถานที่ / ห้อง / บ้านเลขที่ (Locations Management)
- เลือกสถานที่จากรายการที่เคยบันทึกไว้
- ปุ่ม **+ เพิ่มสถานที่** สำหรับเพิ่มชื่อสถานที่ใหม่ได้ทันที และบันทึกไปยัง Google Sheets (แผ่นงาน `Locations`)

### 2. 🧮 คำนวณและกระจายค่าน้ำรายวัน (Daily Meter Calculation)
- **ตั้งค่าเดือนปัจจุบันอัตโนมัติ:** เมื่อเปิดระบบ ช่องเลือกเดือนจะดึงเดือน/ปี ปัจจุบันให้อัตโนมัติ (`yyyy-MM`)
- **กระจายยอดใช้น้ำ:** คำนวณยอดใช้รวม และเฉลี่ยกระจายเป็นจำนวนเต็มลงในแต่ละวันตามจำนวนวันของเดือนนั้นๆ พร้อมแสดงวันที่แบบภาษาไทย (เช่น `1 ก.ค. 69`)
- **สรุปผล:** แสดงยอดใช้น้ำทั้งหมด (หน่วย) และยอดใช้เฉลี่ยต่อวัน

### 3. 📄 เอกสารรายงาน & การแชร์ (Export & Sharing Options)
- **💾 บันทึกลง Google Sheets:** บันทึกยอดรวมประจำเดือนลงในแผ่นงาน `WaterMeterLogs` (หากเคยบันทึกเดือนและสถานที่เดิมแล้ว ระบบจะทำการอัปเดตข้อมูลให้อัตโนมัติ)
- **📱 แชร์ไปยัง LINE (PDF):** ส่งออกใบสรุปสถิติตามแบบฟอร์มมาตรฐานเป็น **ไฟล์ PDF** และเปิด Share Sheet เพื่อแชร์ไปยัง LINE หรือแอปอื่นบนมือถือได้ทันที
- **🖼️ Save as Image (PNG):** ดาวน์โหลดรูปภาพใบสรุปสถิติความละเอียดสูง
- **📥 Save as PDF:** ดาวน์โหลดเอกสารสรุปสถิติการใช้น้ำประปารูปแบบ PDF (A4)

### 4. 📜 ระบบประวัติการจดมิเตอร์ (Meter History & Dashboard)
- ดูประวัติการบันทึกมิเตอร์ย้อนหลังดึงจาก Google Sheets
- ระบบ **Pagination** สำหรับพลิกหน้าดูประวัติ (10 รายการต่อหน้า)
- ปุ่ม **"เปิดบิล"** สำหรับดึงข้อมูลในอดีตกลับมาคำนวณหรือออกเอกสารใหม่ได้ทันที

### 5. ⚙️ ระบบตั้งค่า Google Sheets ครั้งแรก (Initial Setup)
- ปุ่มตั้งค่าอัตโนมัติ สร้างแท็บ `WaterMeterLogs` และ `Locations` พร้อมเขียนหัวตาราง (Headers) ให้อัตโนมัติ

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS + Lucide Icons
- **Database / Storage:** Google Sheets API (`googleapis`)
- **PDF & Image Generation:** `jspdf` + `html-to-image`
- **PWA:** `@ducanh2912/next-pwa` รองรับการติดตั้งลงหน้าจอมือถือ (Add to Home Screen)

---

## 🚀 การใช้งานเบื้องต้น (Getting Started)

1. ติดตั้ง Dependencies:
```bash
npm install
```

2. ตั้งค่า Environment Variables ใน `.env.local`:
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_SHEET_ID=your_google_sheet_id
```

3. รัน Development Server:
```bash
npm run dev
```
เปิดใช้งานผ่านเบราว์เซอร์ที่ `http://localhost:3000`

