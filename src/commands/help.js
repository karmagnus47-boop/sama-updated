/**
 * سايان — أمر موحّد: دليل + حفظ رسالة + إرسال تلقائي
 *
 * ! سايان دليل               ← كل الأوامر
 * ! دليل [اسم الأمر]         ← تفاصيل أمر
 * ! سايان اضافة [رسالة]      ← حفظ رسالة للغروب الحالي
 * ! سايان تشغيل [N]ث         ← إرسال كل N ثانية
 * ! سايان تشغيل [N]د         ← إرسال كل N دقيقة
 * ! سايان ايقاف              ← إيقاف الإرسال
 * ! سايان رسالة              ← عرض الرسالة المحفوظة + الحالة
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

// ── ملف البيانات ─────────────────────────────────────────────────────────────
const DATA_FILE = path.join(process.cwd(), "database/data/sayanAuto.json");
fs.ensureDirSync(path.dirname(DATA_FILE));

function loadData() {
  try { if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch (_) {}
  return {};
}
function saveData(d) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); } catch (_) {}
}

// ── حالة الإرسال التلقائي (في الذاكرة) ──────────────────────────────────────
if (!global._sayanIntervals) global._sayanIntervals = {}; // tid → { timer, msg, intervalMs }

// ── خط فاصل ──────────────────────────────────────────────────────────────────
const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

// ── قائمة الأوامر للدليل ──────────────────────────────────────────────────────
const COMMANDS = [
  // الإدارة
  {
    icon: "🔒", name: "اسم-غروب", cat: "🛡️ الإدارة",
    desc: "قفل اسم الغروب ومنع تغييره",
    usage: "! اسم-غروب [الاسم] — تفعيل\n! اسم-غروب off — إيقاف\n! اسم-غروب status — الحالة\n! اسم-غروب time [min] [max] — ضبط التجديد",
    role: "🔑 أدمن",
  },
  {
    icon: "✍️", name: "كنية", cat: "🛡️ الإدارة",
    desc: "قفل كنيات الأعضاء ومنع تغييرها — حلقة مستمرة",
    usage: "! كنية [الاسم] — تفعيل لكل الأعضاء\n! كنية off — إيقاف\n! كنية status — الحالة\n! كنية حدف — حذف الكنيات",
    role: "🔑 أدمن",
  },
  {
    icon: "🖼️", name: "صورة-غروب", cat: "🛡️ الإدارة",
    desc: "تغيير وقفل صورة الغروب تلقائياً",
    usage: "! صورة-غروب [رابط] — أو رد على صورة\n! صورة-غروب off — إيقاف\n! صورة-غروب status — الحالة",
    role: "🔑 أدمن",
  },
  {
    icon: "👥", name: "قفل-عضو", cat: "🛡️ الإدارة",
    desc: "يُضيف عضواً تلقائياً عند مغادرة أي شخص لإبقاء العدد ثابتاً",
    usage: "! قفل-عضو on — تفعيل للغروب الحالي\n! قفل-عضو off — إيقاف\n! قفل-عضو status — الحالة\n! قفل-عضو list — كل الغروبات",
    role: "🔑 أدمن",
  },
  {
    icon: "📸", name: "أفاتار", cat: "🛡️ الإدارة",
    desc: "تغيير صورة بروفايل حساب البوت",
    usage: "! أفاتار [رابط الصورة]\nأو رد على صورة بـ  ! أفاتار",
    role: "👑 مالك",
  },
  // الرسائل التلقائية
  {
    icon: "✨", name: "سايان اضافة", cat: "💬 الرسائل التلقائية",
    desc: "حفظ رسالة لإرسالها تلقائياً في الغروب",
    usage: "! سايان اضافة [الرسالة]\nمثال: ! سايان اضافة ماغنوس الأقوى",
    role: "🔑 أدمن",
  },
  {
    icon: "▶️", name: "سايان تشغيل", cat: "💬 الرسائل التلقائية",
    desc: "تشغيل إرسال الرسالة المحفوظة بالفترة المحددة",
    usage: "! سايان تشغيل [N]ث — كل N ثانية\n! سايان تشغيل [N]د — كل N دقيقة\nمثال: ! سايان تشغيل 15ث\nمثال: ! سايان تشغيل 5د",
    role: "🔑 أدمن",
  },
  {
    icon: "⏹️", name: "سايان ايقاف", cat: "💬 الرسائل التلقائية",
    desc: "إيقاف الإرسال التلقائي في الغروب الحالي",
    usage: "! سايان ايقاف",
    role: "🔑 أدمن",
  },
  {
    icon: "👼", name: "ملاك", cat: "💬 الرسائل التلقائية",
    desc: "رسائل تلقائية ذكية — يتوقف إذا لم يرد أحد ويستأنف عند أول رد",
    usage: "! ملاك [رسالة] [min] [max] — تفعيل (المدة بالثواني)\n! ملاك off — إيقاف\n! ملاك status — الحالة\nمثال: ! ملاك صباح الخير 30 60",
    role: "🔑 أدمن",
  },
  {
    icon: "🌀", name: "دورية", cat: "💬 الرسائل التلقائية",
    desc: "رسائل دورية للغروب بانتظار عشوائي بين كل رسالة",
    usage: "! دورية [رسالة] [min-max ثانية] — تفعيل\n! دورية off — إيقاف\n! دورية status — الحالة\nمثال: ! دورية تفضلوا بالطلب 60 120",
    role: "🔑 أدمن",
  },
  // الترفيه
  {
    icon: "🎵", name: "أغنية", cat: "🎭 الترفيه والوسائط",
    desc: "البحث عن الأغاني وتنزيلها من YouTube",
    usage: "! أغنية [اسم الأغنية أو كلمات]\nمثال: ! أغنية يا حبيبي",
    role: "👤 مستخدم",
  },
  {
    icon: "🎬", name: "تيك", cat: "🎭 الترفيه والوسائط",
    desc: "تنزيل فيديو TikTok بدون علامة مائية أو البحث فيه",
    usage: "! تيك [رابط TikTok]\nأو: ! تيك [كلمة بحث]",
    role: "👤 مستخدم",
  },
  // النظام
  {
    icon: "⏱️", name: "حالة", cat: "⚙️ النظام",
    desc: "عرض وقت تشغيل البوت مع إحصائيات الذاكرة والأداء",
    usage: "! حالة",
    role: "👤 مستخدم",
  },
  {
    icon: "💬", name: "محادثات", cat: "⚙️ النظام",
    desc: "إدارة الغروبات والمحادثات الخاصة",
    usage: "! محادثات count — إحصائيات\n! محادثات list — قائمة الغروبات\n! محادثات dm on/off — قفل/فك الخاص\n! محادثات ملاك — حالة الملاك",
    role: "🔑 أدمن",
  },
  {
    icon: "📖", name: "سايان دليل", cat: "⚙️ النظام",
    desc: "دليل الأوامر الشامل مع شرح الاستخدام وعدد الأدمنز",
    usage: "! سايان دليل — كل الأوامر\n! دليل [اسم الأمر] — تفاصيل أمر",
    role: "👤 مستخدم",
  },
];

// ═══════════════════════════════════════════════════════════════
//  دليل الأوامر
// ═══════════════════════════════════════════════════════════════

function buildFullGuide(prefix) {
  const cfg      = global.GoatBot?.config || {};
  const admins   = [...new Set([
    ...(cfg.adminBot      || []),
    ...(cfg.superAdminBot || []),
    cfg.ownerID,
  ].filter(Boolean))];

  const allCmds  = global.GoatBot?.commands;
  let totalCmds  = 0;
  if (allCmds?.size) {
    const seen = new Set();
    for (const [, c] of allCmds) { if (c.config?.name) seen.add(c.config.name); }
    totalCmds = seen.size;
  } else {
    totalCmds = COMMANDS.length;
  }

  // إضافة أوامر سايان الفرعية إلى العدد
  const extraCmds = 3; // اضافة + تشغيل + ايقاف
  totalCmds = Math.max(totalCmds, COMMANDS.length);

  const cats = {};
  for (const cmd of COMMANDS) {
    if (!cats[cmd.cat]) cats[cmd.cat] = [];
    cats[cmd.cat].push(cmd);
  }

  const lines = [];
  lines.push(LINE);
  lines.push("  ✦  س ا ي ا ن  ✦");
  lines.push("  🤖 مساعدك الذكي على ماسنجر");
  lines.push(`  ⚡ البادئة: ${prefix}  •  📦 الأوامر: ${totalCmds}`);
  lines.push(`  👑 عدد الأدمنز: ${admins.length}`);
  lines.push(LINE);
  lines.push("");

  for (const [catName, cmds] of Object.entries(cats)) {
    const bar = "═".repeat(Math.max(1, 26 - [...catName].length * 2));
    lines.push(` ╔═ ${catName} ${bar}╗`);
    for (const cmd of cmds) {
      lines.push(` ║  ${cmd.icon}  ${prefix}${cmd.name.padEnd(14)}${cmd.desc}`);
    }
    lines.push(` ╚${"═".repeat(35)}╝`);
    lines.push("");
  }

  lines.push(LINE);
  lines.push(`  ❓ للتفاصيل: ${prefix}دليل [اسم الأمر]`);
  lines.push(`  مثال: ${prefix}دليل أغنية`);
  lines.push(LINE);

  return lines.join("\n");
}

function buildOneCmd(rawName, prefix) {
  const name = rawName.trim().replace(/^!+\s*/, "").toLowerCase();

  const allCmds = global.GoatBot?.commands;
  let matched   = COMMANDS.find(c =>
    c.name.toLowerCase() === name ||
    (allCmds?.get(name)?.config?.name || "").toLowerCase() === c.name.toLowerCase()
  );

  if (!matched && allCmds) {
    const cmd = allCmds.get(name);
    if (cmd?.config) {
      matched = {
        icon: "•",
        name: cmd.config.name,
        cat:  cmd.config.category || "عام",
        desc: cmd.config.description || "لا يوجد وصف",
        usage: (cmd.config.guide?.en || `${prefix}${cmd.config.name}`).replace(/\{p[n]?\}/g, prefix),
        role: cmd.config.role >= 3 ? "👑 مالك" : cmd.config.role >= 2 ? "🔑 أدمن" : "👤 مستخدم",
      };
    }
  }

  if (!matched) {
    return `❌ لا يوجد أمر باسم "${rawName}".\nاكتب ${prefix}سايان دليل لرؤية كل الأوامر.`;
  }

  const lines = [];
  lines.push(LINE);
  lines.push(`  ${matched.icon}  ${prefix}${matched.name}`);
  lines.push(LINE);
  lines.push("");
  lines.push(`  📝 الوصف:`);
  lines.push(`     ${matched.desc}`);
  lines.push("");
  lines.push(`  📌 الاستخدام:`);
  for (const l of matched.usage.split("\n")) lines.push(`     ${l}`);
  lines.push("");
  lines.push(`  🏷  الفئة     : ${matched.cat}`);
  lines.push(`  🔐 الصلاحية  : ${matched.role}`);
  lines.push("");
  lines.push(LINE);
  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════
