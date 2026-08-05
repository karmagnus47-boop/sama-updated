/**
 * سايان — أمر موحّد
 *
 * ! سايان اضافة [رسالة]    ← حفظ رسالة للغروب
 * ! سايان تشغيل [N]ث       ← إرسال تلقائي كل N ثانية
 * ! سايان ايقاف            ← إيقاف الإرسال التلقائي
 *
 * ! سايان كنية [كنية]      ← تغيير وحماية كنيات الغروب كل 2-3 ثوانٍ
 * ! سايان كنية ايقاف       ← إيقاف حماية الكنيات
 *
 * ! سايان اسم [اسم]        ← تغيير وحماية اسم الغروب كل 2-3 ثوانٍ
 * ! سايان اسم ايقاف        ← إيقاف حماية الاسم
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

const sleep = ms => new Promise(r => setTimeout(r, ms));
const LINE  = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

// ── ملفات البيانات ────────────────────────────────────────────────────────────
const AUTO_FILE = path.join(process.cwd(), "database/data/sayanAuto.json");
const NICK_FILE = path.join(process.cwd(), "database/data/sayanNick.json");
const NAME_FILE = path.join(process.cwd(), "database/data/sayanName.json");
[AUTO_FILE, NICK_FILE, NAME_FILE].forEach(f => fs.ensureDirSync(path.dirname(f)));

function loadJSON(f) {
  try { if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8")); } catch (_) {}
  return {};
}
function saveJSON(f, d) {
  try { fs.writeFileSync(f, JSON.stringify(d, null, 2)); } catch (_) {}
}

// ── حالة الإرسال التلقائي ─────────────────────────────────────────────────────
if (!global._sayanIntervals) global._sayanIntervals = {};

function parseDuration(str) {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d+(?:\.\d+)?)(ث|د|s|m)?$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const u = m[2] || "ث";
  if (isNaN(n) || n <= 0) return null;
  return (u === "د" || u === "m") ? Math.round(n * 60000) : Math.round(n * 1000);
}

function fmtMs(ms) {
  if (ms >= 60000) return `${Math.round(ms / 60000)} دقيقة`;
  return `${Math.round(ms / 1000)} ثانية`;
}

function startAutoSend(api, tid, msg, ms) {
  if (global._sayanIntervals[tid]) clearInterval(global._sayanIntervals[tid].timer);
  const timer = setInterval(() => {
    api.sendMessage(msg, tid, err => {
      if (err) { clearInterval(global._sayanIntervals[tid]?.timer); delete global._sayanIntervals[tid]; }
    });
  }, ms);
  global._sayanIntervals[tid] = { timer, msg, intervalMs: ms, startedAt: Date.now() };
}

function stopAutoSend(tid) {
  if (global._sayanIntervals[tid]) {
    clearInterval(global._sayanIntervals[tid].timer);
    delete global._sayanIntervals[tid];
    return true;
  }
  return false;
}

// ── حماية الكنيات (كل 2-3 ثوانٍ) ────────────────────────────────────────────
if (!global._sayanNickLocks)   global._sayanNickLocks   = {};
if (!global._sayanNickRunning) global._sayanNickRunning = {};

function nickDelay() { return 2000 + Math.random() * 1000; } // 2-3 ثانية

async function nickLoop(api, tid) {
  if (global._sayanNickRunning[tid]) return;
  global._sayanNickRunning[tid] = true;
  while (global._sayanNickLocks[tid]?.active) {
    try {
      const info = await new Promise((res, rej) =>
        api.getThreadInfo(tid, (e, d) => e ? rej(e) : res(d))
      );
      const members = (info?.participantIDs || [])
        .filter(id => String(id) !== String(global.GoatBot?.botID));
      const name = global._sayanNickLocks[tid]?.name || "";
      for (const uid of members) {
        if (!global._sayanNickLocks[tid]?.active) break;
        if (!name) { await sleep(nickDelay()); continue; }
        try { await api.changeNickname(name, tid, uid); } catch (_) {}
        await sleep(nickDelay());
      }
    } catch (_) { await sleep(5000); }
  }
  global._sayanNickRunning[tid] = false;
}

// ── حماية اسم الغروب (كل 2-3 ثوانٍ) ─────────────────────────────────────────
if (!global._sayanNameLocks)   global._sayanNameLocks   = {};
if (!global._sayanNameTimers)  global._sayanNameTimers  = {};

function nameDelay() { return 2000 + Math.random() * 1000; } // 2-3 ثانية

function stopNameTimer(tid) {
  clearTimeout(global._sayanNameTimers[tid]);
  delete global._sayanNameTimers[tid];
}

function startNameTimer(api, tid) {
  stopNameTimer(tid);
  const lock = global._sayanNameLocks[tid];
  if (!lock?.active || !lock?.name) return;
  global._sayanNameTimers[tid] = setTimeout(async () => {
    if (!global._sayanNameLocks[tid]?.active) return;
    try { await api.setTitle(lock.name, tid); } catch (_) {}
    startNameTimer(api, tid);
  }, nameDelay());
}

// ── استعادة الأقفال عند إعادة التشغيل ────────────────────────────────────────
function restoreLocks(api) {
  // استعادة الكنيات
  const nd = loadJSON(NICK_FILE);
  for (const [tid, d] of Object.entries(nd)) {
    if (d.active && d.name) {
      global._sayanNickLocks[tid] = d;
      nickLoop(api, tid).catch(() => {});
    }
  }
  // استعادة أسماء الغروبات
  const nd2 = loadJSON(NAME_FILE);
  for (const [tid, d] of Object.entries(nd2)) {
    if (d.active && d.name) {
      global._sayanNameLocks[tid] = d;
      startNameTimer(api, tid);
    }
  }
}

// ── Module ────────────────────────────────────────────────────────────────────
module.exports = {
  config: {
    name: "سايان",
    aliases: ["sayan"],
    version: "3.0",
    author: "DJAMEL",
    countDown: 2,
    role: 2,
    category: "management",
    description: "إرسال تلقائي + حماية الكنيات + حماية اسم الغروب",
    guide: {
      en:
        "{pn} اضافة [رسالة] — حفظ رسالة\n" +
        "{pn} تشغيل [N]ث — إرسال كل N ثانية\n" +
        "{pn} ايقاف — إيقاف الإرسال\n" +
        "{pn} كنية [كنية] — حماية الكنيات\n" +
        "{pn} كنية ايقاف — إيقاف حماية الكنيات\n" +
        "{pn} اسم [اسم] — حماية اسم الغروب\n" +
        "{pn} اسم ايقاف — إيقاف حماية الاسم",
    },
  },

  onStart: async function ({ api, event, args, message }) {
    const tid = String(event.threadID);
    const sub = (args[0] || "").trim();
    const sub2 = (args[1] || "").trim();

    // ══ سايان اضافة [رسالة] ══════════════════════════════════════════════════
    if (sub === "اضافة" || sub === "إضافة") {
      const text = args.slice(1).join(" ").trim();
      if (!text) return message.reply("❌ اكتب الرسالة بعد الأمر.\nمثال: ! سايان اضافة مرحباً بالجميع");
      const d = loadJSON(AUTO_FILE);
      d[tid] = { msg: text, savedAt: Date.now() };
      saveJSON(AUTO_FILE, d);
      return message.reply(
        `✅ تم حفظ الرسالة!\n${LINE}\n📝 ${text}\n\nلتشغيل الإرسال:\n! سايان تشغيل 15ث`
      );
    }

    // ══ سايان تشغيل [N]ث ════════════════════════════════════════════════════
    if (sub === "تشغيل" || sub === "شغل") {
      const ms = parseDuration(sub2);
      if (!ms) return message.reply("❌ حدد المدة.\nمثال: ! سايان تشغيل 15ث\nأو: ! سايان تشغيل 5د");
      if (ms < 5000) return message.reply("⚠️ أقل مدة مسموحة 5 ثوانٍ.");
      const d = loadJSON(AUTO_FILE);
      const saved = d[tid]?.msg;
      if (!saved) return message.reply("❌ لا توجد رسالة محفوظة.\nاحفظ رسالة أولاً: ! سايان اضافة [الرسالة]");
      startAutoSend(api, tid, saved, ms);
      return message.reply(
        `▶️ تم التشغيل!\n${LINE}\n📝 ${saved}\n⏱️ كل ${fmtMs(ms)}\n\nللإيقاف: ! سايان ايقاف`
      );
    }

    // ══ سايان ايقاف (الإرسال التلقائي) ══════════════════════════════════════
    if (sub === "ايقاف" || sub === "إيقاف") {
      // إيقاف الإرسال التلقائي فقط إذا لم يكن الأمر فرعياً
      const stopped = stopAutoSend(tid);
      if (stopped) return message.reply("⏹️ تم إيقاف الإرسال التلقائي.");
      return message.reply("ℹ️ لا يوجد إرسال نشط في هذا الغروب.");
    }

    // ══ سايان كنية ══════════════════════════════════════════════════════════
    if (sub === "كنية" || sub === "كنيات") {
      // ── سايان كنية ايقاف ──
      if (sub2 === "ايقاف" || sub2 === "إيقاف" || sub2 === "off") {
        if (global._sayanNickLocks[tid]) global._sayanNickLocks[tid].active = false;
        const d = loadJSON(NICK_FILE);
        if (d[tid]) { d[tid].active = false; saveJSON(NICK_FILE, d); }
        return message.reply("⏹️ تم إيقاف حماية الكنيات.");
      }

      const name = args.slice(1).join(" ").trim();
      if (!name) return message.reply("❌ اكتب الكنية.\nمثال: ! سايان كنية DAVID\nللإيقاف: ! سايان كنية ايقاف");

      global._sayanNickLocks[tid] = { active: true, name };
      const d = loadJSON(NICK_FILE);
      d[tid] = { active: true, name };
      saveJSON(NICK_FILE, d);

      message.reply(
        `✅ تم تفعيل حماية الكنيات\n${LINE}\n` +
        `📝 الكنية: "${name}"\n` +
        `⏱️ تحديث كل 2-3 ثوانٍ\n` +
        `🛑 للإيقاف: ! سايان كنية ايقاف`
      );
      nickLoop(api, tid).catch(() => {});
      return;
    }

    // ══ سايان اسم ══════════════════════════════════════════════════════════
    if (sub === "اسم") {
      // ── سايان اسم ايقاف ──
      if (sub2 === "ايقاف" || sub2 === "إيقاف" || sub2 === "off") {
        stopNameTimer(tid);
        if (global._sayanNameLocks[tid]) global._sayanNameLocks[tid].active = false;
        const d = loadJSON(NAME_FILE);
        if (d[tid]) { d[tid].active = false; saveJSON(NAME_FILE, d); }
        return message.reply("⏹️ تم إيقاف حماية اسم الغروب.");
      }

      const name = args.slice(1).join(" ").trim();
      if (!name) return message.reply("❌ اكتب الاسم.\nمثال: ! سايان اسم DAVID GROUP\nللإيقاف: ! سايان اسم ايقاف");

      global._sayanNameLocks[tid] = { active: true, name };
      const d = loadJSON(NAME_FILE);
      d[tid] = { active: true, name };
      saveJSON(NAME_FILE, d);

      try { await api.setTitle(name, tid); } catch (_) {}
      startNameTimer(api, tid);

      return message.reply(
        `✅ تم تفعيل حماية الاسم\n${LINE}\n` +
        `📝 الاسم: "${name}"\n` +
        `⏱️ حماية كل 2-3 ثوانٍ\n` +
        `🛑 للإيقاف: ! سايان اسم ايقاف`
      );
    }

    // ══ مساعدة افتراضية ═════════════════════════════════════════════════════
    return message.reply(
      `${LINE}\n  ✦  س ا ي ا ن  ✦\n${LINE}\n\n` +
      `📨 الإرسال التلقائي:\n` +
      `  ! سايان اضافة [رسالة]\n` +
      `  ! سايان تشغيل 15ث\n` +
      `  ! سايان ايقاف\n\n` +
      `✍️ حماية الكنيات:\n` +
      `  ! سايان كنية [الكنية]\n` +
      `  ! سايان كنية ايقاف\n\n` +
      `🏷️ حماية الاسم:\n` +
      `  ! سايان اسم [الاسم]\n` +
      `  ! سايان اسم ايقاف\n\n` +
      `${LINE}`
    );
  },

  // ── onEvent: مراقبة تغيير الكنية واسم الغروب ────────────────────────────────
  onEvent: async function ({ api, event }) {
    const tid = String(event.threadID);

    // مراقبة تغيير الكنية
    const isNickChange =
      event.logMessageType === "log:user-nickname" ||
      (event.logMessageData?.participant_id !== undefined && event.logMessageData?.nickname !== undefined);

    if (isNickChange && global._sayanNickLocks[tid]?.active) {
      const name = global._sayanNickLocks[tid].name;
      const targetID = String(
        event.logMessageData?.participant_id ||
        event.logMessageData?.userId || ""
      );
      if (targetID && name) {
        setTimeout(async () => {
          try { await api.changeNickname(name, tid, targetID); } catch (_) {}
        }, 600);
        if (!global._sayanNickRunning[tid]) nickLoop(api, tid).catch(() => {});
      }
    }

    // مراقبة تغيير اسم الغروب
    if (event.logMessageType === "log:thread-name" && global._sayanNameLocks[tid]?.active) {
      const lock = global._sayanNameLocks[tid];
      const newName = event.logMessageData?.name || "";
      if (newName !== lock.name) {
        setTimeout(async () => {
          try { await api.setTitle(lock.name, tid); } catch (_) {}
        }, 600);
      }
    }
  },

  // ── onLoad: استعادة الأقفال عند بدء التشغيل ──────────────────────────────────
  onLoad: async function ({ api }) {
    if (api) restoreLocks(api);
  },
};
