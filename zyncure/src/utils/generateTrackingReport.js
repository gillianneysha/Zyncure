import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePDF = async (loggedDates, userInfo = {}, options = {}) => {
    const { returnBlob = false, download = true } = options;
    const { jsPDF } = await import('jspdf');

    // Convert image URL to base64
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
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    let y = 20;

    // Header
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

    // Patient Information
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

    // Summary
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

    // Category Breakdown
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

    // Helper function to check page break
    const checkPageBreak = (neededHeight) => {
        if (y + neededHeight > pageHeight - 20) {
            doc.addPage();
            y = 20;
        }
    };

    // Helper function to add chart image to PDF
    const addChartToPDF = async (chartElement, title, width = 170, height = 90) => {
        try {
            checkPageBreak(height + 30);

            // Chart title
            doc.setFontSize(13);
            doc.setTextColor(...COLORS.brown);
            doc.setFont('helvetica', 'bold');
            doc.text(title, margin, y);
            y += 8;

            // Capture chart as canvas
            const canvas = await html2canvas(chartElement, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true,
                allowTaint: true
            });

            // Convert canvas to image data
            const imgData = canvas.toDataURL('image/png');

            // Add image to PDF
            const imgX = (pageWidth - width) / 2;
            doc.addImage(imgData, 'PNG', imgX, y, width, height);
            y += height + 10;

            return true;
        } catch (error) {
            console.error(`Error capturing chart "${title}":`, error);

            // Add placeholder text
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...COLORS.teal);
            doc.text(`Chart "${title}" could not be captured`, margin, y);
            y += 15;

            return false;
        }
    };

    try {
        // Charts Section
        doc.setFontSize(13);
        doc.setTextColor(...COLORS.brown);
        doc.setFont('helvetica', 'bold');
        doc.text('Visual Analytics', margin, y);
        y += 8;

        // Wait for charts to be fully rendered
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Capture charts from the DOM
        const chartContainers = document.querySelectorAll('.chart-container');
        const rechartsContainers = document.querySelectorAll('.recharts-wrapper');

        if (rechartsContainers.length > 0) {
            // Define chart titles based on the order they appear in PatientCharts
            const chartTitles = [
                'Period Flow Patterns',
                'Most Common Symptoms',
                'Mood Tracking Over Time',
                'Energy Level Trends',
                'Weight Management Progress',
                'Food Cravings Pattern'
            ];

            for (let i = 0; i < Math.min(rechartsContainers.length, chartTitles.length); i++) {
                const chartElement = rechartsContainers[i];
                const title = chartTitles[i];

                if (chartElement && chartElement.offsetParent !== null) {
                    await addChartToPDF(chartElement, title);
                }
            }
        } else if (chartContainers.length > 0) {
            // Process identified chart containers
            for (let i = 0; i < chartContainers.length; i++) {
                const chartContainer = chartContainers[i];
                const title = chartContainer.getAttribute('data-chart-title') || `Chart ${i + 1}`;
                await addChartToPDF(chartContainer, title);
            }
        } else {
            // No charts found
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...COLORS.teal);
            doc.text('Charts are not available in this report.', margin, y);
            doc.text('Please ensure you have symptom data logged to generate visual analytics.', margin, y + 8);
            y += 20;
        }

        // Recent Entries
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

        // Monthly Overview
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

        // Footer
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

        // Generate filename with timestamp
        const fileName = `zyncure-tracker-report-${new Date().toISOString().slice(0, 10)}.pdf`;
        
        // Return blob if requested, otherwise save/download
        if (returnBlob) {
            return {
                blob: doc.output('blob'),
                filename: fileName
            };
        } else if (download) {
            doc.save(fileName);
            return fileName;
        } else {
            return {
                doc: doc,
                filename: fileName
            };
        }

    } catch (error) {
        console.error('Error generating PDF:', error);
        throw new Error('Failed to generate PDF report');
    }
};

// Enhanced chart capture function
export const captureChartsForPDF = async () => {
    const chartData = [];

    try {
        // Wait for charts to be fully rendered
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Find all chart containers
        const chartElements = document.querySelectorAll('.recharts-wrapper');

        for (let i = 0; i < chartElements.length; i++) {
            const element = chartElements[i];

            if (element && element.offsetParent !== null) {
                try {
                    const canvas = await html2canvas(element, {
                        backgroundColor: '#ffffff',
                        scale: 2,
                        logging: false,
                        useCORS: true,
                        allowTaint: true,
                        width: element.offsetWidth,
                        height: element.offsetHeight
                    });

                    const imgData = canvas.toDataURL('image/png');
                    chartData.push({
                        index: i,
                        imageData: imgData,
                        width: element.offsetWidth,
                        height: element.offsetHeight,
                        title: `Chart ${i + 1}`
                    });
                } catch (error) {
                    console.error(`Failed to capture chart ${i}:`, error);
                }
            }
        }

        return chartData;
    } catch (error) {
        console.error('Error capturing charts:', error);
        return [];
    }
};

// Convenience function for generating PDF as blob (for sharing)
export const generatePDFAsBlob = async (loggedDates, userInfo = {}) => {
    const result = await generatePDF(loggedDates, userInfo, { returnBlob: true, download: false });
    return result.blob;
};

// Convenience function for downloading PDF (existing behavior)
export const downloadPDF = async (loggedDates, userInfo = {}) => {
    return await generatePDF(loggedDates, userInfo, { returnBlob: false, download: true });
};