//  الإرسال التلقائي — اضافة / تشغيل / ايقاف
// ═══════════════════════════════════════════════════════════════

/** تحليل المدة: "15ث" → 15000ms | "5د" → 300000ms */
function parseDuration(str) {
  if (!str) return null;
  const clean = str.trim();
  const match = clean.match(/^(\d+(?:\.\d+)?)(ث|د|s|m)?$/i);
  if (!match) return null;
  const num  = parseFloat(match[1]);
  const unit = match[2] || "ث";
  if (isNaN(num) || num <= 0) return null;
  if (unit === "د" || unit === "m") return Math.round(num * 60 * 1000);
  return Math.round(num * 1000);
}

function startAutoSend(api, threadID, msg, intervalMs) {
  // أوقف أي جلسة قديمة
  if (global._sayanIntervals[threadID]) {
    clearInterval(global._sayanIntervals[threadID].timer);
  }
  const timer = setInterval(() => {
    api.sendMessage(msg, threadID, err => {
      if (err) {
        // أوقف إذا فشل الإرسال
        clearInterval(global._sayanIntervals[threadID]?.timer);
        delete global._sayanIntervals[threadID];
      }
    });
  }, intervalMs);

  global._sayanIntervals[threadID] = { timer, msg, intervalMs, startedAt: Date.now() };
}

