#!/usr/bin/env node

/**
 * Convert old sample data format to new premium request usage format
 * 
 * Old format (6 columns): Timestamp,User,Model,Requests Used,Exceeds Monthly Quota,Total Monthly Quota
 * New format (15 columns): date,username,product,sku,model,quantity,unit_type,applied_cost_per_quantity,gross_amount,discount_amount,net_amount,exceeds_quota,total_monthly_quota,organization,cost_center_name
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  costPerRequest: 0.04,
  defaultOrganization: '',
  defaultCostCenter: '',
  modelMapping: {
    'gpt-4.1-2025-04-14': 'GPT-4.1',
    'gpt-4o-2024-11-20': 'GPT-4o',
    'o1-2024-12-17': 'o1',
    'claude-sonnet-4': 'Claude Sonnet 4',
    'claude-3.7-sonnet': 'Claude Sonnet 3.7',
    'claude-3.5-sonnet': 'Claude Sonnet 3.5',
    'Code Review': 'Code Review model',
    'Coding Agent': 'Coding Agent model',
  }
};

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * Quote a CSV field value
 */
function quoteField(value) {
  if (value === null || value === undefined) {
    value = '';
  }
  value = String(value);
  // Remove any newline characters to prevent multi-line fields
  value = value.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
  // Escape quotes by doubling them
  value = value.replace(/"/g, '""');
  return `"${value}"`;
}

/**
 * Convert timestamp to date (YYYY-MM-DD)
 */
function extractDate(timestamp) {
  try {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return timestamp;
  }
}

/**
 * Convert username (keep as-is)
 */
function convertUsername(oldUsername) {
  return oldUsername;
}

/**
 * Map old model name to new model name
 */
function mapModel(oldModel) {
  return CONFIG.modelMapping[oldModel] || oldModel;
}

/**
 * Parse boolean value
 */
function parseBoolean(value) {
  return value === 'TRUE' || value === 'True' || value === true ? 'True' : 'False';
}

/**
 * Convert a single row from old format to new format
 */
function convertRow(oldRow) {
  const timestamp = oldRow[0];
  const user = oldRow[1];
  const model = oldRow[2];
  const quantity = parseFloat(oldRow[3]) || 1;
  const exceedsQuota = oldRow[4];
  const totalQuota = oldRow[5];

  // Calculate amounts
  const grossAmount = (quantity * CONFIG.costPerRequest).toFixed(17);
  const discountAmount = '0';
  const netAmount = grossAmount;

  return [
    extractDate(timestamp),           // date
    convertUsername(user),             // username
    'copilot',                        // product
    'copilot_premium_request',        // sku
    mapModel(model),                  // model
    String(quantity),                 // quantity
    'requests',                       // unit_type
    String(CONFIG.costPerRequest),    // applied_cost_per_quantity
    grossAmount,                      // gross_amount
    discountAmount,                   // discount_amount
    netAmount,                        // net_amount
    parseBoolean(exceedsQuota),       // exceeds_quota
    String(totalQuota).trim(),        // total_monthly_quota
    CONFIG.defaultOrganization,       // organization
    CONFIG.defaultCostCenter          // cost_center_name
  ];
}

/**
 * Convert CSV file from old format to new format
 */
function convertFile(inputPath, outputPath) {
  console.log(`Converting ${inputPath} to ${outputPath}...`);

  try {
    // Read input file
    const content = fs.readFileSync(inputPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    // New header
    const newHeader = [
      'date',
      'username',
      'product',
      'sku',
      'model',
      'quantity',
      'unit_type',
      'applied_cost_per_quantity',
      'gross_amount',
      'discount_amount',
      'net_amount',
      'exceeds_quota',
      'total_monthly_quota',
      'organization',
      'cost_center_name'
    ];

    // Convert rows
    const convertedRows = [];
    for (let i = 1; i < lines.length; i++) {
      const oldRow = parseCSVLine(lines[i]);
      if (oldRow.length >= 6) {
        const newRow = convertRow(oldRow);
        convertedRows.push(newRow.map(quoteField).join(','));
      }
    }

    // Build output CSV
    const output = [newHeader.map(quoteField).join(','), ...convertedRows].join('\n');

    // Write output file
    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`✓ Conversion complete: ${convertedRows.length} rows converted`);
    console.log(`✓ Output saved to: ${outputPath}`);

  } catch (error) {
    console.error(`✗ Error during conversion: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Default: convert data_example.csv in current directory
    const dir = __dirname;
    const inputFile = path.join(dir, 'data_example.csv');
    const outputFile = path.join(dir, 'data_example_converted.csv');
    
    if (!fs.existsSync(inputFile)) {
      console.error(`✗ Error: ${inputFile} not found`);
      process.exit(1);
    }
    
    convertFile(inputFile, outputFile);
  } else if (args.length === 2) {
    // Use provided input and output paths
    const inputFile = args[0];
    const outputFile = args[1];
    
    if (!fs.existsSync(inputFile)) {
      console.error(`✗ Error: ${inputFile} not found`);
      process.exit(1);
    }
    
    convertFile(inputFile, outputFile);
  } else {
    console.log('Usage: node convert-data-format.js [input.csv] [output.csv]');
    console.log('');
    console.log('Default behavior (no arguments):');
    console.log('  Converts ./data_example.csv to ./data_example_converted.csv');
    console.log('');
    console.log('With arguments:');
    console.log('  Converts <input.csv> to <output.csv>');
    process.exit(1);
  }
}

main();
