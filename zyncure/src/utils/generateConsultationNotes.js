
import { jsPDF } from 'jspdf';


// Cache for base64 logo to avoid repeated conversions
let logoBase64Cache = null;
let logoLoadPromise = null;


// Preload and cache the logo
const preloadLogo = async () => {
    if (logoBase64Cache) return logoBase64Cache;


    if (!logoLoadPromise) {
        logoLoadPromise = convertImageUrlToBase64('/zyncure_logo_v2.png')
            .then(base64 => {
                logoBase64Cache = base64;
                return base64;
            })
            .catch(err => {
                console.warn('Logo loading failed:', err);
                return null;
            });
    }


    return logoLoadPromise;
};


// Optimized image conversion with timeout
async function convertImageUrlToBase64(url, timeout = 3000) {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        const timeoutId = setTimeout(() => {
            reject(new Error('Image load timeout'));
        }, timeout);


        img.crossOrigin = 'Anonymous';
        img.onload = function () {
            clearTimeout(timeoutId);
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/png', 0.8); // Reduced quality for faster processing
                resolve(dataURL);
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = function (err) {
            clearTimeout(timeoutId);
            reject(err);
        };
        img.src = url;
    });
}


// Pre-calculate date strings to avoid repeated calculations
const getDateTimeStrings = () => {
    const now = new Date();


    // Manila timezone date for filename
    const fileDateStr = now.toLocaleDateString('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });


    // Manila timezone for display
    const currentDateTime = now.toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });


    // Footer date/time
    const dateStr = now.toLocaleDateString('en-US', {
        timeZone: 'Asia/Manila'
    });
    const timeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit'
    });


    return { fileDateStr, currentDateTime, dateStr, timeStr };
};


export const generateConsultationNotesPDF = async (noteText, doctorInfo = {}, patientInfo = {}, options = {}) => {
    const { returnBlob = false, download = false } = options;


    const COLORS = {
        orange: [244, 107, 93],
        light: [254, 222, 210],
        deepOrange: [241, 86, 41],
        teal: [85, 161, 164],
        pink: [255, 237, 231],
        brown: [182, 92, 75],
    };


    try {
        // Start logo loading but don't wait for it initially
        const logoPromise = preloadLogo();


        // Pre-calculate all date strings
        const { fileDateStr, currentDateTime, dateStr, timeStr } = getDateTimeStrings();


        // Pre-calculate doctor name
        const doctorName = doctorInfo.first_name && doctorInfo.last_name
            ? `${doctorInfo.first_name} ${doctorInfo.last_name}`
            : doctorInfo.name || doctorInfo.full_name || doctorInfo.email || "Doctor";


        const doctorNameForFile = doctorName.replace(/\s+/g, '-');
        const fileName = `${fileDateStr} - CONSULTATION NOTES - DR. ${doctorNameForFile}.pdf`;


        // Initialize PDF
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 18;
        let y = 20;


        // Header with ZynCure branding
        doc.setFillColor(...COLORS.orange);
        doc.rect(0, 0, pageWidth, 32, 'F');


        // Try to add logo (non-blocking)
        try {
            const logoBase64 = await Promise.race([
                logoPromise,
                new Promise(resolve => setTimeout(() => resolve(null), 500)) // 500ms timeout
            ]);


            if (logoBase64 && logoBase64.startsWith('data:image')) {
                doc.addImage(logoBase64, 'PNG', margin, 6, 20, 20);
            }
        } catch (err) {
            console.warn('Logo loading skipped due to timeout or error:', err);
        }


        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('Consultation Notes', pageWidth / 2, 20, { align: 'center' });


        y = 38;


        // Doctor Information Section
        doc.setFillColor(...COLORS.pink);
        doc.roundedRect(margin, y, pageWidth - margin * 2, 34, 6, 6, 'F');
        doc.setFontSize(12);
        doc.setTextColor(...COLORS.teal);
        doc.setFont('helvetica', 'bold');
        doc.text('Doctor Information', margin + 6, y + 8);


        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(51, 51, 51);


        doc.text(`Doctor: ${doctorName}`, margin + 6, y + 16);


        if (doctorInfo.email) {
            doc.text(`Email: ${doctorInfo.email}`, margin + 6, y + 22);
        }


        doc.text(`Date Created: ${currentDateTime}`, margin + 6, y + 28);


        y += 38;


        // Patient Information Section (if provided)
        if (patientInfo.name || patientInfo.email) {
            doc.setFillColor(...COLORS.light);
            doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 5, 5, 'F');
            doc.setFontSize(12);
            doc.setTextColor(...COLORS.deepOrange);
            doc.setFont('helvetica', 'bold');
            doc.text('Patient Information', margin + 6, y + 8);


            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(51, 51, 51);


            if (patientInfo.name) {
                doc.text(`Patient: ${patientInfo.name}`, margin + 6, y + 16);
            }
            if (patientInfo.email) {
                doc.text(`Email: ${patientInfo.email}`, margin + 80, y + 16);
            }


            y += 26;
        }


        // Consultation Notes Section
        doc.setFillColor(...COLORS.teal);
        doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 5, 5, 'F');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('Consultation Notes', margin + 6, y + 8);


        y += 18;


        // Notes Content - Optimized text processing
        doc.setFontSize(12);
        doc.setTextColor(51, 51, 51);
        doc.setFont('helvetica', 'normal');


        // Optimize text splitting
        const maxWidth = pageWidth - margin * 2;
        const textLines = doc.splitTextToSize(noteText, maxWidth);


        // Batch process text lines for better performance
        const lineHeight = 6;
        const linesPerPage = Math.floor((pageHeight - 50) / lineHeight);


        for (let i = 0; i < textLines.length; i++) {
            // Check if we need a new page
            if (y > pageHeight - 30) {
                doc.addPage();
                y = 20;
            }


            doc.text(textLines[i], margin, y);
            y += lineHeight;
        }


        // Footer - Apply to all pages at once
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


        // Return result based on options
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
        console.error('Error generating consultation notes PDF:', error);
        throw new Error('Failed to generate consultation notes PDF');
    }
};


// Convenience function for generating PDF as blob (for uploading to storage)
export const generateConsultationNotesAsBlob = async (noteText, doctorInfo = {}, patientInfo = {}) => {
    const result = await generateConsultationNotesPDF(noteText, doctorInfo, patientInfo, {
        returnBlob: true,
        download: false
    });
    return result.blob;
};


// Convenience function for downloading PDF directly
export const downloadConsultationNotes = async (noteText, doctorInfo = {}, patientInfo = {}) => {
    return await generateConsultationNotesPDF(noteText, doctorInfo, patientInfo, {
        returnBlob: false,
        download: true
    });
};


// Optional: Preload logo on app initialization
export const initializeConsultationNotes = () => {
    preloadLogo().catch(err => console.warn('Logo preload failed:', err));
};