function stopAutoSend(threadID) {
  if (global._sayanIntervals[threadID]) {
    clearInterval(global._sayanIntervals[threadID].timer);
    delete global._sayanIntervals[threadID];
    return true;
  }
  return false;
}

function formatMs(ms) {
  if (ms >= 60000) {
    const m = Math.round(ms / 60000);
    return `${m} دقيقة`;
  }
  return `${Math.round(ms / 1000)} ثانية`;
}

// ═══════════════════════════════════════════════════════════════
//  Module
// ═══════════════════════════════════════════════════════════════
module.exports = {
  config: {
    name: "سايان",
    aliases: ["دليل", "help", "h", "مساعدة", "أوامر"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 2,
    role: 0,
    category: "info",
    description: "دليل الأوامر + حفظ وإرسال رسائل تلقائية",
    guide: {
      en: "{pn} دليل — عرض كل الأوامر\n{pn} اضافة [رسالة] — حفظ رسالة\n{pn} تشغيل [N]ث / [N]د — بدء الإرسال\n{pn} ايقاف — إيقاف الإرسال",
    },
  },

  onStart: async function ({ api, event, args, message, prefix }) {
    const p   = prefix || "!";
    const tid = event.threadID;
    const sub = (args[0] || "").trim();

    // ── ! سايان اضافة [رسالة] ────────────────────────────────────
    if (sub === "اضافة" || sub === "إضافة" || sub === "add") {
      const text = args.slice(1).join(" ").trim();
      if (!text) return message.reply("❌ اكتب الرسالة بعد الأمر.\nمثال: ! سايان اضافة ماغنوس الأقوى");

      const data = loadData();
      data[tid]  = { msg: text, savedAt: Date.now() };
      saveData(data);

      return message.reply(
        `✅ تم الحفظ!\n${LINE}\n📝 الرسالة: ${text}\n\nلتشغيل الإرسال:\n! سايان تشغيل 15ث  ← كل 15 ثانية\n! سايان تشغيل 5د   ← كل 5 دقائق`
      );
    }

    // ── ! سايان تشغيل [مدة] ──────────────────────────────────────
    if (sub === "تشغيل" || sub === "شغل" || sub === "start") {
      const durStr     = args[1] || "";
      const intervalMs = parseDuration(durStr);

      if (!intervalMs) {
        return message.reply(
          `❌ حدد المدة بشكل صحيح.\n\nأمثلة:\n! سايان تشغيل 15ث  ← كل 15 ثانية\n! سايان تشغيل 5د   ← كل 5 دقائق`
        );
      }

      // حد أدنى 5 ثوانٍ
      if (intervalMs < 5000) {
        return message.reply("⚠️ أقل مدة مسموح بها 5 ثوانٍ.");
      }

      const data = loadData();
      const saved = data[tid]?.msg;
      if (!saved) {
        return message.reply(`❌ لا توجد رسالة محفوظة لهذا الغروب.\nاحفظ رسالة أولاً:\n! سايان اضافة [الرسالة]`);
      }

      startAutoSend(api, tid, saved, intervalMs);

      return message.reply(
        `▶️ تم التشغيل!\n${LINE}\n📝 الرسالة: ${saved}\n⏱️ الفترة: كل ${formatMs(intervalMs)}\n\nللإيقاف: ! سايان ايقاف`
      );
    }

    // ── ! سايان ايقاف ─────────────────────────────────────────────
    if (sub === "ايقاف" || sub === "إيقاف" || sub === "وقف" || sub === "stop") {
      const stopped = stopAutoSend(tid);
      if (stopped) return message.reply("⏹️ تم إيقاف الإرسال التلقائي.");
      return message.reply("ℹ️ لا يوجد إرسال نشط في هذا الغروب.");
    }

    // ── ! سايان رسالة (عرض الحالة) ───────────────────────────────
    if (sub === "رسالة" || sub === "حالة") {
      const data   = loadData();
      const saved  = data[tid]?.msg;
      const active = global._sayanIntervals[tid];
      let msg = `📊 حالة الإرسال التلقائي\n${LINE}\n`;
      msg += `📝 الرسالة: ${saved || "لا توجد رسالة محفوظة"}\n`;
      msg += `⚡ الحالة: ${active ? `نشط — كل ${formatMs(active.intervalMs)}` : "متوقف"}\n`;
      return message.reply(msg);
    }

    // ── ! سايان دليل ─────────────────────────────────────────────
    if (sub === "دليل" && args[1]) {
      return message.reply(buildOneCmd(args[1], p));
    }

    // ── ! دليل [اسم] (عند الاستدعاء بالاسم المستعار) ─────────────
    if (sub && sub !== "دليل") {
      return message.reply(buildOneCmd(sub, p));
    }

    // ── ! سايان / ! سايان دليل / ! دليل ← الدليل الكامل ─────────
    message.reply(buildFullGuide(p));
  },
};
