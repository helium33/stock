/**
 * Google Sheets Service
 * 
 * This file contains functions for exporting data to Google Sheets
 */
import { gapi } from 'gapi-script';
import { format } from 'date-fns';
import { formatCurrency, VocItem } from './utils';

// Google API Client ID - you need to replace this with your actual client ID
const CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
const API_KEY = 'YOUR_API_KEY';

// Discovery docs and scopes for Google Sheets API
const DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let gapiInitialized = false;

/**
 * Initialize the Google API client
 */
export const initGapi = (): Promise<void> => {
  if (gapiInitialized) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    gapi.load('client:auth2', () => {
      gapi.client
        .init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          discoveryDocs: DISCOVERY_DOCS,
          scope: SCOPES,
        })
        .then(() => {
          gapiInitialized = true;
          resolve();
        })
        .catch((error) => {
          console.error('Error initializing Google API client:', error);
          reject(error);
        });
    });
  });
};

/**
 * Check if the user is signed in to Google
 */
export const isSignedIn = (): boolean => {
  return gapi.auth2?.getAuthInstance().isSignedIn.get() || false;
};

/**
 * Sign in to Google
 */
export const signIn = async (): Promise<void> => {
  try {
    await initGapi();
    await gapi.auth2.getAuthInstance().signIn();
  } catch (error) {
    console.error('Error signing in to Google:', error);
    throw error;
  }
};

/**
 * Format VOC data for Google Sheets
 */
const formatDataForSheets = (vocs: any[]): string[][] => {
  // Headers
  const headers = [
    'VOC Number',
    'Customer',
    'Lens',
    'Frame',
    'Accessories',
    'Contact Lens',
    'Payment Type',
    'Payment Method',
    'Deposit Amount',
    'Total Amount',
    'Balance',
    'Date',
    'Refund',
  ];

  // Data rows
  const rows = vocs.map((voc) => {
    // Group items by type
    const itemsByType = voc.items.reduce((acc: any, item: VocItem) => {
      if (!acc[item.type]) {
        acc[item.type] = [];
      }
      acc[item.type].push(item);
      return acc;
    }, {});

    // Format lens items
    const lensItems = itemsByType['Lens']
      ? itemsByType['Lens']
          .map((item: VocItem) => {
            return `${item.name} (${item.quantity}x)${
              item.details
                ? ` - SPH: ${item.details.sph || '-'}, CYL: ${
                    item.details.cyl || '-'
                  }, AXIS: ${item.details.axis || '-'}`
                : ''
            }`;
          })
          .join('\n')
      : '-';

    // Format frame items
    const frameItems = itemsByType['Frame']
      ? itemsByType['Frame']
          .map((item: VocItem) => {
            return `${item.name} (${item.quantity}x)${
              item.details?.color ? ` - Color: ${item.details.color}` : ''
            }`;
          })
          .join('\n')
      : '-';

    // Format accessories items
    const accessoryItems = itemsByType['Accessories']
      ? itemsByType['Accessories']
          .map((item: VocItem) => {
            return `${item.name} (${item.quantity}x)`;
          })
          .join('\n')
      : '-';

    // Format contact lens items
    const contactLensItems = itemsByType['Contact Lens']
      ? itemsByType['Contact Lens']
          .map((item: VocItem) => {
            return `${item.name} (${item.quantity}x)${
              item.details?.power ? ` - Power: ${item.details.power}` : ''
            }`;
          })
          .join('\n')
      : '-';

    return [
      voc.vocNumber || '-',
      voc.customerName || '-',
      lensItems,
      frameItems,
      accessoryItems,
      contactLensItems,
      voc.paymentType || '-',
      voc.paymentMethod || '-',
      voc.depositAmount ? voc.depositAmount.toString() : '0',
      voc.totalAmount ? voc.totalAmount.toString() : '0',
      voc.balance ? voc.balance.toString() : '0',
      voc.createdAt instanceof Date
        ? format(voc.createdAt, 'yyyy-MM-dd')
        : '-',
      voc.refund
        ? `${voc.refund.amount.toString()} - ${voc.refund.reason}`
        : '-',
    ];
  });

  return [headers, ...rows];
};

/**
 * Create a Google Sheet with VOC data
 */
