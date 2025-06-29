
async function convertImageUrlToBase64(url) {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = function (err) {
            reject(err);
        };
        img.src = url;
    });
}

export const generatePDF = async (loggedDates, userInfo = {}) => {
    const { jsPDF } = await import('jspdf');

  
    const COLORS = {
        orange: [244, 107, 93],
        light: [254, 222, 210],
        deepOrange: [241, 86, 41],
        teal: [85, 161, 164],
        pink: [255, 237, 231],
        brown: [182, 92, 75],
    };


    const logoBase64 = await convertImageUrlToBase64('/zyncure_logo_v2.png');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 18;
    let y = 20;


    doc.setFillColor(...COLORS.orange);
    doc.rect(0, 0, pageWidth, 32, 'F');
    if (logoBase64 && logoBase64.startsWith('data:image')) {
        doc.addImage(logoBase64, 'PNG', margin, 6, 20, 20);
    }
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');

    doc.text('Symptom Tracker Report', pageWidth / 2, 20, { align: 'center' });

    y = 38;


    doc.setFillColor(...COLORS.pink);

    doc.roundedRect(margin, y, pageWidth - margin * 2, 32, 6, 6, 'F');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.teal);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Information', margin + 6, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(51, 51, 51);
    let infoY = y + 16;

    if (userInfo.name) doc.text(`Name: ${userInfo.name}`, margin + 6, infoY);
    if (userInfo.email) doc.text(`Email: ${userInfo.email}`, margin + 80, infoY);

    if (userInfo.birthdate) doc.text(`Birthdate: ${userInfo.birthdate}`, margin + 6, infoY + 7);

    y += 36; 

    doc.setFillColor(...COLORS.light);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 5, 5, 'F');
    doc.setFontSize(15);
    doc.setTextColor(...COLORS.deepOrange);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', margin + 6, y + 9);

    doc.setFontSize(11);
    doc.setTextColor(...COLORS.teal);
    doc.setFont('helvetica', 'normal');
    const totalEntries = loggedDates.length;
    const uniqueDates = [...new Set(loggedDates.map(entry =>
        new Date(entry.date_logged).toDateString()
    ))].length;
    const categoryStats = loggedDates.reduce((acc, entry) => {
        acc[entry.symptoms] = (acc[entry.symptoms] || 0) + 1;
        return acc;
    }, {});
    doc.text(`Total Entries: ${totalEntries}`, margin + 6, y + 17);
    doc.text(`Days Tracked: ${uniqueDates}`, margin + 60, y + 17);
    doc.text(`Most Tracked: ${Object.keys(categoryStats).reduce((a, b) =>
        categoryStats[a] > categoryStats[b] ? a : b, 'None')}`, margin + 120, y + 17);

    y += 38;

    doc.setFontSize(13);
    doc.setTextColor(...COLORS.brown);
    doc.setFont('helvetica', 'bold');
    doc.text('Category Breakdown', margin, y);

    y += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.teal);
    Object.entries(categoryStats).forEach(([category, count]) => {
        doc.text(`${category}: ${count} entries`, margin + 4, y);
        y += 6;
    });

    y += 6;


    doc.setFontSize(13);
    doc.setTextColor(...COLORS.brown);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Entries', margin, y);

    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.teal);



const headers = ['Date', 'Category', 'Value'];
const colWidths = [55, 40, 70]; 
let x = margin;
headers.forEach((header, i) => {
    doc.text(header, x, y);
    x += colWidths[i];
});
y += 5;


doc.setTextColor(51, 51, 51);
const sortedEntries = [...loggedDates]
    .sort((a, b) => new Date(b.date_logged) - new Date(a.date_logged))
    .slice(0, 15);
sortedEntries.forEach(entry => {
    if (y > 260) {
        doc.addPage();
        y = 20;
    }
    x = margin;
    const dateStr = new Date(entry.date_logged).toLocaleString();
    const values = [dateStr, entry.symptoms, entry.severity];
    values.forEach((value, i) => {
        doc.text(String(value).substring(0, 30), x, y);
        x += colWidths[i];
    });
    y += 6;
});


    y += 8;

 
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.brown);
    doc.setFont('helvetica', 'bold');
    doc.text('Monthly Overview', margin, y);

    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.teal);


    const monthlyData = loggedDates.reduce((acc, entry) => {
        const date = new Date(entry.date_logged);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[monthKey]) acc[monthKey] = [];
        acc[monthKey].push(entry);
        return acc;
    }, {});

    Object.entries(monthlyData)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 6)
        .forEach(([month, entries]) => {
            if (y > 250) {
                doc.addPage();
                y = 20;
            }
            doc.setFontSize(11);
            doc.setTextColor(...COLORS.deepOrange);
            const [year, monthNum] = month.split('-');
            const monthName = new Date(year, monthNum - 1).toLocaleDateString('en', { month: 'long', year: 'numeric' });
            doc.text(monthName, margin + 4, y);
            y += 5;

            doc.setFontSize(10);
            doc.setTextColor(...COLORS.teal);
            doc.text(`Total entries: ${entries.length}`, margin + 12, y);
            y += 5;

            const monthlyCategoryStats = entries.reduce((acc, entry) => {
                acc[entry.symptoms] = (acc[entry.symptoms] || 0) + 1;
                return acc;
            }, {});

            Object.entries(monthlyCategoryStats).forEach(([category, count]) => {
                doc.text(`${category}: ${count}`, margin + 12, y);
                y += 5;
            });

            y += 4;
        });


    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.text(
            `Generated by ZynCure on: ${dateStr} at ${timeStr}`,
            margin,
            doc.internal.pageSize.height - 10
        );
        doc.text(
            `Page ${i} of ${pageCount}`,
            pageWidth - margin,
            doc.internal.pageSize.height - 10,
            { align: 'right' }
        );
    }


    const fileName = `zyncure-tracker-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);

    return fileName;
};