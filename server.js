// server.js
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import 'dotenv/config';
const subjectMap = {
  ru: "Заказ",
  en: "Order",
  et: "Tellimus"
};

function roundCash(amount) {
    return Math.round(amount * 20) / 20;
}

const app = express();
app.use(cors());
app.use(express.json());

let orderNumber = Number(process.env.ORDER_NUMBER || 0);

app.post('/order', async (req, res) => {
    try {
        orderNumber++;

        const orderNumberStr = orderNumber.toString().padStart(3, '0');
        const order = req.body;
        const lang = order.checkout?.lang || order.lang || "en";
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');

const dateTime = `${pad(now.getDate())}.${pad(now.getMonth()+1)}.${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        const timestamp = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}, ${now.getDate().toString().padStart(2,'0')}.${(now.getMonth()+1).toString().padStart(2,'0')}.${now.getFullYear()}`;

        // ===== Формирование текста заказа =====
let orderText = `Заказ № ${orderNumberStr}\n\n`;

orderText += `Заказано: ${timestamp}\n`;
orderText += `Язык: ${order.lang}\n`;
orderText += `Имя: ${order.checkout.name}\n`;
orderText += `Телефон: ${order.checkout.phone}\n`;
orderText += `Email: ${order.checkout.email}\n`;
orderText += `Способ оплаты: ${order.checkout.payment}\n`;
orderText += `Метод получения: ${order.checkout.method}\n`;

// корректируем дату
let date = order.checkout.date || '-';
if (date.startsWith('Дата:')) date = date.replace(/^Дата:\s*/, '');
orderText += `Дата: ${date}\n`;

orderText += `Время: ${order.checkout.time || '-'}\n`;
orderText += `Адрес: ${order.checkout.address || '-'}\n`;
orderText += `Промокод: ${order.checkout.promo || '-'}\n`;
orderText += `Комментарий: ${order.checkout.comment || '-'}\n\n`;

// ===== Товары =====
let subtotal = 0;
orderText += `Товары:\n`;
if (!Array.isArray(order.cart)) {
    throw new Error('order.cart отсутствует или не массив');
}

order.cart.forEach(item => {
    const lineTotal = item.unitPrice * item.qty;
    subtotal += lineTotal;
    orderText += `- ${item.name} x${item.qty} = ${lineTotal.toFixed(2)} €\n`;
});

// ===== Подытог, доставка, скидка =====
orderText += `\nПодытог: ${subtotal.toFixed(2)} €\n`;
orderText += `Доставка: ${order.delivery.toFixed(2)} €\n`;

// скидка
const discount = Math.abs(order.discount || 0);

// базовая сумма
let total = subtotal - discount + order.delivery;

let rounding = 0;

if (order.checkout.payment?.toLowerCase() === 'наличные') {
    const roundedTotal = roundCash(total);
    rounding = roundedTotal - total;
    total = roundedTotal;
}

orderText += `Скидка: ${discount.toFixed(2)} €\n`;
orderText += `Округление: ${rounding.toFixed(2)} €\n\n`;

orderText += `Итог: ${total.toFixed(2)} €`;




        const token = process.env.TELEGRAM_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: orderText })
        });


// ===== EMAIL =====
try {
    const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: "SushiX <onboarding@resend.dev>",
            to: order.checkout.email,
            subject: `${subjectMap[lang] || "Order"} #${orderNumberStr}`,
            html: buildEmail({
                orderId: orderNumberStr,
                items: order.cart.map(i => ({
                    name: i.name,
                    qty: i.qty,
                    price: i.unitPrice
                })),
                method: order.checkout.method,
                delivery: order.checkout.method,
                deliveryPrice: order.delivery,
                discount: order.discount,
                promo: order.checkout.promo,
                address: order.checkout.address,
                name: order.checkout.name,
                phone: order.checkout.phone,
                email: order.checkout.email,
                payment: order.checkout.payment,
                comment: order.checkout.comment,
                dateTime: dateTime,
                time: order.checkout.time,
                date: order.checkout.date
            }, order.lang)
        })
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
        console.error("Email error:", emailData);
    }

} catch (e) {
    console.error("Email crash:", e);
}


        

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: err.message });
    }
});


