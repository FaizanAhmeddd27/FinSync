import PDFDocument from 'pdfkit';
import { CurrencyService } from './currency.service';

interface StatementData {
  user_name: string;
  account_number: string;
  account_type: string;
  currency: string;
  statement_month: string;
  opening_balance: number;
  closing_balance: number;
  total_credits: number;
  total_debits: number;
  transactions: Array<{
    date: string;
    description: string;
    type: string;
    amount: number;
    running_balance: number;
    category: string;
  }>;
}

export class PDFService {
  static async generateStatement(data: StatementData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 50,
          size: 'A4',
          info: {
            Title: `FinSync Statement - ${data.statement_month}`,
            Author: 'FinSync Banking',
          },
        });

        const buffers: Uint8Array[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const currencySymbol = CurrencyService.format(0, data.currency).replace('0.00', '');

        
        
        doc
          .fontSize(28)
          .fillColor('#1c9cf0')
          .text('FinSync', 50, 40)
          .fontSize(10)
          .fillColor('#72767a')
          .text('Advanced Digital Banking', 50, 75);

        
        doc
          .fontSize(16)
          .fillColor('#0f1419')
          .text('Account Statement', 350, 40, { align: 'right' });

        doc
          .fontSize(10)
          .fillColor('#72767a')
          .text(data.statement_month, 350, 62, { align: 'right' })
          .text(`Generated: ${new Date().toLocaleDateString()}`, 350, 77, {
            align: 'right',
          });

        
        doc
          .moveTo(50, 100)
          .lineTo(545, 100)
          .strokeColor('#e1eaef')
          .stroke();

        
        doc
          .fontSize(11)
          .fillColor('#0f1419')
          .text('Account Holder:', 50, 120)
          .fontSize(11)
          .fillColor('#72767a')
          .text(data.user_name, 170, 120);

        doc
          .fontSize(11)
          .fillColor('#0f1419')
          .text('Account:', 50, 140)
          .fillColor('#72767a')
          .text(
            `${data.account_number} (${data.account_type.toUpperCase()})`,
            170,
            140
          );

        doc
          .fillColor('#0f1419')
          .text('Currency:', 50, 160)
          .fillColor('#72767a')
          .text(data.currency, 170, 160);

        
        const boxY = 195;
        const boxHeight = 55;
        const boxWidth = 118;

        
        doc
          .rect(50, boxY, boxWidth, boxHeight)
          .fillAndStroke('#f7f8f8', '#e1eaef');
        doc
          .fontSize(8)
          .fillColor('#72767a')
          .text('Opening Balance', 55, boxY + 10, {
            width: boxWidth - 10,
            align: 'center',
          });
        doc
          .fontSize(13)
          .fillColor('#0f1419')
          .text(
            `${currencySymbol}${data.opening_balance.toFixed(2)}`,
            55,
            boxY + 28,
            { width: boxWidth - 10, align: 'center' }
          );

        
        doc
          .rect(50 + boxWidth + 8, boxY, boxWidth, boxHeight)
          .fillAndStroke('#f0fdf4', '#86efac');
        doc
          .fontSize(8)
          .fillColor('#72767a')
          .text('Total Credits', 55 + boxWidth + 8, boxY + 10, {
            width: boxWidth - 10,
            align: 'center',
          });
        doc
          .fontSize(13)
          .fillColor('#00b87a')
          .text(
            `+${currencySymbol}${data.total_credits.toFixed(2)}`,
            55 + boxWidth + 8,
            boxY + 28,
            { width: boxWidth - 10, align: 'center' }
          );

        
        doc
          .rect(50 + (boxWidth + 8) * 2, boxY, boxWidth, boxHeight)
          .fillAndStroke('#fef2f2', '#fca5a5');
        doc
          .fontSize(8)
          .fillColor('#72767a')
          .text(
            'Total Debits',
            55 + (boxWidth + 8) * 2,
            boxY + 10,
            { width: boxWidth - 10, align: 'center' }
          );
        doc
          .fontSize(13)
          .fillColor('#f4212e')
          .text(
            `-${currencySymbol}${data.total_debits.toFixed(2)}`,
            55 + (boxWidth + 8) * 2,
            boxY + 28,
            { width: boxWidth - 10, align: 'center' }
          );

        
        doc
          .rect(50 + (boxWidth + 8) * 3, boxY, boxWidth, boxHeight)
          .fillAndStroke('#eff6ff', '#93c5fd');
        doc
          .fontSize(8)
          .fillColor('#72767a')
          .text(
            'Closing Balance',
            55 + (boxWidth + 8) * 3,
            boxY + 10,
            { width: boxWidth - 10, align: 'center' }
          );
        doc
          .fontSize(13)
          .fillColor('#1c9cf0')
          .text(
            `${currencySymbol}${data.closing_balance.toFixed(2)}`,
            55 + (boxWidth + 8) * 3,
            boxY + 28,
            { width: boxWidth - 10, align: 'center' }
          );

        
        let tableTop = boxY + boxHeight + 30;

        
        doc
          .rect(50, tableTop, 495, 22)
          .fillAndStroke('#17181c', '#17181c');

        const colX = {
          date: 55,
          description: 125,
          category: 275,
          type: 345,
          amount: 395,
          balance: 470,
        };

        doc
          .fontSize(8)
          .fillColor('#ffffff')
          .text('Date', colX.date, tableTop + 7)
          .text('Description', colX.description, tableTop + 7)
          .text('Category', colX.category, tableTop + 7)
          .text('Type', colX.type, tableTop + 7)
          .text('Amount', colX.amount, tableTop + 7)
          .text('Balance', colX.balance, tableTop + 7);

        tableTop += 22;

        
        for (let i = 0; i < data.transactions.length; i++) {
          const txn = data.transactions[i];

          
          if (tableTop > 730) {
            doc.addPage();
            tableTop = 50;

            
            doc
              .rect(50, tableTop, 495, 22)
              .fillAndStroke('#17181c', '#17181c');
            doc
              .fontSize(8)
              .fillColor('#ffffff')
              .text('Date', colX.date, tableTop + 7)
              .text('Description', colX.description, tableTop + 7)
              .text('Category', colX.category, tableTop + 7)
              .text('Type', colX.type, tableTop + 7)
              .text('Amount', colX.amount, tableTop + 7)
              .text('Balance', colX.balance, tableTop + 7);
            tableTop += 22;
          }

          const bgColor = i % 2 === 0 ? '#ffffff' : '#f7f8f8';
          doc
            .rect(50, tableTop, 495, 20)
            .fillAndStroke(bgColor, '#e1eaef');

          const amountColor =
            txn.type === 'credit' ? '#00b87a' : '#f4212e';
          const amountPrefix = txn.type === 'credit' ? '+' : '-';

          doc
            .fontSize(7.5)
            .fillColor('#0f1419')
            .text(
              new Date(txn.date).toLocaleDateString(),
              colX.date,
              tableTop + 6
            )
            .text(
              txn.description.substring(0, 25),
              colX.description,
              tableTop + 6
            )
            .text(
              (txn.category || 'Other').substring(0, 12),
              colX.category,
              tableTop + 6
            )
            .text(
              txn.type.toUpperCase(),
              colX.type,
              tableTop + 6
            )
            .fillColor(amountColor)
            .text(
              `${amountPrefix}${currencySymbol}${txn.amount.toFixed(2)}`,
              colX.amount,
              tableTop + 6
            )
            .fillColor('#0f1419')
            .text(
              `${currencySymbol}${txn.running_balance.toFixed(2)}`,
              colX.balance,
              tableTop + 6
            );

          tableTop += 20;
        }

        
        const pageBottom = doc.page.height - 50;
        doc
          .moveTo(50, pageBottom - 20)
          .lineTo(545, pageBottom - 20)
          .strokeColor('#e1eaef')
          .stroke();

        doc
          .fontSize(8)
          .fillColor('#72767a')
          .text(
            'This is a computer-generated statement from FinSync Digital Banking.',
            50,
            pageBottom - 10,
            { align: 'center' }
          );

        doc
          .fontSize(7)
          .text(
            `© ${new Date().getFullYear()} FinSync. All rights reserved.`,
            50,
            pageBottom,
            { align: 'center' }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}