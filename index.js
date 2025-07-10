const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const port = process.env.PORT || 3000;

app.get("/scrape", async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).json({ error: "URL TikTok diperlukan." });
  }

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );

    await page.goto(videoUrl, { waitUntil: "networkidle2", timeout: 0 });

    // Tunggu elemen video muncul
    await page.waitForSelector("video");

    // Ambil URL video dari tag <video>
    const videoSrc = await page.$eval("video", video => video.src);

    // Ambil deskripsi
    const desc = await page.evaluate(() => {
      const el = document.querySelector("meta[name='description']");
      return el ? el.content : "";
    });

    // Ambil username
    const username = await page.evaluate(() => {
      const el = document.querySelector("meta[property='og:title']");
      return el ? el.content.split("on TikTok")[0].trim() : "";
    });

    await browser.close();

    return res.json({
      author: username,
      description: desc,
      video_url: videoSrc,
    });
  } catch (err) {
    console.error("Scrape failed:", err.message);
    return res.status(500).json({ error: "Gagal mengambil data." });
  }
});

app.get("/", (req, res) => {
  res.send("TikTok Scraper aktif. Gunakan endpoint /scrape?url=...");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