function buildEmail(data, lang = "ru") {

const items = Array.isArray(data.items) ? data.items : [];

const t = {
  ru: {
    thanks: "Спасибо за ваш заказ!",
    thanks2: "Спасибо, что выбрали нас!",
    order: "Заказ",
    item: "Товар",
    qty: "Кол-во",
    price: "Цена за шт",
    price2: "Сумма",
    items: "Товары",
    promo: "Промокод",
    discount: "Скидка",
    rounding: "Округление",
    delivery: "Доставка",
    pickup: "Самовывоз",
    address: "Адрес",
    name: "Имя",
    phone: "Телефон",
    payment: "Оплата",
    method: "Способ получения",
    timeDelivery: "Время доставки",
    timePickup: "Время самовывоза",
    payment: "Оплата",
    comment: "Комментарий",
    date: "Дата заказа",
    support: "По вопросам",
    total: "ИТОГ"
  },
  en: {
    thanks: "Thank you for your order!",
    thanks2: "We appreciate your choice!",
    order: "Order",
    item: "Item",
    qty: "Qty",
    price: "Price",
    price2: "Total",
    items: "Items",
    promo: "Promo code",
    discount: "Discount",
    rounding: "Rounding",
    delivery: "Delivery",
    pickup: "Pickup",
    address: "Address",
    name: "Name",
    phone: "Phone",
    payment: "Payment",
    method: "Method",
    timeDelivery: "Delivery time",
    timePickup: "Pickup time",
    payment: "Payment",
    comment: "Comment",
    date: "Order date",
    support: "For questions",
    total: "TOTAL"
  },
  et: {
    thanks: "Täname tellimuse eest!",
    thanks2: "Aitäh, et valisite meid!",
    order: "Tellimus",
    item: "Toode",
    qty: "Kogus",
    price: "Tüki hind",
    price2: "Summa",
    items: "Kaubad",
    promo: "Sooduskood",
    discount: "Allahindlus",
    rounding: "Ümardamine",
    delivery: "Kohaletoimetamine",
    pickup: "Tulen ise järele",
    address: "Aadress",
    name: "Nimi",
    phone: "Telefon",
    payment: "Maksmine",
    method: "Saamise viis",
    timeDelivery: "Kohaletoimetamise aeg",
    timePickup: "Järeletulemise aeg",
    payment: "Makse",
    comment: "Kommentaar",
    date: "Tellimuse kuupäev",
    support: "Küsimuste korral",
    total: "KOKKU"
  }
}[lang] || {
  thanks: "Thanks",
  thanks2: "",
  order: "",
  items: "",
  delivery: "",
  pickup: "",
  address: "",
  timeDelivery: "",
  timePickup: "",
  payment: "",
  comment: "",
  date: "",
  total: ""
};




  const orderId = data.orderId || "-";

  const isDelivery = normalizeMethod(data.method) === "delivery";

  // 📦 ITEMS
  const itemsHtml = items.map(i => {
  const total = i.qty * i.price;

  return `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:left;">
        ${i.name}
      </td>

      <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;width:180px;">
        ${i.price.toFixed(2)}€
      </td>

      <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;width:40px;">
        ${i.qty}
      </td>

      <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">
        ${total.toFixed(2)}€
      </td>
    </tr>
  `;
}).join("");

  const subtotal = data.items.reduce((s, i) => s + i.qty * i.price, 0);

const deliveryPrice = Number(data.deliveryPrice || 0);
const discount = Number(data.discount || 0);

// PROMO

const promoCode = (data.promo || "").trim().toUpperCase();

const hasPromo = promoCode.length > 0;
const hasDiscount = discount < 0;

// CASH CHECK
const isCash = data.payment === "Наличные";

// BASE TOTAL
const baseTotal = subtotal + deliveryPrice + discount;

function normalizeMethod(value = "") {
  const v = value.toLowerCase().trim();

  if (
    v === "delivery" ||
    v === "доставка" ||
    v === "kohaletoimetamine"
  ) {
    return "delivery";
  }

  return "pickup";
}

let total = baseTotal;
let rounding = 0;

if (isCash) {
    const rounded = roundCash(baseTotal);
    rounding = rounded - baseTotal;
    total = rounded;
}

  // 🕒 DELIVERY TEXT
  const deliveryLabel = isDelivery
  ? t.timeDelivery
  : t.timePickup;

 const address = isDelivery
  ? (data.address || "-")
  : "Harku Vald, Tiskre küla";

  // ---------- SUMMARY ----------
  const summaryHtml = `
    <table width="100%" style="margin-top:0px;">
      <tr>
        <td></td>
        <td style="text-align:right;"><b>${t.items}:</b> ${subtotal.toFixed(2)}€</td>
      </tr>

      ${isDelivery ? `
<tr>
  <td></td>
  <td style="text-align:right;"><b>${t.delivery}:</b> ${deliveryPrice}€</td>
</tr>
` : ""}

${hasPromo ? `
<tr>
  <td></td>
  <td style="text-align:right;color:#999;">
    <b>${t.promo}:</b> ${promoCode}
  </td>
</tr>
` : ""}

${hasDiscount ? `
<tr>
  <td></td>
  <td style="text-align:right;color:green;">
    <b>${t.discount}:</b> ${discount}€
  </td>
</tr>
` : ""}
${isCash ? `
<tr>
  <td></td>
  <td style="text-align:right;">
    <b>${t.rounding}:</b> ${rounding.toFixed(2)}€
  </td>
</tr>
` : ""}
      <tr>
        <td></td>
        <td style="text-align:right;border-top:2px solid #000;padding-top:5px;padding-bottom:0;">
  <h2 style="margin:5px 0;">
  ${t.total}: ${total.toFixed(2)}€
</h2>
</td>
      </tr>
    </table>
  `;

  return `
  <div style="font-family:Arial;background:#f6f6f6;padding:20px;">
    <div style="max-width:650px;margin:auto;background:#fff;border-radius:10px;overflow:hidden;">

     <!-- HEADER -->
<div style="background:#000;text-align:center;padding:20px 0;">
  <a href="https://sushix0.github.io/SUSHI-X/">
    <img 
      src="https://sushix0.github.io/SUSHI-X/Foto/Logo.png"
      style="max-width:360px;display:inline-block;"
    >
  </a>
</div>

      <div style="padding:20px;">

        <table width="100%" role="presentation" style="border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:0;">
      
      <div style="height:15px;"></div>

      <b style="font-size:22px;display:block;line-height:1;">
        ${t.order} #${orderId}
      </b>

      <div style="height:30px;"></div>

    </td>
  </tr>
</table>

        <!-- ITEMS -->
        <table width="100%" style="border-collapse:collapse;">
          <tr style="background:#f7f7f7;font-weight:bold;">
  <td style="padding:10px;">${t.item}</td>
  <td style="padding:10px;text-align:center;width:140px;">${t.price}</td>
  <td style="padding:10px;text-align:center;width:60px;">${t.qty}</td>
  <td style="padding:10px;text-align:right;width:100px;">${t.price2}</td>
</tr>
          ${itemsHtml}
        </table>

        <hr style="margin:10px 0;">

        <!-- SUMMARY -->
        ${summaryHtml}

        <hr style="margin:5px 0;">

        <!-- DELIVERY + ADDRESS (ПРАВИЛЬНО ВМЕСТЕ) -->
        <table width="100%">
          <tr>
            <td style="width:50%;">
              <b>${deliveryLabel}:</b><br>
              ${data.dateTime}
            </td>

            <td style="width:50%; text-align:right;">
              <b>${t.address}:</b><br>
              ${address}
            </td>
          </tr>
        </table>

        <hr style="margin:5px 0;">

        <!-- CUSTOMER -->
        <p><b>${t.name}:</b> ${data.name || "-"}</p>
<p><b>${t.phone}:</b> ${data.phone || "-"}</p>
        <p><b>Email:</b> ${data.email}</p>
        <p><b>${t.payment}:</b> ${data.payment}</p>
        <p>
  <b>${t.method}:</b>
  ${isDelivery ? t.delivery : t.pickup}
</p>
        <p><b>${t.comment}:</b> ${data.comment || "-"}</p>

<p><b>${t.date}:</b> ${data.dateTime}</p>

<p style="text-align:center;font-size:16px;margin:20px 0 10px 0;">
  <b>${t.thanks}</b><br>
  <span>${t.thanks2}</span>
</p>
        
        <!-- SOCIALS -->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:20px;">
  <tr>

    <!-- LEFT: SUPPORT -->
    <td align="left" style="width:50%; font-size:13px; color:#888;">
      ${t.support}:<br>
      <a href="mailto:sushix.info@gmail.com" style="color:#1a73e8;">
        sushix.info@gmail.com
      </a>
    </td>

    <!-- RIGHT: SOCIALS -->
    <td align="right" style="width:50%;">
      
      <table cellpadding="0" cellspacing="0" role="presentation" style="border-spacing:0; margin-left:auto;">
        <tr>

          <td style="padding:0 10px;">
            <a href="https://www.facebook.com/sushix.ee" target="_blank">
              <img 
                src="https://eztrlca.stripocdn.email/content/assets/img/social-icons/logo-colored/facebook-logo-colored.png"
                width="32" height="32"
                style="display:block;border:0;"
                alt="Facebook"
              >
            </a>
          </td>

          <td style="padding:0 10px;">
            <a href="https://www.instagram.com/sushix.eesti" target="_blank">
              <img 
                src="https://eztrlca.stripocdn.email/content/assets/img/social-icons/logo-colored/instagram-logo-colored.png"
                width="32" height="32"
                style="display:block;border:0;"
                alt="Instagram"
              >
            </a>
          </td>

        </tr>
      </table>

    </td>
  </tr>
</table>
</td>

      </div>
    </div>
  </div>
  `;
}



// Роут для проверки, что сервер жив
app.get("/ping", (req, res) => {
  res.send("Alive!");
});

app.listen(3000, () => console.log('Server started on port 3000'));
