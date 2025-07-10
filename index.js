const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const port = process.env.PORT || 3000;

app.get("/scrape", async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: "URL TikTok diperlukan." });

  try {
    let videoSrc = "";

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 " +
      "(KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
    );

    // Debug intercept .mp4
    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("tiktokcdn.com") && url.endsWith(".mp4")) {
        console.log("Detected MP4:", url);
        if (!videoSrc) videoSrc = url;
      }
    });

    console.log("Membuka:", videoUrl);
    await page.goto(videoUrl, { waitUntil: "networkidle2", timeout: 0 });

    try {
      await page.waitForSelector("video", { timeout: 10000 });
    } catch (e) {
      console.log("Tag <video> tidak ditemukan");
    }

    await page.waitForTimeout(3000);

    const desc = await page.evaluate(() => {
      const el = document.querySelector("meta[name='description']");
      return el ? el.content : "";
    });

    const username = await page.evaluate(() => {
      const el = document.querySelector("meta[property='og:title']");
      return el ? el.content.split("on TikTok")[0].trim() : "";
    });

    await browser.close();

    return res.json({
      author: username,
      description: desc,
      video_url: videoSrc || "not found"
    });
  } catch (err) {
    console.error("Scrape failed:", err);
    return res.status(500).json({ error: "Gagal mengambil data." });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
