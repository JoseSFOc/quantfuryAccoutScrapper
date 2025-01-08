const fs = require("fs");
const cheerio = require("cheerio");
const path = require("path");

const characters = {
  ι: "USDT",
  Ϊ: "€",
  Χ: "$",
  Ά: "BTC",
};

const titles = {
  "Daily Balance Interest Credited": "Interest",
  "Funds Converted": "Convertion",
  "Funds Received": "Deposit",
  "Transfer from Spot Wallet": "From spot wallet",
  "Transfer to Spot Wallet": "To spot wallet",
  "Withdrawal Completed": "Withdrawal",
};

const convertToCSV = (entries) => {
  if (entries.length === 0) return "";

  const headers = Object.keys(entries[0]);
  const rows = entries.map((entry) =>
    headers.map((header) => entry[header]).join(","),
  );

  return [headers.join(","), ...rows].join("\n");
};

const htmlToCsv = (htmlFilePath, outputCsvPath) => {
  const htmlContent = fs.readFileSync(htmlFilePath);
  const $ = cheerio.load(htmlContent);

  // Extract the main div
  // <main>
  //   <div>...</div>
  //   <div>
  //     <div>
  //       <div>
  //         <div>...</div>
  //         <div>
  //
  //         </div>
  //       </div>
  //    </div>
  //  </div>
  // </main>
  const mainDiv = $(
    "main:first-of-type > div:nth-of-type(2) > div > div > div:nth-of-type(2)",
  );

  const entries = [];

  const days = mainDiv.children();
  console.log("Days:", days.length);
  days.each((_, day) => {
    const dayChildren = day.children;
    const dateDiv = dayChildren[0];
    const operationsDiv = dayChildren[1];

    const date = $(dateDiv).text().replace(",", "");

    const operations = $(operationsDiv).children();
    operations.each((_, operation) => {
      let title = $(operation)
        .find($('span[data-testid^="history_item_title"]'))
        .text()
        .trim();

      if (titles[title]) {
        title = titles[title];
      } else {
        console.log(`Shorter name for title ${title} doesn't exists`);
      }

      const time = $(operation)
        .find($('[data-testid^="history_item_time"]'))
        .text()
        .trim();
      const dateTime = date + " " + time;

      let amount = $(operation)
        .find($('[data-testid^="history_item_primary_amount"]'))
        .text()
        .trim()
        .replace(",", "");
      const firstChar = amount.charAt(0);
      if (characters[firstChar] !== undefined) {
        amount = amount.replace(firstChar, (m) => characters[m]);
      } else {
        console.log(`Character for ${firstChar}, not found`);
      }

      // FIX: Using `.sc-gAhavb, .sc-gmPhgS` doesn't return all the details
      const details = $(operation)
        .find(".sc-gAhavb, .sc-gmPhgS")
        .text()
        .trim()
        .replace("Copy to clipboard", "")
        .replace("Copy to clipboard", "");

      entries.push({ title, dateTime, amount, details });
    });
  });

  const csvContent = convertToCSV(entries);

  fs.writeFileSync(outputCsvPath, csvContent);
  console.log(`CSV file created at: ${outputCsvPath}`);
};

const htmlFilePath = path.join(__dirname, "input.html");
const outputCsvPath = path.join(__dirname, "output.csv");

htmlToCsv(htmlFilePath, outputCsvPath);
