const Tesseract = require('tesseract.js');
const path = require('path');

class OCRService {
  async extractReceiptData(imagePath) {
    try {
      console.log('🔍 Starting OCR processing for:', imagePath);
      
      const { data: { text } } = await Tesseract.recognize(
        imagePath,
        'eng',
        {
          logger: info => console.log(info)
        }
      );

      console.log('📄 Extracted text:', text);

      // Parse the extracted text
      const receiptData = this.parseReceiptText(text);
      return receiptData;
    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error('Failed to process receipt image');
    }
  }

  parseReceiptText(text) {
    const lines = text.split('\n').filter(line => line.trim());
    
    // Extract merchant name (usually first few lines)
    const merchantName = lines[0]?.trim() || 'Unknown Merchant';

    // Extract date
    const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})|(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/;
    const dateMatch = text.match(datePattern);
    const expenseDate = dateMatch ? this.normalizeDate(dateMatch[0]) : new Date().toISOString().split('T')[0];

    // Extract amounts
    const amountPattern = /\$?\s*(\d+[,.]?\d*\.?\d{2})/g;
    const amounts = [];
    let match;
    while ((match = amountPattern.exec(text)) !== null) {
      const amount = parseFloat(match[1].replace(',', ''));
      if (amount > 0 && amount < 100000) {
        amounts.push(amount);
      }
    }

    // Get total (usually the largest or last amount)
    const totalAmount = amounts.length > 0 ? Math.max(...amounts) : 0;

    // Extract line items
    const lineItems = this.extractLineItems(lines);

    return {
      merchantName,
      expenseDate,
      amount: totalAmount,
      description: `Receipt from ${merchantName}`,
      lineItems,
      rawText: text
    };
  }

  extractLineItems(lines) {
    const lineItems = [];
    const itemPattern = /^(.+?)\s+\$?\s*(\d+[,.]?\d*\.?\d{2})$/;

    for (const line of lines) {
      const match = line.match(itemPattern);
      if (match) {
        const description = match[1].trim();
        const amount = parseFloat(match[2].replace(',', ''));
        
        if (amount > 0 && amount < 10000 && description.length > 2) {
          lineItems.push({
            description,
            amount,
            quantity: 1
          });
        }
      }
    }

    return lineItems;
  }

  normalizeDate(dateStr) {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      console.error('Date parsing error:', error);
    }
    return new Date().toISOString().split('T')[0];
  }
}

module.exports = new OCRService();
