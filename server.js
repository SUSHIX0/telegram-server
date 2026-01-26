// server.js
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

let orderNumber = Number(process.env.ORDER_NUMBER || 0);

app.post('/order', async (req, res) => {
    try {
        orderNumber++;

        const orderNumberStr = orderNumber.toString().padStart(3, '0');
        const order = req.body;
        const now = new Date();
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
order.cart.forEach(item => {
    const lineTotal = item.unitPrice * item.qty;
    subtotal += lineTotal;
    orderText += `- ${item.name} x${item.qty} = ${lineTotal.toFixed(2)} €\n`;
});

// ===== Подытог, доставка, скидка =====
orderText += `\nПодытог: ${subtotal.toFixed(2)} €\n`;
orderText += `Доставка: ${order.delivery.toFixed(2)} €\n`;

// всегда показываем скидку как положительное число
const discount = Math.abs(order.discount || 0);
orderText += `Скидка: ${discount.toFixed(2)} €\n\n`;

// ===== Итог (вычитаем скидку) =====
const total = subtotal - discount + order.delivery;
orderText += `Итог: ${total.toFixed(2)} €`;



        const token = process.env.TELEGRAM_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: orderText })
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: err.message });
    }
});

// Роут для проверки, что сервер жив
app.get("/ping", (req, res) => {
  res.send("Alive!");
});

app.listen(3000, () => console.log('Server started on port 3000'));
