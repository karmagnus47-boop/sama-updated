/**
 * DAVID V1 — /changeavatar — تغيير صورة حساب البوت
 * Copyright © 2025 DJAMEL
 * Fixed v3.1:
 *  - stream مباشر من axios (بدون حفظ في ملف مؤقت)
 *  - api.changeAvatar(stream, caption, timestamp, callback) الـ signature الصحيح
 *  - لا حاجة لـ form-data
 */
"use strict";
const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

function isBotAdmin(id) {
  const cfg = global.GoatBot?.config || {};
  const sid = String(id);
  return [cfg.ownerID, ...(cfg.superAdminBot || []), ...(cfg.adminBot || [])]
    .filter(Boolean).map(String).includes(sid);
}

module.exports = {
  config: {
    name: "أفاتار",
    aliases: ["setavatar", "changeavatar", "avatar", "صورة-البوت", "تغيير-الصورة"],
    version: "3.1",
    author: "DJAMEL",
    countDown: 15,
    role: 3,
    category: "management",
    description: "تغيير صورة البروفايل لحساب البوت",
    guide: { en: "{pn} [رابط] — أو رد على صورة بـ {pn}" }
  },

  onStart: async function ({ api, event, args, message }) {
    if (!isBotAdmin(event.senderID))
      return message.reply("⛔ هذا الأمر للمالك فقط.");

    // ── استخراج رابط الصورة ────────────────────────────────────────────
    let imageUrl = null;
    const findImg = (atts = []) => {
      const img = atts.find(a => a.type === "photo" || a.type === "sticker");
      return img?.url || img?.previewUrl || img?.playbackUrl || null;
    };

    imageUrl = findImg(event.attachments || []);
    if (!imageUrl && event.messageReply)
      imageUrl = findImg(event.messageReply.attachments || []);
    if (!imageUrl)
      for (const a of args)
        if (a?.startsWith("http")) { imageUrl = a; break; }

    if (!imageUrl) {
      return message.reply(
        "╔══════════════════════════╗\n" +
        "║  📸  تغيير صورة البوت   ║\n" +
        "╠══════════════════════════╣\n" +
        "║  الاستخدام:              ║\n" +
        "║  • /changeavatar [رابط]  ║\n" +
        "║  • رد على صورة بالأمر   ║\n" +
        "╚══════════════════════════╝"
      );
    }

    message.react("⏳", event.messageID);

    try {
      // FIX: تنزيل كـ stream مباشر وتمريره لـ changeAvatar بدون حفظ في ملف
      const imgRes = await axios.get(imageUrl, {
        responseType: "stream",
        timeout: 25000,
        headers: { "User-Agent": UA }
      });

      // بعض إصدارات FCA تحتاج لـ .path hint
      imgRes.data.path = "avatar.jpg";

      // FIX: الـ signature الصحيح هو changeAvatar(image, caption, timestamp, callback)
      // المكتبة تدعم الـ Promise مباشرة عند عدم تمرير callback
      await new Promise((resolve, reject) => {
        api.changeAvatar(imgRes.data, "", null, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      message.react("✅", event.messageID);
      return message.reply(
        "╔═══════════════════════════╗\n" +
        "║  ✅ تم بنجاح              ║\n" +
        "╠═══════════════════════════╣\n" +
        "║  تم تغيير صورة البوت 🎉  ║\n" +
        "║  قد تحتاج لإعادة تحميل   ║\n" +
        "║  الصفحة لرؤية التغيير    ║\n" +
        "╚═══════════════════════════╝"
      );
    } catch (err) {
      message.react("❌", event.messageID);
      return message.reply(
        "╔═══════════════════════════╗\n" +
        "║  ❌ فشل تغيير الصورة      ║\n" +
        "╠═══════════════════════════╣\n" +
        "║  السبب: " + String(err.message || err).slice(0, 35) + "\n" +
        "╠═══════════════════════════╣\n" +
        "║  ⚠️ قد يكون السبب:        ║\n" +
        "║  • الكوكيز منتهية الصلاحية║\n" +
        "║  • فيسبوك حظر الطلب مؤقتاً║\n" +
        "║  • رابط الصورة غير صالح  ║\n" +
        "╚═══════════════════════════╝"
      );
    }
  }
};
