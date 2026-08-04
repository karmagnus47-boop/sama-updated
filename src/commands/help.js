/**
 * سايان — أمر الدليل الشامل
 * الاستخدام: ! سايان دليل  أو  ! دليل
 */
"use strict";

const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

// ── تفاصيل كل أمر ────────────────────────────────────────────────────────────
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
    icon: "📖", name: "سايان", cat: "⚙️ النظام",
    desc: "دليل الأوامر الشامل مع شرح الاستخدام",
    usage: "! سايان دليل — كل الأوامر\n! دليل [اسم الأمر] — تفاصيل أمر",
    role: "👤 مستخدم",
  },
];

// ── بناء رسالة الدليل الكامل ─────────────────────────────────────────────────
function buildFullGuide(prefix) {
  const cfg      = global.GoatBot?.config || {};
  const admins   = [...new Set([
    ...(cfg.adminBot      || []),
    ...(cfg.superAdminBot || []),
    cfg.ownerID,
  ].filter(Boolean))];
  const adminCount = admins.length;

  // عدد الأوامر المحمّلة فعلياً
  const allCmds  = global.GoatBot?.commands;
  let totalCmds  = 0;
  if (allCmds?.size) {
    const seen = new Set();
    for (const [, c] of allCmds) { if (c.config?.name) seen.add(c.config.name); }
    totalCmds = seen.size;
  } else {
    totalCmds = COMMANDS.length;
  }

  // تجميع حسب الفئة
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
  lines.push(`  👑 عدد الأدمنز: ${adminCount}`);
  lines.push(LINE);
  lines.push("");

  for (const [catName, cmds] of Object.entries(cats)) {
    const bar = "═".repeat(Math.max(1, 26 - catName.replace(/[^\u0000-\u007F]/g, "  ").length));
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

// ── بناء رسالة أمر واحد ──────────────────────────────────────────────────────
function buildOneCmd(rawName, prefix) {
  const name = rawName.trim().replace(/^!+\s*/, "").toLowerCase();

  // ابحث في قائمة الأوامر الداخلية (بالاسم أو الاسم الأصلي)
  const allCmds = global.GoatBot?.commands;
  let matched   = COMMANDS.find(c =>
    c.name.toLowerCase() === name ||
    (allCmds?.get(name)?.config?.name || "").toLowerCase() === c.name.toLowerCase()
  );

  // إذا لم يُوجد في قائمتنا، خذ البيانات من allCmds مباشرة
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

// ── Module ────────────────────────────────────────────────────────────────────
module.exports = {
  config: {
    name: "سايان",
    aliases: ["دليل", "help", "h", "مساعدة", "أوامر"],
    version: "1.0",
    author: "DJAMEL",
    countDown: 3,
    role: 0,
    category: "info",
    description: "دليل الأوامر الشامل لبوت سايان",
    guide: {
      en: "{pn} دليل — عرض كل الأوامر\n{pn} دليل [اسم الأمر] — تفاصيل أمر محدد",
    },
  },

  onStart: async function ({ args, message, prefix }) {
    const p = prefix || "!";

    // ! سايان دليل [اسم] ← تفاصيل أمر محدد
    if (args[0] === "دليل" && args[1]) {
      return message.reply(buildOneCmd(args[1], p));
    }

    // ! دليل [اسم] ← تفاصيل أمر محدد (عند استدعائه بالاسم المستعار)
    if (args[0] && args[0] !== "دليل") {
      return message.reply(buildOneCmd(args[0], p));
    }

    // ! سايان دليل  أو  ! سايان  أو  ! دليل ← الدليل الكامل
    message.reply(buildFullGuide(p));
  },
};
