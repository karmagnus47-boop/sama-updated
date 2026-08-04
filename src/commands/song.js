/**
 * DAVID V1 — /song — البحث وتنزيل الأغاني من YouTube
 * Copyright © 2025 DJAMEL
 * Fixed: استبدال ytdl-core المكسور بـ API خارجي
 */
"use strict";

const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");
const ytsr  = require("yt-search");

const TMP = path.join(os.tmpdir(), "david_song");
fs.ensureDirSync(TMP);

// رابط API الخارجي (من ArYAN - يعمل بدون ytdl-core)
const NIX_API_LIST = "https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json";

function fmtDur(s) { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, "0")}`; }
function fmtN(n) {
  if (!n) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

async function getApiBase() {
  try {
    const res = await axios.get(NIX_API_LIST, { timeout: 10000 });
    return res.data?.api || null;
  } catch (_) { return null; }
}

async function downloadViaApi(videoUrl, outPath) {
  const base = await getApiBase();
  if (!base) throw new Error("تعذّر الوصول إلى API التنزيل");

  const res = await axios.get(`${base}/ytdl`, {
    params:  { url: videoUrl, type: "audio" },
    timeout: 20000
  });

  if (!res.data?.status || !res.data?.downloadUrl)
    throw new Error("API لم يرجع رابط تنزيل");

  const dl = await axios.get(res.data.downloadUrl, {
    responseType: "arraybuffer",
    timeout:      60000
  });
  await fs.outputFile(outPath, Buffer.from(dl.data));
  return { title: res.data.title || "Song" };
}

module.exports = {
  config: {
    name: "أغنية", aliases: ["song", "music", "موسيقى"], version: "4.0", author: "DJAMEL",
    countDown: 10, role: 2, category: "media",
    description: "البحث عن الأغاني وتنزيلها من YouTube",
    guide: { en: "{pn} [اسم الأغنية]\nمثال: {pn} يا حبيبي" }
  },

  onStart: async function ({ api, event, args, message }) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("❗ اكتب اسم الأغنية.\nمثال: /song يا حبيبي");

    message.react("🔍", event.messageID);
    const wait = await message.reply(`🎵 جاري البحث عن "${query}"…`);

    try {
      const results = await ytsr(query);
      const videos  = (results.videos || []).slice(0, 5);
      if (!videos.length) {
        api.unsendMessage(wait.messageID).catch(() => {});
        message.react("❌", event.messageID);
        return message.reply(`❌ لم أجد نتائج لـ "${query}"`);
      }

      let body = `🎵 نتائج "${query}"\n━━━━━━━━━━━━━━━━\n`;
      videos.forEach((v, i) => {
        body += `${i + 1}. ${v.title}\n`;
        body += `   ⏱ ${v.timestamp || "?"} | 👁 ${fmtN(v.views)}\n\n`;
      });
      body += `اكتب رقم الأغنية (1-${videos.length})`;

      api.unsendMessage(wait.messageID).catch(() => {});
      const listMsg = await message.reply(body);

      global.GoatBot.onReply.set(`song_${listMsg.messageID}`, {
        messageID: listMsg.messageID,
        author:    event.senderID,
        ts:        Date.now(),
        callback:  async ({ api, event: re, message: rm }) => {
          global.GoatBot.onReply.delete(`song_${listMsg.messageID}`);
          const choice = parseInt(re.body?.trim()) - 1;
          if (isNaN(choice) || choice < 0 || choice >= videos.length)
            return rm.reply("❌ رقم غير صالح.");

          const video   = videos[choice];
          const dlWait  = await rm.reply(`⬇️ جاري التنزيل: ${video.title}`);
          const outPath = path.join(TMP, `song_${Date.now()}.mp3`);

          try {
            const { title } = await downloadViaApi(video.url, outPath);
            api.unsendMessage(dlWait.messageID).catch(() => {});
            await api.sendMessage({
              body:       `🎵 ${title}\n⏱ ${video.timestamp || "?"} | 👑 DAVID V1`,
              attachment: fs.createReadStream(outPath)
            }, re.threadID);
            fs.removeSync(outPath);
          } catch (e) {
            api.unsendMessage(dlWait.messageID).catch(() => {});
            rm.reply(`❌ فشل التنزيل: ${e.message}\n🔗 ${video.url}`);
            if (fs.existsSync(outPath)) fs.removeSync(outPath);
          }
        }
      });
    } catch (e) {
      try { api.unsendMessage(wait.messageID); } catch (_) {}
      message.react("❌", event.messageID);
      message.reply("❌ خطأ في البحث: " + e.message);
    }
  }
};
