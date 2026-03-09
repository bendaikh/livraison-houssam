export const MOROCCAN_BANKS = [
    { name: 'Attijariwafa Bank', logo: '/banks/attijariwafa-bank.png' },
    { name: 'Banque Populaire', logo: '/banks/banque-populaire.png' },
    { name: 'Bank of Africa', logo: '/banks/bank-of-africa.png' },
    { name: 'CIH Bank', logo: '/banks/cih-bank.png' },
    { name: 'Crédit du Maroc', logo: '/banks/credit-du-maroc.png' },
    { name: 'BMCI', logo: '/banks/bmci.png' },
    { name: 'Al Barid Bank', logo: '/banks/al-barid-bank.png' },
    { name: 'Crédit Agricole du Maroc', logo: '/banks/credit-agricole-du-maroc.png' },
    { name: 'CFG Bank', logo: '/banks/cfg-bank.png' },
    { name: 'Arab Bank Maroc', logo: '/banks/arab-bank-maroc.png' },
    { name: 'Bank Assafa', logo: '/banks/bank-assafa.png' },
    { name: 'Umnia Bank', logo: '/banks/umnia-bank.png' },
    { name: 'BTI Bank', logo: '/banks/bti-bank.png' },
    { name: 'Bank Al Yousr', logo: '/banks/bank-al-yousr.png' },
    { name: 'Dar Al Amane', logo: '/banks/dar-al-amane.png' },
    { name: 'Al Akhdar Bank', logo: '/banks/al-akhdar-bank.png' },
];

export const getBankLogoByName = (bankName) => {
    return MOROCCAN_BANKS.find((bank) => bank.name === bankName)?.logo || null;
};