export const createGoogleSheet = async (
  data: any[],
  filename: string,
  totalAmount: number,
  kpayTotal: number,
  yuanTotal: number,
  depositTotal: number
): Promise<string> => {
  try {
    await initGapi();

    if (!isSignedIn()) {
      await signIn();
    }

    // Format data for Google Sheets
    const formattedData = formatDataForSheets(data);

    // Create a new spreadsheet
    const response = await gapi.client.sheets.spreadsheets.create({
      properties: {
        title: filename,
      },
    });

    const spreadsheetId = response.result.spreadsheetId;
    const sheetId = response.result.sheets[0].properties.sheetId;

    // Update the data in the spreadsheet
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: formattedData,
      },
    });

    // Add summary rows
    const summaryStartRow = formattedData.length + 2;
    const summaryData = [
      ['SUMMARY', '', '', '', '', '', '', 'Cash Total', '', formatCurrency(totalAmount - kpayTotal - yuanTotal), '', '', ''],
      ['', '', '', '', '', '', '', 'KPay Total', '', formatCurrency(kpayTotal), '', '', ''],
      ['', '', '', '', '', '', '', 'Yuan Total', '', formatCurrency(yuanTotal), '', '', ''],
      ['', '', '', '', '', '', '', 'Deposit Total', formatCurrency(depositTotal), '', '', '', ''],
      ['GRAND TOTAL', '', '', '', '', '', '', '', '', formatCurrency(totalAmount), '', '', ''],
    ];

    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!A${summaryStartRow}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: summaryData,
      },
    });

    // Format the spreadsheet
    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          // Format header row
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.086,
                    green: 0.627,
                    blue: 0.522,
                  },
                  textFormat: {
                    bold: true,
                    foregroundColor: {
                      red: 1.0,
                      green: 1.0,
                      blue: 1.0,
                    },
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
            },
          },
          // Format summary rows
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: summaryStartRow - 1,
                endRowIndex: summaryStartRow + summaryData.length,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.95,
                    green: 0.95,
                    blue: 0.95,
                  },
                  textFormat: {
                    bold: true,
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          // Format grand total row
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: summaryStartRow + summaryData.length - 1,
                endRowIndex: summaryStartRow + summaryData.length,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.086,
                    green: 0.627,
                    blue: 0.522,
                  },
                  textFormat: {
                    bold: true,
                    foregroundColor: {
                      red: 1.0,
                      green: 1.0,
                      blue: 1.0,
                    },
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          // Set column widths
          {
            updateDimensionProperties: {
              range: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 13,
              },
              properties: {
                pixelSize: 150,
              },
              fields: 'pixelSize',
            },
          },
          // Set wider width for description columns
          {
            updateDimensionProperties: {
              range: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex: 2,
                endIndex: 6,
              },
              properties: {
                pixelSize: 250,
              },
              fields: 'pixelSize',
            },
          },
          // Add borders
          {
            updateBorders: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: formattedData.length + summaryData.length + 1,
                startColumnIndex: 0,
                endColumnIndex: 13,
              },
              top: {
                style: 'SOLID',
                width: 1,
              },
              bottom: {
                style: 'SOLID',
                width: 1,
              },
              left: {
                style: 'SOLID',
                width: 1,
              },
              right: {
                style: 'SOLID',
                width: 1,
              },
              innerHorizontal: {
                style: 'SOLID',
                width: 1,
              },
              innerVertical: {
                style: 'SOLID',
                width: 1,
              },
            },
          },
          // Freeze header row
          {
            updateSheetProperties: {
              properties: {
                sheetId,
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
              fields: 'gridProperties.frozenRowCount',
            },
          },
          // Alternate row colors for better readability
          {
            addBanding: {
              bandedRange: {
                range: {
                  sheetId,
                  startRowIndex: 1,
                  endRowIndex: formattedData.length,
                  startColumnIndex: 0,
                  endColumnIndex: 13,
                },
                rowProperties: {
                  headerColor: {
                    red: 0.086,
                    green: 0.627,
                    blue: 0.522,
                  },
                  firstBandColor: {
                    red: 1.0,
                    green: 1.0,
                    blue: 1.0,
                  },
                  secondBandColor: {
                    red: 0.95,
                    green: 0.95,
                    blue: 0.95,
                  },
                },
              },
            },
          },
        ],
      },
    });

    // Format number and currency columns
    const currencyRanges = [
      `I2:I${formattedData.length}`, // Deposit Amount
      `J2:J${formattedData.length}`, // Total Amount
      `K2:K${formattedData.length}`, // Balance
    ];

    for (const range of currencyRanges) {
      await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 1,
                  endRowIndex: formattedData.length,
                  startColumnIndex: range.charCodeAt(0) - 65, // Convert column letter to index
                  endColumnIndex: range.charCodeAt(0) - 64,
                },
                cell: {
                  userEnteredFormat: {
                    numberFormat: {
                      type: 'CURRENCY',
                      pattern: '¤#,##0',
                    },
                  },
                },
                fields: 'userEnteredFormat.numberFormat',
              },
            },
          ],
        },
      });
    }

    // Return the URL to the spreadsheet
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  } catch (error) {
    console.error('Error creating Google Sheet:', error);
    throw error;
  }
};

