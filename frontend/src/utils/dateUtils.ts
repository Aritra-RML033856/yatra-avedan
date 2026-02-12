
export const formatDate = (dateString: string | Date | null | undefined, includeTime: boolean = false): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';

    // DD-MM-YYYY format
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    let formatted = `${day}-${month}-${year}`;

    if (includeTime) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        // formatted += ` ${hours}:${minutes}`; 
        // User asked for DD-MM-YYYY, usually implies just date. 
        // If time is needed, we can append it. 
        // For now, let's keep time if requested, but formatted nicely.
        // Actually, standardizing strictly to DD-MM-YYYY usually means date only.
        // But some views show "Created: <date> <time>". 
        // I will allow time appending.
        formatted += ` ${hours}:${minutes}`;
    }

    return formatted;
};

// Helper for just time if needed, though not explicitly requested.
export const formatTime = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};
