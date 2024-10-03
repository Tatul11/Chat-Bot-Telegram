import dotenv from "dotenv";
import TelegramBot, { CallbackQuery, Message } from "node-telegram-bot-api";
dotenv.config();

const tokenn: string | undefined = process.env.TELEGRAM_TOKEN as string;

if (!process.env.TELEGRAM_TOKEN) {
  console.error("Telegram Bot Token not provided!");
  process.exit(1); // Exit the process if the token is missing
}

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

let awaitingCurrency: boolean = false;
let awaitingButton: boolean = false;
let awaitingNameMessage: boolean = false;

console.log("Bot has been started");

const userStates: { [key: number]: boolean } = {};

bot.onText(/\/start/, (msg: any) => {
  console.log(1, msg);
  console.log(msg);

  const { chat, from } = msg;

  // Reset the user state when they start
  if (from && from.id) {
    userStates[from.id] = false; // Reset to indicate a fresh start
  }

  bot.sendMessage(
    chat.id,
    "Добрый день! Нажмите на своё имя или напишите его.",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: from?.first_name,
              callback_data: from?.first_name,
            },
          ],
        ],
      },
    }
  );
});

bot.on("message", async (msg: Message) => {
  const { chat, text, from } = msg;

  // Check if from and from.id are defined
  if (from && from.id) {
    // Initialize user state if not present
    if (!userStates[from.id] && !msg.text?.startsWith("/")) {
      // Use from.id here
      userStates[from.id] = true; // Mark the user as having interacted once
      bot.sendMessage(
        chat.id,
        `Рад знакомству, ${text}! Какую валюту вы хотите обменять? Напишите её код (например: USD или EUR).`
      );
    } else if (text?.length === 3 && /^[A-Z]{3}$/.test(text.toUpperCase())) {
      const currencyCode = text.toUpperCase();
      try {
        const response = await fetch(
          ` https://v6.exchangerate-api.com/v6/f0a268a67ada5d2398cbba8d/latest/${currencyCode}`
        );
        const data: any = await response.json();

        if (!data || !data.conversion_rates.RUB) {
          throw new Error(`Курс для ${currencyCode} недоступен`);
        }

        bot.sendMessage(
          chat.id,
          `Курс ${currencyCode}/RUB сегодня составляет: ${data.conversion_rates.RUB}`
        );
      } catch (error) {
        console.error(`Ошибка получения курса для ${currencyCode}:`, error);
        bot.sendMessage(
          chat.id,
          `Произошла ошибка при получении курса для валюты ${currencyCode}.`
        );
      }
    } else if (text && !msg.text?.startsWith("/")) {
      // If they are sending their name or another message after the first time
      bot.sendMessage(
        chat.id,
        "вы уже сказали ваше имя!,Напишите код валюты(например: USD или EUR)!"
      );
    } else if (
      !awaitingNameMessage &&
      !awaitingCurrency &&
      !msg.text?.startsWith("/")
    ) {
      bot.sendMessage(
        chat.id,
        "Пожалуйста, введите правильный код валюты (например: USD, EUR)."
      );
    }
  } else {
    // Optionally handle cases where 'from' is undefined
    console.error("User information is undefined");
    bot.sendMessage(chat.id, "Произошла ошибка. Попробуйте снова.");
  }

  awaitingButton = false;
});

bot.on("callback_query", (query: CallbackQuery) => {
  const { data, message, from } = query;
  const chatId = message?.chat.id!;

  // Check if from and from.id are defined
  if (from && from.id) {
    // Initialize user state if not present
    if (!userStates[from.id]) {
      userStates[from.id] = true; // Mark the user as having interacted once
      bot.answerCallbackQuery(query.id, { text: `Привет, ${data}!` });
      bot.sendMessage(
        chatId,
        `Рад знакомству, ${data}! Какую валюту вы хотите обменять? Напишите её код (например: USD или EUR).`
      );
      awaitingButton = true;
    } else if (!awaitingButton && !awaitingNameMessage && data) {
      bot.answerCallbackQuery(query.id, { text: `Привет, ${data}!` });
      bot.sendMessage(
        chatId,
        "вы уже сказали ваше имя!,Напишите код валюты(например: USD или EUR)!"
      );
      awaitingButton = true;
    }
  }
});