/**
 * Alternative method: Export to CSV and open in Google Sheets
 * This method doesn't require authentication
 */
export const exportToGoogleSheets = (data: any[], filename: string): void => {
  try {
    // Prepare headers
    const headers = [
      'VOC Number',
      'Customer',
      'Lens',
      'Frame',
      'Accessories',
      'Contact Lens',
      'Payment Type',
      'Payment Method',
      'Deposit Amount',
      'Total Amount',
      'Balance',
      'Date',
      'Refund',
    ];

    // Prepare rows
    const rows = data.map((voc) => {
      // Group items by type
      const itemsByType = voc.items.reduce((acc: any, item: VocItem) => {
        if (!acc[item.type]) {
          acc[item.type] = [];
        }
        acc[item.type].push(item);
        return acc;
      }, {});

      // Format lens items
      const lensItems = itemsByType['Lens']
        ? itemsByType['Lens']
            .map((item: VocItem) => {
              return `${item.name} (${item.quantity}x)${
                item.details
                  ? ` - SPH: ${item.details.sph || '-'}, CYL: ${
                      item.details.cyl || '-'
                    }, AXIS: ${item.details.axis || '-'}`
                  : ''
              }`;
            })
            .join('\n')
        : '';

      // Format frame items
      const frameItems = itemsByType['Frame']
        ? itemsByType['Frame']
            .map((item: VocItem) => {
              return `${item.name} (${item.quantity}x)${
                item.details?.color ? ` - Color: ${item.details.color}` : ''
              }`;
            })
            .join('\n')
        : '';

      // Format accessories items
      const accessoryItems = itemsByType['Accessories']
        ? itemsByType['Accessories']
            .map((item: VocItem) => {
              return `${item.name} (${item.quantity}x)`;
            })
            .join('\n')
        : '';

      // Format contact lens items
      const contactLensItems = itemsByType['Contact Lens']
        ? itemsByType['Contact Lens']
            .map((item: VocItem) => {
              return `${item.name} (${item.quantity}x)${
                item.details?.power ? ` - Power: ${item.details.power}` : ''
              }`;
            })
            .join('\n')
        : '';

      return [
        voc.vocNumber || '',
        voc.customerName || '',
        lensItems,
        frameItems,
        accessoryItems,
        contactLensItems,
        voc.paymentType || '',
        voc.paymentMethod || '',
        voc.depositAmount ? voc.depositAmount.toString() : '0',
        voc.totalAmount ? voc.totalAmount.toString() : '0',
        voc.balance ? voc.balance.toString() : '0',
        voc.createdAt instanceof Date
          ? format(voc.createdAt, 'yyyy-MM-dd')
          : '',
        voc.refund
          ? `${voc.refund.amount.toString()} - ${voc.refund.reason}`
          : '',
      ].map(value => `"${value.replace(/"/g, '""')}"`);
    });

    // Create CSV content
    const csvContent = [
      headers.map(header => `"${header}"`).join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create a blob and download it
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Open Google Sheets in a new tab with a URL to import the CSV
    window.open('https://docs.google.com/spreadsheets/create', '_blank');
  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    throw new Error('Failed to export to Google Sheets. Please try again.');
  }
};