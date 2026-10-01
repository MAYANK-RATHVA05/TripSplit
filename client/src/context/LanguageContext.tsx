import React, { createContext, useContext, useEffect, useState } from "react";

const messages = {
  currencies: ["currencies supported", "मुद्राएँ उपलब्ध", "ચલણ ઉપલબ્ધ"],
  stepsEyebrow: [
    "Less admin. More adventure.",
    "कम हिसाब। ज़्यादा सफ़र।",
    "ઓછો હિસાબ. વધુ પ્રવાસ.",
  ],
  tools: ["TripSplit tools", "TripSplit टूल्स", "TripSplit સાધનો"],
  tripName: ["Trip name", "यात्रा का नाम", "પ્રવાસનું નામ"],
  tripExample: [
    "e.g. Goa weekend",
    "जैसे, गोवा वीकेंड",
    "જેમ કે, ગોવા વીકએન્ડ",
  ],
  description: [
    "Description (optional)",
    "विवरण (वैकल्पिक)",
    "વિગત (વૈકલ્પિક)",
  ],
  tripCurrency: ["Trip currency", "यात्रा की मुद्रा", "પ્રવાસનું ચલણ"],
  currencyHint: [
    "Balances and repayments use this currency. Choose before adding expenses; it cannot be changed afterwards.",
    "हिसाब और भुगतान इसी मुद्रा में होंगे। खर्च जोड़ने के बाद इसे बदल नहीं सकते।",
    "હિસાબ અને ચુકવણી આ ચલણમાં રહેશે. ખર્ચ ઉમેર્યા પછી તેને બદલી શકાતું નથી.",
  ],
  startDate: [
    "Start date (optional)",
    "शुरू होने की तारीख (वैकल्पिक)",
    "શરૂઆતની તારીખ (વૈકલ્પિક)",
  ],
  endDate: [
    "End date (optional)",
    "ख़त्म होने की तारीख (वैकल्पिक)",
    "અંતની તારીખ (વૈકલ્પિક)",
  ],
  cancel: ["Cancel", "रद्द करें", "રદ કરો"],
  nameRequired: [
    "Give your trip a name to get started.",
    "शुरू करने के लिए यात्रा का नाम दें।",
    "શરૂ કરવા પ્રવાસનું નામ આપો.",
  ],
  dateError: [
    "The end date must be on or after the start date.",
    "अंत की तारीख शुरुआत से पहले नहीं हो सकती।",
    "અંતની તારીખ શરૂઆતથી પહેલાં ન હોઈ શકે.",
  ],
  createError: [
    "We couldn’t create the trip. Please try again.",
    "यात्रा नहीं बन सकी। फिर कोशिश करें।",
    "પ્રવાસ બનાવી ન શકાયો. ફરી પ્રયાસ કરો.",
  ],
  setup: [
    "Make this trip yours",
    "यात्रा की तैयारी करें",
    "પ્રવાસની તૈયારી કરો",
  ],
  setupBody: [
    "Start with your people, then add your first shared expense. Your charts and balances will fill in automatically.",
    "पहले दोस्तों को जोड़ें, फिर पहला साझा खर्च। चार्ट और हिसाब अपने आप दिखने लगेंगे।",
    "પહેલા મિત્રો ઉમેરો, પછી પહેલો સહિયારો ખર્ચ. ચાર્ટ અને હિસાબ આપોઆપ દેખાશે.",
  ],
  addFriends: ["Add your friends", "दोस्त जोड़ें", "મિત્રો ઉમેરો"],
  home: [
    "Your travel, together.",
    "आपकी यात्रा, साथ मिलकर।",
    "તમારો પ્રવાસ, સાથે મળીને.",
  ],
  headline: [
    "Make memories.\nSplit the rest.",
    "यादें बनाइए।\nखर्च बाँटिए।",
    "યાદો બનાવો.\nખર્ચ વહેંચો.",
  ],
  intro: [
    "One place for shared expenses, clear balances, and your next adventure. Less money talk. More good times.",
    "साझा खर्च और साफ़ हिसाब, एक ही जगह। पैसों की चिंता कम, साथ में मज़े ज़्यादा।",
    "સહિયારો ખર્ચ અને સ્પષ્ટ હિસાબ, એક જ જગ્યાએ. પૈસાની ચિંતા ઓછી, આનંદ વધુ.",
  ],
  start: [
    "Plan your first trip",
    "पहली यात्रा शुरू करें",
    "પહેલો પ્રવાસ શરૂ કરો",
  ],
  signIn: ["Sign in", "साइन इन", "સાઇન ઇન"],
  register: ["Create account", "खाता बनाएँ", "ખાતું બનાવો"],
  how: ["How it works", "कैसे काम करता है", "કેવી રીતે કામ કરે છે"],
  step1: ["Bring your people", "दोस्तों को जोड़ें", "મિત્રોને જોડો"],
  step1body: [
    "Create a trip and add friends. Guests can join without an account.",
    "यात्रा बनाएँ और दोस्तों को जोड़ें। मेहमानों के लिए खाता ज़रूरी नहीं।",
    "પ્રવાસ બનાવો અને મિત્રો ઉમેરો. મહેમાનોને ખાતાની જરૂર નથી.",
  ],
  step2: [
    "Add it. Split it.",
    "खर्च जोड़ें और बाँटें",
    "ખર્ચ ઉમેરો અને વહેંચો",
  ],
  step2body: [
    "Log a meal, a stay, or a ride. Split equally or choose custom shares.",
    "खाना, होटल या सफ़र का खर्च जोड़ें। बराबर या अपने हिसाब से बाँटें।",
    "ભોજન, હોટલ કે મુસાફરીનો ખર્ચ ઉમેરો. સરખા કે પસંદ કરેલા ભાગ પાડો.",
  ],
  step3: [
    "Head home, settled",
    "हिसाब साफ़ करके लौटें",
    "હિસાબ પૂરો કરીને ઘરે જાઓ",
  ],
  step3body: [
    "See who owes whom and record repayments in one place.",
    "देखें किसे कितना देना है और भुगतान दर्ज करें।",
    "કોણે કોને કેટલું આપવાનું છે તે જુઓ અને ચુકવણી નોંધો.",
  ],
  calculator: ["Quick split", "तुरंत खर्च बाँटें", "ઝડપી ભાગ પાડો"],
  calcIntro: [
    "Dinner, a taxi, or a whole weekend. Try an equal split before creating a trip.",
    "खाना, टैक्सी या पूरा वीकेंड। यात्रा बनाने से पहले बराबर हिस्से देखें।",
    "ભોજન, ટેક્સી કે આખું વીકએન્ડ. પ્રવાસ બનાવતા પહેલાં સરખા ભાગ જુઓ.",
  ],
  amount: ["Total amount", "कुल राशि", "કુલ રકમ"],
  people: ["People", "लोग", "લોકો"],
  currency: ["Currency", "मुद्रा", "ચલણ"],
  each: ["per person", "प्रति व्यक्ति", "વ્યક્તિ દીઠ"],
  remainder: [
    "Rounding: {count} people pay {amount}; the rest pay the amount above.",
    "पूर्णांकन: {count} लोग {amount} दें; बाकी ऊपर की राशि दें।",
    "રાઉન્ડિંગ: {count} લોકો {amount} આપે; બાકીના ઉપરની રકમ આપે.",
  ],
  invalid: [
    "Enter a valid amount and 1–100 people. Use the currency’s decimal precision.",
    "सही राशि और 1–100 लोग दर्ज करें। मुद्रा के अनुसार दशमलव रखें।",
    "માન્ય રકમ અને 1–100 લોકો દાખલ કરો. ચલણ મુજબ દશાંશ રાખો.",
  ],
  notSaved: [
    "A quick estimate only. Nothing is saved to your trips.",
    "यह केवल अनुमान है। यात्रा में कुछ सेव नहीं होगा।",
    "આ માત્ર અંદાજ છે. પ્રવાસમાં કંઈ સાચવાશે નહીં.",
  ],
  welcome: [
    "Welcome back, {name}",
    "वापस स्वागत है, {name}",
    "ફરી સ્વાગત છે, {name}",
  ],
  dashboardIntro: [
    "Good trips start with a clear plan. Keep the shared costs here.",
    "अच्छी यात्रा की शुरुआत साफ़ योजना से होती है। साझा खर्च यहाँ रखें।",
    "સારા પ્રવાસની શરૂઆત સ્પષ્ટ યોજનાથી થાય છે. સહિયારો ખર્ચ અહીં રાખો.",
  ],
  trips: ["Your trips", "आपकी यात्राएँ", "તમારા પ્રવાસ"],
  newTrip: ["Create a trip", "यात्रा बनाएँ", "પ્રવાસ બનાવો"],
  search: ["Search trips", "यात्राएँ खोजें", "પ્રવાસ શોધો"],
  noResults: [
    "No matching trips",
    "कोई यात्रा नहीं मिली",
    "કોઈ પ્રવાસ મળ્યો નહીં",
  ],
  clear: ["Clear search", "खोज हटाएँ", "શોધ સાફ કરો"],
  empty: [
    "Your next adventure starts here",
    "अगली यात्रा यहाँ से शुरू होती है",
    "આગળનો પ્રવાસ અહીંથી શરૂ થાય છે",
  ],
  emptyBody: [
    "Create a trip, invite your people, and give every shared expense a home.",
    "यात्रा बनाएँ, दोस्तों को बुलाएँ और सभी साझा खर्च एक जगह रखें।",
    "પ્રવાસ બનાવો, મિત્રો બોલાવો અને સહિયારો ખર્ચ એક જગ્યાએ રાખો.",
  ],
  overview: ["Overview", "सारांश", "સારાંશ"],
  expenses: ["Expenses", "खर्च", "ખર્ચ"],
  balances: ["Balances", "हिसाब", "હિસાબ"],
  members: ["Members", "सदस्य", "સભ્યો"],
  activity: ["Activity", "गतिविधि", "પ્રવૃત્તિ"],
  addExpense: ["Add expense", "खर्च जोड़ें", "ખર્ચ ઉમેરો"],
  logout: ["Sign out", "साइन आउट", "સાઇન આઉટ"],
  loading: ["Loading…", "लोड हो रहा है…", "લોડ થઈ રહ્યું છે…"],
  retry: ["Try again", "फिर कोशिश करें", "ફરી પ્રયાસ કરો"],
  loadError: [
    "We couldn’t load your trips. Please try again.",
    "यात्राएँ लोड नहीं हो सकीं। फिर कोशिश करें।",
    "પ્રવાસ લોડ ન થયા. ફરી પ્રયાસ કરો.",
  ],
  detailError: [
    "We couldn’t load this trip. Please try again.",
    "यह यात्रा लोड नहीं हो सकी। फिर कोशिश करें।",
    "આ પ્રવાસ લોડ ન થયો. ફરી પ્રયાસ કરો.",
  ],
  tip: ["A little travel wisdom", "यात्रा की छोटी सलाह", "પ્રવાસની નાની સલાહ"],
  tipBody: [
    "Add expenses as you go, while the details are fresh. Keep receipts and agree on the trip currency before your first payment.",
    "खर्च तुरंत जोड़ें, रसीदें रखें और पहले भुगतान से पहले यात्रा की मुद्रा तय करें।",
    "ખર્ચ તરત ઉમેરો, રસીદો રાખો અને પહેલા ચુકવણા પહેલાં પ્રવાસનું ચલણ નક્કી કરો.",
  ],
  faq: ["A few things worth knowing", "कुछ उपयोगी बातें", "થોડી ઉપયોગી વાતો"],
  faq1: [
    "Do all my friends need an account?",
    "क्या सभी दोस्तों को खाता चाहिए?",
    "શું બધા મિત્રોને ખાતું જોઈએ?",
  ],
  faq1body: [
    "No. Add friends as guests, then invite them to claim their membership when they’re ready.",
    "नहीं। दोस्तों को मेहमान के रूप में जोड़ें। वे बाद में निमंत्रण से सदस्यता ले सकते हैं।",
    "ના. મિત્રોને મહેમાન તરીકે ઉમેરો. પછી આમંત્રણથી તેઓ સભ્ય બની શકે છે.",
  ],
  faq2: [
    "Can we spend in different currencies?",
    "क्या अलग-अलग मुद्राओं में खर्च कर सकते हैं?",
    "શું અલગ ચલણમાં ખર્ચ કરી શકાય?",
  ],
  faq2body: [
    "Yes. Choose a trip currency for balances. Expenses in other currencies use a saved conversion rate.",
    "हाँ। हिसाब के लिए यात्रा की मुद्रा चुनें। दूसरी मुद्राओं के खर्च में सेव की गई विनिमय दर लगेगी।",
    "હા. હિસાબ માટે પ્રવાસનું ચલણ પસંદ કરો. બીજા ચલણના ખર્ચ માટે સાચવેલો વિનિમય દર વપરાય છે.",
  ],
  faq3: [
    "Does TripSplit transfer money?",
    "क्या TripSplit पैसे भेजता है?",
    "શું TripSplit પૈસા મોકલે છે?",
  ],
  faq3body: [
    "No. Pay your friend using your usual payment method, then record the repayment so everyone can see the updated balance.",
    "नहीं। अपने सामान्य तरीके से भुगतान करें, फिर यहाँ दर्ज करें ताकि हिसाब अपडेट हो।",
    "ના. તમારી સામાન્ય રીતથી ચુકવણી કરો, પછી અહીં નોંધો જેથી હિસાબ બદલાય.",
  ],
  name: ["Full name", "पूरा नाम", "પૂરું નામ"],
  email: ["Email address", "ईमेल पता", "ઇમેઇલ સરનામું"],
  password: ["Password", "पासवर्ड", "પાસવર્ડ"],
  passwordHint: [
    "At least 6 characters",
    "कम से कम 6 अक्षर",
    "ઓછામાં ઓછા 6 અક્ષર",
  ],
  showPassword: ["Show password", "पासवर्ड दिखाएँ", "પાસવર્ડ બતાવો"],
  hidePassword: ["Hide password", "पासवर्ड छिपाएँ", "પાસવર્ડ છુપાવો"],
  close: ["Close", "बंद करें", "બંધ કરો"],
  languageNote: [
    "Home and navigation are translated. Detailed expense tools are currently in English.",
    "होम और नेविगेशन अनुवादित हैं। विस्तृत खर्च के टूल अभी अंग्रेज़ी में हैं।",
    "હોમ અને નેવિગેશન અનુવાદિત છે. વિગતવાર ખર્ચનાં સાધનો હાલમાં અંગ્રેજીમાં છે.",
  ],
} as const;
type Key = keyof typeof messages;
type Language = "en" | "hi" | "gu";
const indices = { en: 0, hi: 1, gu: 2 } as const;
const Context = createContext<{
  language: Language;
  setLanguage: (value: Language) => void;
  t: (key: Key, values?: Record<string, string | number>) => string;
} | null>(null);
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("tripsplit-language");
      return saved === "hi" || saved === "gu" ? saved : "en";
    } catch {
      return "en";
    }
  });
  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem("tripsplit-language", language);
    } catch {}
  }, [language]);
  const t = (key: Key, values: Record<string, string | number> = {}) =>
    Object.entries(values).reduce<string>(
      (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
      messages[key][indices[language]],
    );
  return (
    <Context.Provider value={{ language, setLanguage, t }}>
      {children}
    </Context.Provider>
  );
}
export function useLanguage() {
  const value = useContext(Context);
  if (!value) throw new Error("LanguageProvider is required");
  return value;
}
export function LanguageSelect() {
  const { language, setLanguage } = useLanguage();
  return (
    <select
      className="language-select"
      aria-label="Language / भाषा / ભાષા"
      value={language}
      onChange={(e) => setLanguage(e.target.value as Language)}
    >
      <option value="en">English</option>
      <option value="hi">हिन्दी</option>
      <option value="gu">ગુજરાતી</option>
    </select>
  );
}
