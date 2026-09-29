import { StudentStatusRecord, Major, InternshipType, ApplicationStatus } from './types';
import { formatDateBE } from './dateUtils';

const getMajorLabel = (m: Major): string => {
  switch (m) {
    case Major.HALAL_FOOD: return 'R&D (อาหารฮาลาล)';
    case Major.DIGITAL_TECH: return 'TDS (ดิจิทัล)';
    case Major.INFO_TECH: return 'IT (เทคโนโลยีฯ)';
    case Major.DATA_SCIENCE: return 'DSA (วิทยาการข้อมูล)';
    default: return String(m || '-');
  }
};

const getStatusLabel = (s: ApplicationStatus): string => {
  switch (s) {
    case ApplicationStatus.ACCEPTED: return 'ตอบรับแล้ว';
    case ApplicationStatus.PREPARING: return 'กำลังจัดเตรียม';
    case ApplicationStatus.REJECTED: return 'ปฏิเสธ';
    case ApplicationStatus.PENDING:
    default:
      return 'รอตรวจสอบ';
  }
};

export const exportToExcel = (students: StudentStatusRecord[], customTitle?: string) => {
  const title = customTitle || 'รายงานรายชื่อนักศึกษาฝึกงานและสหกิจศึกษา';
  const printDate = new Date().toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const tableHeader = `
    <tr style="background-color: #630330; color: #ffffff; font-weight: bold; text-align: center; height: 36px;">
      <th style="border: 1px solid #d1d5db; padding: 8px;">ลำดับ</th>
      <th style="border: 1px solid #d1d5db; padding: 8px;">รหัสนักศึกษา</th>
      <th style="border: 1px solid #d1d5db; padding: 8px; min-width: 180px;">ชื่อ-นามสกุล</th>
      <th style="border: 1px solid #d1d5db; padding: 8px;">สาขาวิชา</th>
      <th style="border: 1px solid #d1d5db; padding: 8px;">ประเภท</th>
      <th style="border: 1px solid #d1d5db; padding: 8px; min-width: 180px;">สถานที่ฝึกงาน</th>
      <th style="border: 1px solid #d1d5db; padding: 8px;">ตำแหน่งงาน</th>
      <th style="border: 1px solid #d1d5db; padding: 8px;">ภาคเรียน</th>
      <th style="border: 1px solid #d1d5db; padding: 8px;">ปีการศึกษา</th>
      <th style="border: 1px solid #d1d5db; padding: 8px;">วันที่เริ่ม</th>
      <th style="border: 1px solid #d1d5db; padding: 8px;">วันที่สิ้นสุด</th>
      <th style="border: 1px solid #d1d5db; padding: 8px;">สถานะ</th>
      <th style="border: 1px solid #d1d5db; padding: 8px; min-width: 160px;">อาจารย์นิเทศ</th>
      <th style="border: 1px solid #d1d5db; padding: 8px;">หมายเหตุ</th>
    </tr>
  `;

  const tableRows = students.map((s, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'}; height: 30px;">
      <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: center;">${index + 1}</td>
      <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: center; font-family: monospace;">'${s.studentId}'</td>
      <td style="border: 1px solid #e5e7eb; padding: 6px; font-weight: bold;">${s.name || '-'}</td>
      <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: center;">${getMajorLabel(s.major)}</td>
      <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: center;">${s.internshipType === InternshipType.INTERNSHIP ? 'ฝึกงาน' : 'สหกิจศึกษา'}</td>
      <td style="border: 1px solid #e5e7eb; padding: 6px;">${s.location || '-'}</td>
      <td style="border: 1px solid #e5e7eb; padding: 6px;">${s.position || '-'}</td>
      <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: center;">${s.term || '-'}</td>
      <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: center;">${s.academicYear || '-'}</td>
      <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: center;">${formatDateBE(s.startDate)}</td>
      <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: center;">${formatDateBE(s.endDate)}</td>
      <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: center;">${getStatusLabel(s.status)}</td>
      <td style="border: 1px solid #e5e7eb; padding: 6px;">${s.supervisor || '-'}</td>
      <td style="border: 1px solid #e5e7eb; padding: 6px;">${s.remarks || '-'}</td>
    </tr>
  `).join('');

  const excelTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>รายชื่อนักศึกษา</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Sarabun', 'Anuphan', Tahoma, sans-serif; font-size: 11pt; }
      </style>
    </head>
    <body>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td colspan="14" style="font-size: 16pt; font-weight: bold; color: #630330; text-align: center; padding: 10px;">
            มหาวิทยาลัยฟาฏอนี • คณะวิทยาศาสตร์และเทคโนโลยี
          </td>
        </tr>
        <tr>
          <td colspan="14" style="font-size: 13pt; font-weight: bold; text-align: center; padding: 5px;">
            ${title} (หน่วยจัดการศึกษาวิทยาศาสตร์บูรณาการกับการทำงาน WISE)
          </td>
        </tr>
        <tr>
          <td colspan="14" style="font-size: 10pt; color: #6b7280; text-align: center; padding-bottom: 12px;">
            ข้อมูล ณ วันที่: ${printDate} | จำนวนนักศึกษาทั้งหมด: ${students.length} คน
          </td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db;">
        <thead>
          ${tableHeader}
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF' + excelTemplate], { 
    type: 'application/vnd.ms-excel;charset=utf-8;' 
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `WISE_Students_Report_${new Date().toISOString().split('T')[0]}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToWord = (students: StudentStatusRecord[], customTitle?: string) => {
  const title = customTitle || 'รายงานรายชื่อนักศึกษาฝึกงานและสหกิจศึกษา';
  const printDate = new Date().toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const tableRows = students.map((s, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
      <td style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; font-size: 10pt;">${index + 1}</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; font-family: monospace; font-size: 10pt;">${s.studentId}</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px 6px; font-weight: bold; font-size: 10pt;">${s.name || '-'}</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; font-size: 9.5pt;">${getMajorLabel(s.major)}</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; font-size: 9.5pt;">${s.internshipType === InternshipType.INTERNSHIP ? 'ฝึกงาน' : 'สหกิจ'}</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px 6px; font-size: 9.5pt;">${s.location || '-'}</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px 6px; font-size: 9.5pt;">${s.position || '-'}</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; font-size: 9.5pt;">${s.term || '-'}/${s.academicYear || '-'}</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; font-size: 9.5pt;">${getStatusLabel(s.status)}</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px 6px; font-size: 9.5pt;">${s.supervisor || '-'}</td>
    </tr>
  `).join('');

  const wordTemplate = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        @page Section1 {
          size: 841.9pt 595.3pt; /* A4 Landscape */
          mso-page-orientation: landscape;
          margin: 36pt 36pt 36pt 36pt;
        }
        div.Section1 { page: Section1; }
        body {
          font-family: 'TH Sarabun New', 'Sarabun', 'Cordia New', sans-serif;
          font-size: 14pt;
          line-height: 1.4;
          color: #1e293b;
        }
        h2 { margin: 0; color: #630330; font-size: 18pt; text-align: center; }
        h3 { margin: 4pt 0; font-size: 15pt; text-align: center; }
        p.sub { margin: 0 0 16pt 0; font-size: 11pt; color: #64748b; text-align: center; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10pt;
          font-size: 11pt;
        }
        th {
          background-color: #630330;
          color: white;
          padding: 8pt 6pt;
          font-weight: bold;
          border: 1px solid #94a3b8;
          text-align: center;
        }
        .signature-box {
          margin-top: 40pt;
          width: 100%;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <h2>มหาวิทยาลัยฟาฏอนี • คณะวิทยาศาสตร์และเทคโนโลยี</h2>
        <h3>${title}</h3>
        <p class="sub">หน่วยจัดการศึกษาวิทยาศาสตร์บูรณาการกับการทำงาน (WISE Unit) | ข้อมูล ณ วันที่: ${printDate} | จำนวน: ${students.length} คน</p>

        <table border="1" cellspacing="0" cellpadding="0">
          <thead>
            <tr>
              <th style="width: 40px;">ลำดับ</th>
              <th style="width: 90px;">รหัสนักศึกษา</th>
              <th style="width: 160px;">ชื่อ-นามสกุล</th>
              <th style="width: 110px;">สาขาวิชา</th>
              <th style="width: 60px;">รูปแบบ</th>
              <th>สถานที่ฝึกงาน</th>
              <th>ตำแหน่ง</th>
              <th style="width: 70px;">เทอม/ปี</th>
              <th style="width: 85px;">สถานะ</th>
              <th style="width: 130px;">อาจารย์นิเทศ</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <table class="signature-box" style="border: none;">
          <tr style="border: none;">
            <td style="border: none; width: 60%;"></td>
            <td style="border: none; width: 40%; text-align: center; font-size: 12pt;">
              ลงชื่อ.............................................................. ผู้จัดทำรายงาน<br/>
              (..............................................................)<br/>
              ตำแหน่ง.............................................................<br/>
              วันที่........ เดือน............................. พ.ศ. ...........
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF' + wordTemplate], { 
    type: 'application/msword;charset=utf-8;' 
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `WISE_Students_Report_${new Date().toISOString().split('T')[0]}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToPDF = (students: StudentStatusRecord[], customTitle?: string) => {
  const title = customTitle || 'รายงานรายชื่อนักศึกษาฝึกงานและสหกิจศึกษา';
  const printDate = new Date().toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('กรุณาอนุญาตป๊อปอัป (Pop-up) ในเบราว์เซอร์เพื่อสร้างไฟล์ PDF หรือพิมพ์รายงาน');
    return;
  }

  const tableRows = students.map((s, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 6px 4px; text-align: center; border: 1px solid #cbd5e1;">${index + 1}</td>
      <td style="padding: 6px 4px; text-align: center; font-family: monospace; font-weight: bold; border: 1px solid #cbd5e1;">${s.studentId}</td>
      <td style="padding: 6px; font-weight: bold; border: 1px solid #cbd5e1;">${s.name || '-'}</td>
      <td style="padding: 6px; text-align: center; border: 1px solid #cbd5e1;">${getMajorLabel(s.major)}</td>
      <td style="padding: 6px; text-align: center; border: 1px solid #cbd5e1;">${s.internshipType === InternshipType.INTERNSHIP ? 'ฝึกงาน' : 'สหกิจ'}</td>
      <td style="padding: 6px; border: 1px solid #cbd5e1;">${s.location || '-'}</td>
      <td style="padding: 6px; border: 1px solid #cbd5e1;">${s.position || '-'}</td>
      <td style="padding: 6px; text-align: center; border: 1px solid #cbd5e1;">${s.term || '-'}/${s.academicYear || '-'}</td>
      <td style="padding: 6px; text-align: center; border: 1px solid #cbd5e1;">
        <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8pt; font-weight: bold; ${
          s.status === ApplicationStatus.ACCEPTED ? 'background-color: #ecfdf5; color: #059669;' :
          s.status === ApplicationStatus.REJECTED ? 'background-color: #fff1f2; color: #e11d48;' :
          s.status === ApplicationStatus.PREPARING ? 'background-color: #eff6ff; color: #2563eb;' :
          'background-color: #fffbeb; color: #d97706;'
        }">
          ${getStatusLabel(s.status)}
        </span>
      </td>
      <td style="padding: 6px; font-weight: 500; border: 1px solid #cbd5e1;">${s.supervisor || '-'}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>${title} - พิมพ์ / บันทึกเป็น PDF</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        body {
          font-family: 'Sarabun', 'Anuphan', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 10px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .header {
          text-align: center;
          margin-bottom: 16px;
          border-bottom: 2px solid #630330;
          padding-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 18px;
          color: #630330;
          font-weight: 800;
        }
        .header h2 {
          margin: 4px 0;
          font-size: 14px;
          color: #334155;
          font-weight: bold;
        }
        .header .meta {
          font-size: 11px;
          color: #64748b;
          margin-top: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }
        th {
          background-color: #630330 !important;
          color: white !important;
          padding: 7px 4px;
          font-weight: bold;
          border: 1px solid #470222;
          text-align: center;
        }
        .no-print {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
          padding: 10px 16px;
          margin-bottom: 15px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        @media print {
          .no-print { display: none !important; }
        }
        button {
          background-color: #630330;
          color: white;
          border: none;
          padding: 8px 18px;
          font-size: 13px;
          font-weight: bold;
          border-radius: 6px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="no-print">
        <div>
          <strong>พิมพ์รายงาน / บันทึกเป็น PDF</strong> - กดปุ่มด้านขวา หรือกด Ctrl + P แล้วเลือกปลายทางเป็น "Save as PDF"
        </div>
        <button onclick="window.print()">พิมพ์ / บันทึก PDF</button>
      </div>

      <div class="header">
        <h1>มหาวิทยาลัยฟาฏอนี • คณะวิทยาศาสตร์และเทคโนโลยี</h1>
        <h2>${title}</h2>
        <div class="meta">
          หน่วยจัดการศึกษาวิทยาศาสตร์บูรณาการกับการทำงาน (WISE Unit) | ข้อมูล ณ วันที่: ${printDate} | จำนวนนักศึกษา: ${students.length} คน
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th style="width: 75px;">รหัสนักศึกษา</th>
            <th style="width: 140px;">ชื่อ-นามสกุล</th>
            <th style="width: 100px;">สาขาวิชา</th>
            <th style="width: 50px;">รูปแบบ</th>
            <th>สถานที่ฝึกงาน</th>
            <th>ตำแหน่งงาน</th>
            <th style="width: 60px;">เทอม/ปี</th>
            <th style="width: 75px;">สถานะ</th>
            <th style="width: 120px;">อาจารย์นิเทศ</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `);

  printWindow.document.close();
  // Auto trigger print after short delay
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 400);
};
