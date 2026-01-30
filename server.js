// server.js
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import nodemailer from 'nodemailer';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

let orderNumber = Number(process.env.ORDER_NUMBER || 0);

// ===== Mail transporter =====
const mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false // фикс self-signed certificate
    }
});

// проверка транспортера при старте
mailTransporter.verify(err => {
    if (err) {
        console.error('Mail transporter verification failed:', err);
    } else {
        console.log('Mail transporter verified and ready');
    }
});

// ===== Order endpoint =====
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

        if (!Array.isArray(order.cart)) throw new Error('order.cart отсутствует или не массив');

        order.cart.forEach(item => {
            const lineTotal = item.unitPrice * item.qty;
            subtotal += lineTotal;
            orderText += `- ${item.name} x${item.qty} = ${lineTotal.toFixed(2)} €\n`;
        });

        // ===== Итоги =====
        orderText += `\nПодытог: ${subtotal.toFixed(2)} €\n`;
        orderText += `Доставка: ${order.delivery.toFixed(2)} €\n`;

        const discount = Math.abs(order.discount || 0);
        orderText += `Скидка: ${discount.toFixed(2)} €\n\n`;

        const total = subtotal - discount + order.delivery;
        orderText += `Итог: ${total.toFixed(2)} €`;

        // ===== Telegram =====
        try {
            await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: process.env.TELEGRAM_CHAT_ID,
                    text: orderText
                })
            });
            console.log('Telegram message sent');
        } catch (tgErr) {
            console.error('Telegram error:', tgErr);
        }

        // ===== Email =====
        try {
            const recipients = [process.env.ORDER_NOTIFY_EMAIL, order.checkout.email].filter(Boolean);
            console.log('Sending email to:', recipients);

            await mailTransporter.sendMail({
                from: process.env.GMAIL_USER,
                to: recipients,
                subject: `Новый заказ № ${orderNumberStr}`,
                text: orderText
            });

            console.log('Email sent successfully');
        } catch (emailErr) {
            console.error('Email sending error:', emailErr);
        }

        res.json({ success: true });

    } catch (err) {
        console.error('Order processing error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== Health check =====
app.get('/ping', (req, res) => res.send('Alive!'));

app.listen(3000, () => console.log('Server started on port 3000'));
