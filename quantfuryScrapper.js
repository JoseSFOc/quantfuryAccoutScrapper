const fs = require("fs");
const cheerio = require("cheerio");
const path = require("path");
const moment = require("moment");

const characters = {
  ι: "USDT",
  Ϊ: "EUR",
  Χ: "USD",
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

    const dateText = $(dateDiv).text().trim();
    const date = moment(dateText, "MMM DD, YYYY").format("YYYY-MM-DD");

    const operations = $(operationsDiv).children();
    operations.each((_, operation) => {
      let title = $(operation)
        .find('span[data-testid^="history_item_title"]')
        .text()
        .trim();

      if (titles[title]) {
        title = titles[title];
      } else {
        console.log(`Shorter name for title ${title} doesn't exists`);
      }

      const time = $(operation)
        .find('[data-testid^="history_item_time"]')
        .text()
        .trim();
      const dateTime =
        date + " " + moment(time, "h:mm:ss A").format("HH:mm:ss");

      let amount = $(operation)
        .find('[data-testid^="history_item_primary_amount"]')
        .text()
        .trim()
        .replace(",", "");
      let asset = amount.charAt(0);
      amount = amount.substring(1);

      if (characters[asset] !== undefined) {
        asset = characters[asset];
      } else {
        console.log(`Character for ${asset}, not found`);
      }

      const details = $(operation).find("div > div > span > span");
      let detailsText = details.text().trim();
      if (details.length === 2) {
        const wallet = $(details[0]).text().trim();
        const tx = $(details[1]).text().trim();
        detailsText = `wallet: ${wallet} - tx: ${tx}`;
      }

      if (!detailsText) {
        const toDetails = $(operation)
          .find("div:nth-of-type(2) > div")
          .last()
          .text()
          .trim();
        if (toDetails.substring(0, 3) === "to ") {
          const specialChar = toDetails.charAt(3);
          detailsText = toDetails
            .replace(specialChar, (m) => characters[m])
            .replace(",", "");
        }
      }

      entries.push({
        time: dateTime,
        operation: title,
        asset,
        quantity: amount,
        price: "",
        value: detailsText,
      });
    });
  });

  const csvContent = convertToCSV(entries);

  fs.writeFileSync(outputCsvPath, csvContent);
  console.log(`CSV file created at: ${outputCsvPath}`);
};

const htmlFilePath = path.join(__dirname, "input.html");
const outputCsvPath = path.join(__dirname, "output.csv");

htmlToCsv(htmlFilePath, outputCsvPath);
