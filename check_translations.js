const { translations } = require('./utils/i18n/translations');
const enKeys = Object.keys(translations.en);
const zhKeys = Object.keys(translations.zh);
console.log('EN keys:', enKeys.length);
console.log('ZH keys:', zhKeys.length);
const missingInZh = enKeys.filter(k => !zhKeys.includes(k));
const missingInEn = zhKeys.filter(k => !enKeys.includes(k));
console.log('Missing in ZH:', missingInZh);
console.log('Missing in EN:', missingInEn);
