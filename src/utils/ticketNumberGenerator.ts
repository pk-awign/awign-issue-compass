/**
 * Generates a unique ticket number in the format: AWGN-YYYYMMDD-XXXX
 * Where:
 * - AWGN is the prefix
 * - YYYYMMDD is the current date
 * - XXXX is a random 4-digit number
 */
export const generateTicketNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  const dateStr = `${year}${month}${day}`;
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `AWGN-${dateStr}-${randomNum}`;
};