const db = require('../models/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authModel = require('../models/authModel');

// 简单的滑块验证（仅防机器人的轻量实现）
// 存储在内存：{ token: { target: number, expiresAt: Date, used: boolean } }
const captchaStore = new Map();
const CAPTCHA_TTL_MS = 5 * 60 * 1000; // 5 分钟

function genToken() {
  return require('crypto').randomBytes(18).toString('hex');
}

// 生成 4 位数字验证码并返回一个 SVG 数据 URL（简单扭曲的数字）
function makeCaptchaSVG(code) {
  // 简单 SVG，每个数字随机旋转、位移，并添加噪点线段
  const width = 140;
  const height = 48;
  const bg = '#f6f8fa';
  const colors = ['#111827','#0b5ed7','#0f5132','#6f42c1','#b91c1c'];

  let digits = '';
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const x = 12 + i * 30 + (Math.random() * 8 - 4);
    const y = 30 + (Math.random() * 6 - 3);
    const rotate = (Math.random() * 30 - 15).toFixed(2);
    const fill = colors[Math.floor(Math.random() * colors.length)];
    digits += `<text x="${x}" y="${y}" transform="rotate(${rotate} ${x} ${y})" font-size="28" font-family="Arial,Helvetica,sans-serif" fill="${fill}" font-weight="700">${ch}</text>`;
  }

  // 画一些干扰线
  let noise = '';
  for (let i = 0; i < 6; i++) {
    const x1 = Math.floor(Math.random() * width);
    const y1 = Math.floor(Math.random() * height);
    const x2 = Math.floor(Math.random() * width);
    const y2 = Math.floor(Math.random() * height);
    const stroke = colors[Math.floor(Math.random() * colors.length)];
    const opacity = (0.2 + Math.random() * 0.6).toFixed(2);
    noise += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1" stroke-opacity="${opacity}" />`;
  }

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'>` +
    `<rect width='100%' height='100%' fill='${bg}' />` +
    noise +
    digits +
    `</svg>`;

  // encode as data URL
  const encoded = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${encoded}`;
}

exports.createCaptcha = (req, res) => {
  const token = genToken();
  // 生成 4 位数字
  const code = String(Math.floor(Math.random() * 9000) + 1000);
  const expiresAt = Date.now() + CAPTCHA_TTL_MS;
  captchaStore.set(token, { code, expiresAt, used: false });
  const svgText = makeCaptchaSVG(code);
  return res.json({ captchaToken: token, svgText });
};

// 验证数字验证码
function verifyCaptchaToken(token, submittedCode) {
  if (!token) return { ok: false, reason: 'missing_token' };
  const rec = captchaStore.get(token);
  if (!rec) return { ok: false, reason: 'invalid_token' };
  if (rec.used) return { ok: false, reason: 'token_used' };
  if (Date.now() > rec.expiresAt) {
    captchaStore.delete(token);
    return { ok: false, reason: 'token_expired' };
  }
  if (!submittedCode || String(submittedCode).trim() !== String(rec.code)) return { ok: false, reason: 'code_mismatch' };
  rec.used = true;
  setTimeout(() => captchaStore.delete(token), 60 * 1000);
  return { ok: true };
}

// 注册接口（带用户名唯一性检查、salt/hash 存储）
exports.register = async (req, res) => {
  const { username, password, role, contact } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码为必填项' });
  if (!contact) return res.status(400).json({ error: '请提供邮箱或手机号' });

  const uname = String(username).trim();
  const pwd = String(password);
  const contactRaw = String(contact).trim();

  if (uname.length < 2 || uname.length > 50) return res.status(400).json({ error: '用户名长度应在2~50之间' });
  if (pwd.length < 6) return res.status(400).json({ error: '密码长度至少6位' });

  // 判断 contact 是邮箱还是手机号
  let email = null;
  let phone = null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[0-9]{7,15}$/; // 简单国际手机号校验

  if (emailRegex.test(contactRaw)) {
    email = contactRaw.toLowerCase();
  } else if (phoneRegex.test(contactRaw)) {
    phone = contactRaw;
  } else {
    return res.status(400).json({ error: 'contact 必须是有效的邮箱或手机号' });
  }

  // 必须校验图形验证码（4位数字）
  const { captchaToken, captchaCode } = req.body;
  const captchaCheck = verifyCaptchaToken(captchaToken, captchaCode);
  if (!captchaCheck.ok) {
    return res.status(400).json({ error: '图形验证码验证失败', detail: captchaCheck.reason });
  }

  try {
    const existing = await authModel.findByUsername(uname);
    if (existing && existing.length > 0) return res.status(409).json({ error: '用户名已存在' });

    // 检查 contact 唯一性
    if (email) {
      const e = await authModel.findByEmail(email);
      if (e && e.length > 0) return res.status(409).json({ error: '该邮箱已被注册' });
    }
    if (phone) {
      const p = await authModel.findByPhone(phone);
      if (p && p.length > 0) return res.status(409).json({ error: '该手机号已被注册' });
    }

    // 生成 salt 与 hash
    const salt = bcrypt.genSaltSync(12);
    const passwordHash = bcrypt.hashSync(pwd, salt);

    // 插入用户并写入 email 或 phone
    await authModel.createUser({ username: uname, passwordHash, salt, role: role || 'listener', email, phone });
    return res.json({ message: '注册成功' });
  } catch (err) {
    return res.status(500).json({ error: '数据库错误', detail: err.message || err });
  }
};

// 登录接口（校验 password_hash，并检查 is_active/is_banned）
exports.login = (req, res) => {
  // 支持使用用户名、邮箱或手机号登录
  const { username: identifier, password, role } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: '用户名/邮箱/手机号和密码为必填项' });

  const id = String(identifier).trim();
  authModel.findByIdentifier(id)
    .then(rows => {
      if (!rows || rows.length === 0) return res.status(401).json({ error: '找不到用户' });
      const user = rows[0];

      // 检查账户状态
      if (user.is_banned) return res.status(403).json({ error: '账号已被封禁' });
      if (user.is_active === 0) return res.status(403).json({ error: '账号未激活' });

      // 校验密码
      const valid = bcrypt.compareSync(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: '密码错误' });

      // 校验角色是否匹配（可选）
      if (role && user.role !== role) {
        return res.status(403).json({ error: '身份与账号不符，请选择正确的身份' });
      }

    // 生成 token（payload 中包含 username）
    const payload = { userId: user.id, role: user.role, username: user.username };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'default_secret', { expiresIn: '3h' });
    return res.json({ message: '登录成功', token, role: user.role, username: user.username });
    })
    .catch(err => {
      return res.status(500).json({ error: '数据库错误', detail: err.message || err });
    });
};
